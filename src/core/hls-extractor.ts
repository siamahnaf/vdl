/**
 * HLS/m3u8 extractor for sites that yt-dlp doesn't support.
 * Uses Playwright to intercept network requests and find m3u8 URLs.
 *
 * Playwright is an OPTIONAL dependency — only needed for unsupported sites.
 * Users will be prompted to install it on first use.
 */

async function loadPlaywright(): Promise<any | null> {
  try {
    // Dynamic import — will fail if playwright is not installed
    return await (Function('return import("playwright")')() as Promise<any>);
  } catch {
    return null;
  }
}

export async function extractM3u8Url(pageUrl: string, timeoutMs: number = 30000): Promise<string | null> {
  const playwright = await loadPlaywright();
  if (!playwright) return null;

  const browser = await playwright.chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    let m3u8Url: string | null = null;

    // Intercept network requests to find m3u8 URLs
    page.on('response', (response: any) => {
      const url: string = response.url();
      if (url.includes('.m3u8') && !m3u8Url) {
        m3u8Url = url;
      }
    });

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

    // Wait for m3u8 URL to be found or timeout
    const startTime = Date.now();
    while (!m3u8Url && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return m3u8Url;
  } finally {
    await browser.close();
  }
}

export async function isPlaywrightAvailable(): Promise<boolean> {
  const pw = await loadPlaywright();
  return pw !== null;
}
