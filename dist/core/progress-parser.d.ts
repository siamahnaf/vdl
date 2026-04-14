import type { DownloadProgress } from '../types/video.js';
export declare function formatTime(seconds: number): string;
/**
 * Parse a single line of yt-dlp progress output (with --newline flag).
 * Example lines:
 *   [download]  45.2% of ~120.50MiB at 5.23MiB/s ETA 00:12
 *   [download] 100% of 120.50MiB in 00:23
 *   [Merger] Merging formats into "video.mp4"
 */
export declare function parseYtdlpProgress(line: string): DownloadProgress | null;
/**
 * Parse ffmpeg progress output (-progress pipe:1).
 * Outputs key=value pairs like:
 *   out_time_us=5000000
 *   speed=1.5x
 */
export declare function parseFfmpegProgress(line: string, totalDurationSec: number): DownloadProgress | null;
//# sourceMappingURL=progress-parser.d.ts.map