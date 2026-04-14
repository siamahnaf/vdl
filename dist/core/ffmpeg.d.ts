import type { DownloadHandle } from './ytdlp.js';
export interface M3u8Quality {
    url: string;
    resolution: string;
    bandwidth: number;
    label: string;
}
/**
 * Parse an m3u8 master playlist to extract available qualities.
 */
export declare function parseMasterPlaylist(content: string, baseUrl: string): M3u8Quality[];
/**
 * Fetch and parse an m3u8 URL for available qualities.
 */
export declare function getM3u8Qualities(m3u8Url: string, headers?: Record<string, string>): Promise<M3u8Quality[]>;
/**
 * Download an m3u8 stream using yt-dlp with concurrent fragment downloading.
 */
export declare function downloadM3u8(m3u8Url: string, outputDir: string, filename: string, asAudio?: boolean, headers?: Record<string, string>): DownloadHandle;
/**
 * Get the duration of a media stream using ffprobe.
 */
export declare function getStreamDuration(url: string): Promise<number>;
//# sourceMappingURL=ffmpeg.d.ts.map