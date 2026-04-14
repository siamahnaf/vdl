export function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}
/**
 * Parse a single line of yt-dlp progress output (with --newline flag).
 * Example lines:
 *   [download]  45.2% of ~120.50MiB at 5.23MiB/s ETA 00:12
 *   [download] 100% of 120.50MiB in 00:23
 *   [Merger] Merging formats into "video.mp4"
 */
export function parseYtdlpProgress(line) {
    // Match download progress line
    // Format: [download]   5.2% of ~ 300.00MiB at  5.23MiB/s ETA 00:12 (frag 3/64)
    const progressMatch = line.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+\S+)\s+at\s+([\d.]+\S+)\s+ETA\s+(\S+)/);
    if (progressMatch) {
        const eta = progressMatch[4];
        return {
            percent: parseFloat(progressMatch[1]),
            total: progressMatch[2],
            speed: progressMatch[3],
            eta: eta === 'Unknown' ? '' : eta,
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
    // Match fragment progress: [download] Got frag 45/200 or Downloading fragment 45 of 200
    const fragMatch = line.match(/(?:Got frag|Downloading fragment)\s+(\d+)\s+(?:\/|of)\s+(\d+)/);
    if (fragMatch) {
        const current = parseInt(fragMatch[1], 10);
        const total = parseInt(fragMatch[2], 10);
        const percent = total > 0 ? Math.round((current / total) * 100 * 10) / 10 : 0;
        return {
            percent,
            total: `${total} frags`,
            speed: '',
            eta: '',
            downloaded: `${current}/${total}`,
            status: 'downloading',
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
    if (timeMatch) {
        const currentSec = parseInt(timeMatch[1], 10) / 1_000_000;
        if (totalDurationSec > 0) {
            const percent = Math.min((currentSec / totalDurationSec) * 100, 100);
            return {
                percent: Math.round(percent * 10) / 10,
                speed: '',
                eta: '',
                downloaded: formatTime(currentSec),
                total: formatTime(totalDurationSec),
                status: percent >= 99.9 ? 'complete' : 'downloading',
            };
        }
        // No total duration known — show elapsed time, no percentage
        return {
            percent: -2, // signal: update downloaded time only
            speed: '',
            eta: '',
            downloaded: formatTime(currentSec),
            total: '',
            status: 'downloading',
        };
    }
    const speedMatch = line.match(/speed=\s*([\d.]+x)/);
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
    // Also match "frame=", "size=" lines from ffmpeg stderr for size info
    const sizeMatch = line.match(/size=\s*([\d.]+\S+)/);
    if (sizeMatch) {
        return {
            percent: -1,
            speed: '',
            eta: '',
            downloaded: '',
            total: sizeMatch[1],
            status: 'downloading',
        };
    }
    return null;
}
//# sourceMappingURL=progress-parser.js.map