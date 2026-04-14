export interface ExtractedStream {
    url: string;
    headers: Record<string, string>;
}
/**
 * Extract m3u8/HLS URL from a page using Chrome DevTools Protocol.
 * Uses whatever Chromium-based browser is installed on the system.
 * Also captures request headers (cookies, referer) needed to access the stream.
 */
export declare function extractM3u8Url(pageUrl: string, timeoutMs?: number): Promise<ExtractedStream | null>;
export declare function isBrowserAvailable(): boolean;
export declare function getBrowserName(): string | null;
//# sourceMappingURL=hls-extractor.d.ts.map