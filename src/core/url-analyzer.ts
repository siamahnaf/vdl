import type { UrlAnalysis } from '../types/video.js';
import { isSupported } from './ytdlp.js';
import { isBrowserAvailable } from './hls-extractor.js';

// These platforms are always handled by yt-dlp — never fall through to browser extraction
const YTDLP_DOMAINS = [
  'youtube.com', 'youtu.be',
  'facebook.com', 'fb.watch',
  'instagram.com',
  'tiktok.com',
  'twitter.com', 'x.com',
  'reddit.com',
  'vimeo.com',
  'twitch.tv',
  'dailymotion.com',
];

function isKnownYtdlpUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return YTDLP_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export async function analyzeUrl(url: string): Promise<UrlAnalysis> {
  // Direct m3u8 URL
  if (url.includes('.m3u8')) {
    return { type: 'direct-m3u8', url };
  }

  // Known platforms always use yt-dlp — skip the slow isSupported() check
  if (isKnownYtdlpUrl(url)) {
    return { type: 'ytdlp', url };
  }

  // Unknown platform — check if yt-dlp supports it
  const ytdlpSupported = await isSupported(url);
  if (ytdlpSupported) {
    return { type: 'ytdlp', url };
  }

  // If a Chromium browser is available, try extracting m3u8
  if (isBrowserAvailable()) {
    return { type: 'needs-extraction', url };
  }

  return { type: 'unknown', url };
}
