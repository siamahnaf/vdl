import { isSupported } from './ytdlp.js';
export async function analyzeUrl(url) {
    // Direct m3u8 URL
    if (url.includes('.m3u8')) {
        return { type: 'direct-m3u8', url };
    }
    // Try yt-dlp first
    const ytdlpSupported = await isSupported(url);
    if (ytdlpSupported) {
        return { type: 'ytdlp', url };
    }
    // For sites yt-dlp doesn't support, we'll need browser extraction
    return { type: 'needs-extraction', url };
}
//# sourceMappingURL=url-analyzer.js.map