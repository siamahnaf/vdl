import { execa } from 'execa';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import ffmpegStatic from 'ffmpeg-static';
// Use the bundled ffmpeg binary from ffmpeg-static npm package
const FFMPEG = ffmpegStatic;
const FFMPEG_DIR = dirname(FFMPEG);
const FFPROBE = join(FFMPEG_DIR, 'ffprobe');
/**
 * Parse an m3u8 master playlist to extract available qualities.
 */
export function parseMasterPlaylist(content, baseUrl) {
    const lines = content.split('\n');
    const qualities = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            const bwMatch = line.match(/BANDWIDTH=(\d+)/);
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && !nextLine.startsWith('#')) {
                const streamUrl = nextLine.startsWith('http')
                    ? nextLine
                    : new URL(nextLine, baseUrl).toString();
                const resolution = resMatch ? resMatch[1] : 'unknown';
                const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
                const heightStr = resolution.split('x')[1] ?? '';
                const height = parseInt(heightStr, 10) || 0;
                qualities.push({
                    url: streamUrl,
                    resolution,
                    bandwidth,
                    label: height ? resolution : 'Unknown', // Show full resolution e.g. "1920×804"
                    height,
                });
            }
        }
    }
    return qualities.sort((a, b) => b.bandwidth - a.bandwidth);
}
/**
 * Fetch and parse an m3u8 URL for available qualities.
 */
export async function getM3u8Qualities(m3u8Url, headers = {}) {
    const response = await fetch(m3u8Url, { headers });
    const content = await response.text();
    // Check if it's a master playlist (has stream info)
    if (content.includes('#EXT-X-STREAM-INF:')) {
        const base = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
        return parseMasterPlaylist(content, base);
    }
    // It's a single-quality stream
    return [{
            url: m3u8Url,
            resolution: 'default',
            bandwidth: 0,
            label: 'Default quality',
            height: 0,
        }];
}
/**
 * Download an m3u8 stream using yt-dlp with concurrent fragment downloading.
 */
export function downloadM3u8(m3u8Url, outputDir, filename, asAudio = false, headers = {}) {
    const ext = asAudio ? 'mp3' : 'mp4';
    // Sanitize filename for the filesystem
    const safeFilename = filename.replace(/[/\\:*?"<>|]/g, '_');
    const outputPath = join(outputDir, `${safeFilename}.${ext}`);
    // Keep fragment temp files out of the user's download folder
    const fragTmpDir = join(tmpdir(), `vdl-${Date.now()}`);
    const args = [];
    // Pass captured browser headers to yt-dlp
    const headerEntries = Object.entries(headers).filter(([k]) => ['cookie', 'referer', 'origin', 'user-agent'].includes(k.toLowerCase()));
    for (const [k, v] of headerEntries) {
        args.push('--add-header', `${k}:${v}`);
    }
    args.push('--concurrent-fragments', '16', '--retries', '10', '--fragment-retries', '10', '--newline', '--ffmpeg-location', FFMPEG_DIR, '--no-playlist', '-P', `home:${outputDir}`, // Final file goes here
    '-P', `temp:${fragTmpDir}`, // Fragment temp files go here (kept out of downloads)
    '-o', `${safeFilename}.${ext}`, 
    // FixupM3u8 is the post-processor yt-dlp uses for single-stream HLS (not Merger).
    // _i = input args, regenerate PTS to fix timestamp gaps at segment boundaries.
    '--ppa', 'FixupM3u8_i:-fflags +genpts', '--ppa', 'FixupM3u8:-max_muxing_queue_size 9999 -movflags +faststart', 
    // Also cover the Merger PP in case yt-dlp uses it for separate audio tracks.
    '--ppa', 'Merger:-max_muxing_queue_size 9999 -movflags +faststart');
    if (asAudio) {
        args.push('-x', '--audio-format', 'mp3');
    }
    else {
        args.push('--merge-output-format', 'mp4');
    }
    args.push(m3u8Url);
    const proc = execa('yt-dlp', args);
    return {
        process: proc,
        cancel: () => proc.kill(),
        outputPath,
    };
}
/**
 * Get the duration of a media stream using ffprobe.
 */
export async function getStreamDuration(url) {
    try {
        const { stdout } = await execa(FFPROBE, [
            '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            url,
        ], { timeout: 30000 });
        return parseFloat(stdout.trim()) || 0;
    }
    catch {
        return 0;
    }
}
//# sourceMappingURL=ffmpeg.js.map