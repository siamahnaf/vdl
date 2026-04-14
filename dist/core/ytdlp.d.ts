import { type ResultPromise } from 'execa';
import type { VideoInfo } from '../types/video.js';
/**
 * Check if a URL contains a playlist.
 */
export declare function isPlaylistUrl(url: string): boolean;
export declare function getVideoInfo(url: string, noPlaylist?: boolean): Promise<VideoInfo>;
export interface DownloadHandle {
    process: ResultPromise;
    cancel: () => void;
    outputPath?: string;
}
export declare function downloadVideo(url: string, formatId: string, outputDir: string, noPlaylist?: boolean, outputTemplate?: string): DownloadHandle;
export declare function downloadAudio(url: string, formatId: string, outputDir: string, noPlaylist?: boolean, outputTemplate?: string): DownloadHandle;
export declare function isSupported(url: string): Promise<boolean>;
//# sourceMappingURL=ytdlp.d.ts.map