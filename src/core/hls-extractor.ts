import { spawn, type ChildProcess } from 'child_process';
import WebSocket from 'ws';
import { findBrowser } from './browser-finder.js';

interface CDPTarget {
  webSocketDebuggerUrl: string;
}

export interface ExtractedStream {
  url: string;
  headers: Record<string, string>;
}

/**
 * Extract m3u8/HLS URL from a page using Chrome DevTools Protocol.
 * Uses whatever Chromium-based browser is installed on the system.
 * Also captures request headers (cookies, referer) needed to access the stream.
 */
export async function extractM3u8Url(
  pageUrl: string,
  timeoutMs: number = 30000
): Promise<ExtractedStream | null> {
  const browser = findBrowser();
  if (!browser) return null;

  const port = 9200 + Math.floor(Math.random() * 700);
  let proc: ChildProcess | null = null;

  try {
    proc = spawn(browser.path, [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-sync',
      '--mute-audio',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-web-security',
      '--user-data-dir=' + (process.env['TMPDIR'] ?? '/tmp') + '/vdl-cdp-' + Date.now(),
      'about:blank',
    ], {
      stdio: 'ignore',
      detached: false,
    });

    // Wait for CDP to be ready
    let wsUrl: string | null = null;
    const startTime = Date.now();

    while (!wsUrl && Date.now() - startTime < 10000) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        const targets = (await res.json()) as CDPTarget[];
        const target = targets.find((t) => t.webSocketDebuggerUrl);
        if (target) wsUrl = target.webSocketDebuggerUrl;
      } catch {
        // Browser not ready yet
      }
    }

    if (!wsUrl) return null;

    return await new Promise<ExtractedStream | null>((resolve) => {
      const ws = new WebSocket(wsUrl!);
      let result: ExtractedStream | null = null;
      let msgId = 1;

      const send = (method: string, params: Record<string, any> = {}) => {
        ws.send(JSON.stringify({ id: msgId++, method, params }));
      };

      const timer = setTimeout(() => {
        ws.close();
        resolve(null);
      }, timeoutMs);

      const found = (url: string, headers: Record<string, string>) => {
        if (!result) {
          result = { url, headers };
          clearTimeout(timer);
          ws.close();
          resolve(result);
        }
      };

      // JS snippet injected after page load to trigger video playback
      const autoPlayScript = `(function() {
        // Force play on any video elements
        document.querySelectorAll('video').forEach(function(v) {
          v.muted = true;
          try { v.play(); } catch(e) {}
        });
        // Click common play button selectors
        var sels = [
          '.vjs-big-play-button', '.jw-icon-display', '.plyr__control--overlaid',
          '[class*="play-btn"]', '[class*="playbtn"]', '[class*="play_btn"]',
          '[class*="PlayButton"]', '[class*="play-button"]', '[class*="btnPlay"]',
          '[id*="play"]', 'button[aria-label*="play" i]', '[data-role="play"]',
          '.play', '.play-icon', '.fas.fa-play', '.fa-play',
        ];
        sels.forEach(function(s) {
          document.querySelectorAll(s).forEach(function(el) {
            try { el.click(); } catch(e) {}
          });
        });
        // Scan page source for m3u8 URLs and return them
        var src = document.documentElement.innerHTML;
        var matches = src.match(/https?:[^"' \\\\]+\\.m3u8[^"' \\\\]*/g);
        return matches ? matches[0] : null;
      })()`;

      ws.on('open', () => {
        send('Target.setAutoAttach', {
          autoAttach: true,
          waitForDebuggerOnStart: false,
          flatten: true,
        });
        send('Network.enable');
        send('Page.enable');
        send('Runtime.enable');
        send('Page.navigate', { url: pageUrl });
      });

      // Store headers from requestWillBeSent keyed by URL
      const requestHeaders = new Map<string, Record<string, string>>();

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());

          // Enable network on any attached iframe target
          if (msg.method === 'Target.attachedToTarget') {
            const sid = msg.params?.sessionId;
            if (sid) {
              ws.send(JSON.stringify({ id: msgId++, method: 'Network.enable', params: {}, sessionId: sid }));
              ws.send(JSON.stringify({ id: msgId++, method: 'Page.enable', params: {}, sessionId: sid }));
            }
          }

          // After DOM is ready — click play buttons and scan DOM for m3u8 URLs
          if (msg.method === 'Page.domContentEventFired' || msg.method === 'Page.loadEventFired') {
            // Run in main frame AND any sub-session (iframe)
            const sid = msg.sessionId as string | undefined;
            ws.send(JSON.stringify({
              id: msgId++,
              method: 'Runtime.evaluate',
              params: { expression: autoPlayScript, awaitPromise: false, returnByValue: true },
              ...(sid ? { sessionId: sid } : {}),
            }));
          }

          // Capture result of Runtime.evaluate (DOM-embedded m3u8 URL)
          if (msg.result?.result?.value && typeof msg.result.result.value === 'string') {
            const embeddedUrl: string = msg.result.result.value;
            if (embeddedUrl.includes('.m3u8')) {
              found(embeddedUrl, {});
            }
          }

          // Capture headers from requests (requestWillBeSent has full headers)
          if (msg.method === 'Network.requestWillBeSent') {
            const reqUrl: string = msg.params?.request?.url ?? '';
            const headers: Record<string, string> = msg.params?.request?.headers ?? {};
            requestHeaders.set(reqUrl, headers);
            if (reqUrl.includes('.m3u8')) {
              found(reqUrl, headers);
            }
          }

          // Check response content-type for HLS streams (catches non-.m3u8 URLs)
          if (msg.method === 'Network.responseReceived') {
            const respUrl: string = msg.params?.response?.url ?? '';
            const contentType: string = (
              msg.params?.response?.headers?.['content-type'] ??
              msg.params?.response?.headers?.['Content-Type'] ??
              ''
            );
            const headers = requestHeaders.get(respUrl) ?? msg.params?.response?.requestHeaders ?? {};

            if (respUrl.includes('.m3u8')) {
              found(respUrl, headers);
            }
            if (
              contentType.includes('application/vnd.apple.mpegurl') ||
              contentType.includes('application/x-mpegurl')
            ) {
              found(respUrl, headers);
            }
          }
        } catch {
          // Ignore parse errors
        }
      });

      ws.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });

      ws.on('close', () => {
        clearTimeout(timer);
        if (!result) resolve(null);
      });
    });
  } finally {
    if (proc && !proc.killed) {
      proc.kill();
    }
  }
}

export function isBrowserAvailable(): boolean {
  return findBrowser() !== null;
}

export function getBrowserName(): string | null {
  const browser = findBrowser();
  return browser?.name ?? null;
}
