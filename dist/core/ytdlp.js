import { execa } from 'execa';
import { dirname } from 'path';
import ffmpegStatic from 'ffmpeg-static';
import { formatBytes } from '../utils/format-bytes.js';
const FFMPEG_DIR = dirname(ffmpegStatic);
function buildLabel(f) {
    const size = f.filesize ? ` ~ ${formatBytes(f.filesize)}` : '';
    if (!f.hasVideo && f.hasAudio) {
        const bitrateStr = f.abr ? ` ${Math.round(f.abr)}kbps` : '';
        return `Audio only (${f.extension}${bitrateStr})${size}`;
    }
    return `${f.resolution} (${f.extension})${size}`;
}
function parseFormat(f) {
    const hasVideo = f.vcodec !== undefined && f.vcodec !== 'none';
    const hasAudio = f.acodec !== undefined && f.acodec !== 'none';
    const height = f.height ?? 0;
    const resolution = height > 0 ? `${height}p` : (f.resolution ?? 'unknown');
    const fmt = {
        formatId: f.format_id,
        extension: f.ext,
        resolution,
        width: f.width ?? 0,
        height,
        filesize: f.filesize ?? f.filesize_approx ?? null,
        fps: f.fps ?? null,
        vcodec: f.vcodec ?? 'none',
        acodec: f.acodec ?? 'none',
        label: '',
        hasVideo,
        hasAudio,
        abr: f.abr ?? null,
    };
    fmt.label = buildLabel(fmt);
    return fmt;
}
function deduplicateFormats(formats) {
    const seen = new Map();
    for (const f of formats) {
        // Audio-only formats: include extension + bitrate in key to preserve all quality levels
        const key = (!f.hasVideo && f.hasAudio)
            ? `audio-${f.extension}-${Math.round(f.abr ?? 0)}`
            : `${f.resolution}-${f.hasVideo}-${f.hasAudio}`;
        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, f);
        }
        else {
            const preferMp4 = f.extension === 'mp4' && existing.extension !== 'mp4';
            const largerFile = f.filesize && existing.filesize && f.filesize > existing.filesize;
            if (preferMp4 || largerFile) {
                seen.set(key, f);
            }
        }
    }
    return Array.from(seen.values());
}
/**
 * Check if a URL contains a playlist.
 */
export function isPlaylistUrl(url) {
    return url.includes('list=') || url.includes('/playlist');
}
export async function getVideoInfo(url, noPlaylist = true) {
    const args = [
        '-j', '--no-download',
        '--ffmpeg-location', FFMPEG_DIR,
    ];
    if (noPlaylist)
        args.push('--no-playlist');
    args.push(url);
    const { stdout } = await execa('yt-dlp', args);
    const info = JSON.parse(stdout);
    const allFormats = info.formats
        .filter((f) => f.ext !== 'mhtml') // Exclude storyboard/thumbnail formats
        .map(parseFormat);
    const videoFormats = deduplicateFormats(allFormats.filter((f) => f.hasVideo)).sort((a, b) => b.height - a.height);
    const audioFormats = deduplicateFormats(allFormats.filter((f) => f.hasAudio && !f.hasVideo));
    return {
        title: info.title,
        duration: info.duration ?? null,
        thumbnail: info.thumbnail ?? null,
        uploader: info.uploader ?? null,
        url: info.webpage_url,
        formats: [...videoFormats, ...audioFormats],
    };
}
export function downloadVideo(url, formatId, outputDir, noPlaylist = true, outputTemplate = '%(title)s.%(ext)s') {
    const outputPath = `${outputDir}/${outputTemplate}`;
    const args = [
        // Prefer M4A (AAC) audio — Opus/webm inside mp4 is not supported by iOS/macOS Photos
        '-f', `${formatId}+bestaudio[ext=m4a]/${formatId}+bestaudio[acodec=aac]/${formatId}+bestaudio/best`,
        '--merge-output-format', 'mp4',
        // Place the moov atom at the start of the file so iOS/macOS can stream/identify it
        '--ppa', 'Merger:-movflags +faststart',
        '--newline',
        '--ffmpeg-location', FFMPEG_DIR,
        '-o', outputPath,
        '--no-mtime',
    ];
    if (noPlaylist)
        args.push('--no-playlist');
    args.push(url);
    const proc = execa('yt-dlp', args);
    return {
        process: proc,
        cancel: () => proc.kill(),
    };
}
export function downloadAudio(url, formatId, outputDir, noPlaylist = true, outputTemplate = '%(title)s.%(ext)s') {
    const outputPath = `${outputDir}/${outputTemplate}`;
    const args = [
        '-f', formatId,
        '-x',
        '--audio-format', 'mp3',
        '--newline',
        '--ffmpeg-location', FFMPEG_DIR,
        '-o', outputPath,
        '--no-mtime',
    ];
    if (noPlaylist)
        args.push('--no-playlist');
    args.push(url);
    const proc = execa('yt-dlp', args);
    return {
        process: proc,
        cancel: () => proc.kill(),
    };
}
export async function isSupported(url) {
    try {
        await execa('yt-dlp', [
            '--dump-json', '--no-download',
            '--no-playlist',
            '--ffmpeg-location', FFMPEG_DIR,
            url,
        ], { timeout: 30000 });
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=ytdlp.js.map