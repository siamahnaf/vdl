import { type ResultPromise } from 'execa';
import type { VideoInfo } from '../types/video.js';
export declare function getVideoInfo(url: string): Promise<VideoInfo>;
export interface DownloadHandle {
    process: ResultPromise;
    cancel: () => void;
}
export declare function downloadVideo(url: string, formatId: string, outputDir: string, outputTemplate?: string): DownloadHandle;
export declare function downloadAudio(url: string, formatId: string, outputDir: string, outputTemplate?: string): DownloadHandle;
export declare function isSupported(url: string): Promise<boolean>;
//# sourceMappingURL=ytdlp.d.ts.map