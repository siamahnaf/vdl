import type { UrlAnalysis } from '../types/video.js';
import { isSupported } from './ytdlp.js';
import { isBrowserAvailable } from './hls-extractor.js';

export async function analyzeUrl(url: string): Promise<UrlAnalysis> {
  // Direct m3u8 URL
  if (url.includes('.m3u8')) {
    return { type: 'direct-m3u8', url };
  }

  // Try yt-dlp
  const ytdlpSupported = await isSupported(url);
  if (ytdlpSupported) {
    return { type: 'ytdlp', url };
  }

  // If a Chromium browser is available, we can try extracting m3u8
  if (isBrowserAvailable()) {
    return { type: 'needs-extraction', url };
  }

  return { type: 'unknown', url };
}
