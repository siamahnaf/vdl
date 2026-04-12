/**
 * HLS/m3u8 extractor for sites that yt-dlp doesn't support.
 * Uses Playwright to intercept network requests and find m3u8 URLs.
 *
 * Playwright is an OPTIONAL dependency — only needed for unsupported sites.
 * Users will be prompted to install it on first use.
 */
export declare function extractM3u8Url(pageUrl: string, timeoutMs?: number): Promise<string | null>;
export declare function isPlaywrightAvailable(): Promise<boolean>;
//# sourceMappingURL=hls-extractor.d.ts.map