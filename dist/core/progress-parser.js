/**
 * Parse a single line of yt-dlp progress output (with --newline flag).
 * Example lines:
 *   [download]  45.2% of ~120.50MiB at 5.23MiB/s ETA 00:12
 *   [download] 100% of 120.50MiB in 00:23
 *   [Merger] Merging formats into "video.mp4"
 */
export function parseYtdlpProgress(line) {
    // Match download progress line
    const progressMatch = line.match(/\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\S+)\s+at\s+([\d.]+\S+)\s+ETA\s+(\S+)/);
    if (progressMatch) {
        return {
            percent: parseFloat(progressMatch[1]),
            total: progressMatch[2],
            speed: progressMatch[3],
            eta: progressMatch[4],
            downloaded: '',
            status: 'downloading',
        };
    }
    // Match completion line
    const completeMatch = line.match(/\[download\]\s+100%\s+of\s+~?([\d.]+\S+)/);
    if (completeMatch) {
        return {
            percent: 100,
            total: completeMatch[1],
            speed: '',
            eta: '00:00',
            downloaded: completeMatch[1],
            status: 'complete',
        };
    }
    // Match merging
    if (line.includes('[Merger]') || line.includes('Merging formats')) {
        return {
            percent: 100,
            total: '',
            speed: '',
            eta: '',
            downloaded: '',
            status: 'merging',
        };
    }
    // Match already downloaded
    if (line.includes('has already been downloaded')) {
        return {
            percent: 100,
            total: '',
            speed: '',
            eta: '',
            downloaded: '',
            status: 'complete',
        };
    }
    return null;
}
/**
 * Parse ffmpeg progress output (-progress pipe:1).
 * Outputs key=value pairs like:
 *   out_time_us=5000000
 *   speed=1.5x
 */
export function parseFfmpegProgress(line, totalDurationSec) {
    const timeMatch = line.match(/out_time_us=(\d+)/);
    if (timeMatch && totalDurationSec > 0) {
        const currentSec = parseInt(timeMatch[1], 10) / 1_000_000;
        const percent = Math.min((currentSec / totalDurationSec) * 100, 100);
        return {
            percent: Math.round(percent * 10) / 10,
            speed: '',
            eta: '',
            downloaded: '',
            total: '',
            status: percent >= 99.9 ? 'complete' : 'downloading',
        };
    }
    const speedMatch = line.match(/speed=([\d.]+x)/);
    if (speedMatch) {
        return {
            percent: -1, // signal to update speed only
            speed: speedMatch[1],
            eta: '',
            downloaded: '',
            total: '',
            status: 'downloading',
        };
    }
    return null;
}
//# sourceMappingURL=progress-parser.js.map