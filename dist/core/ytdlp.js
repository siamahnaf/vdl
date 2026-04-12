import { execa } from 'execa';
import { formatBytes } from '../utils/format-bytes.js';
function buildLabel(f) {
    const size = f.filesize ? ` ~ ${formatBytes(f.filesize)}` : '';
    if (!f.hasVideo && f.hasAudio) {
        return `Audio only (${f.extension})${size}`;
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
    };
    fmt.label = buildLabel(fmt);
    return fmt;
}
function deduplicateFormats(formats) {
    const seen = new Map();
    for (const f of formats) {
        const key = `${f.resolution}-${f.hasVideo}-${f.hasAudio}`;
        const existing = seen.get(key);
        if (!existing) {
            seen.set(key, f);
        }
        else {
            // Prefer mp4, then larger filesize
            const preferMp4 = f.extension === 'mp4' && existing.extension !== 'mp4';
            const largerFile = f.filesize && existing.filesize && f.filesize > existing.filesize;
            if (preferMp4 || largerFile) {
                seen.set(key, f);
            }
        }
    }
    return Array.from(seen.values());
}
export async function getVideoInfo(url) {
    const { stdout } = await execa('yt-dlp', ['-j', '--no-download', url]);
    const info = JSON.parse(stdout);
    const allFormats = info.formats.map(parseFormat);
    // Separate video+audio and audio-only
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
export function downloadVideo(url, formatId, outputDir, outputTemplate = '%(title)s.%(ext)s') {
    const outputPath = `${outputDir}/${outputTemplate}`;
    const proc = execa('yt-dlp', [
        '-f', formatId,
        '--newline',
        '-o', outputPath,
        '--no-mtime',
        url,
    ]);
    return {
        process: proc,
        cancel: () => proc.kill(),
    };
}
export function downloadAudio(url, formatId, outputDir, outputTemplate = '%(title)s.%(ext)s') {
    const outputPath = `${outputDir}/${outputTemplate}`;
    const proc = execa('yt-dlp', [
        '-f', formatId,
        '-x',
        '--audio-format', 'mp3',
        '--newline',
        '-o', outputPath,
        '--no-mtime',
        url,
    ]);
    return {
        process: proc,
        cancel: () => proc.kill(),
    };
}
export async function isSupported(url) {
    try {
        await execa('yt-dlp', ['--dump-json', '--no-download', url], { timeout: 15000 });
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=ytdlp.js.map