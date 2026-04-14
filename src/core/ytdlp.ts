import { execa, type ResultPromise } from 'execa';
import { dirname } from 'path';
import ffmpegStatic from 'ffmpeg-static';
import type { VideoFormat, VideoInfo } from '../types/video.js';
import { formatBytes } from '../utils/format-bytes.js';

const FFMPEG_DIR = dirname(ffmpegStatic as string);

interface YtdlpFormat {
  format_id: string;
  ext: string;
  width?: number;
  height?: number;
  filesize?: number;
  filesize_approx?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  resolution?: string;
  format_note?: string;
  abr?: number;
}

interface YtdlpInfo {
  title: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  webpage_url: string;
  formats: YtdlpFormat[];
}

function buildLabel(f: VideoFormat): string {
  const size = f.filesize ? ` ~ ${formatBytes(f.filesize)}` : '';
  if (!f.hasVideo && f.hasAudio) {
    const bitrateStr = f.abr ? ` ${Math.round(f.abr)}kbps` : '';
    return `Audio only (${f.extension}${bitrateStr})${size}`;
  }
  return `${f.resolution} (${f.extension})${size}`;
}

function parseFormat(f: YtdlpFormat): VideoFormat {
  const hasVideo = f.vcodec !== undefined && f.vcodec !== 'none';
  const hasAudio = f.acodec !== undefined && f.acodec !== 'none';
  const height = f.height ?? 0;
  const resolution = height > 0 ? `${height}p` : (f.resolution ?? 'unknown');

  const fmt: VideoFormat = {
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

// H.264 (avc1/avc) is universally supported by iOS/macOS.
// AV1 (av01) and VP9 (vp09) inside mp4 are NOT supported by iOS Photos.
function isH264(vcodec: string): boolean {
  return vcodec.startsWith('avc') || vcodec === 'h264';
}

function deduplicateFormats(formats: VideoFormat[]): VideoFormat[] {
  const seen = new Map<string, VideoFormat>();

  for (const f of formats) {
    // Audio-only formats: include extension + bitrate in key to preserve all quality levels
    const key = (!f.hasVideo && f.hasAudio)
      ? `audio-${f.extension}-${Math.round(f.abr ?? 0)}`
      : `${f.resolution}-${f.hasVideo}-${f.hasAudio}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, f);
    } else {
      // H.264 wins over AV1/VP9 regardless of file size — iOS/macOS compatibility
      const preferH264 = isH264(f.vcodec) && !isH264(existing.vcodec);
      // Within the same codec family, prefer mp4 container then larger file
      const sameFamily = isH264(f.vcodec) === isH264(existing.vcodec);
      const preferMp4 = sameFamily && f.extension === 'mp4' && existing.extension !== 'mp4';
      const largerFile = sameFamily && !!(f.filesize && existing.filesize && f.filesize > existing.filesize);
      if (preferH264 || preferMp4 || largerFile) {
        seen.set(key, f);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Check if a URL contains a playlist.
 */
export function isPlaylistUrl(url: string): boolean {
  return url.includes('list=') || url.includes('/playlist');
}

export async function getVideoInfo(url: string, noPlaylist: boolean = true): Promise<VideoInfo> {
  const args = [
    '-j', '--no-download',
    '--ffmpeg-location', FFMPEG_DIR,
  ];
  if (noPlaylist) args.push('--no-playlist');
  args.push(url);

  const { stdout } = await execa('yt-dlp', args);
  const info: YtdlpInfo = JSON.parse(stdout);

  const allFormats = info.formats
    .filter((f) => f.ext !== 'mhtml')  // Exclude storyboard/thumbnail formats
    .map(parseFormat);

  const videoFormats = deduplicateFormats(
    allFormats.filter((f) => f.hasVideo)
  ).sort((a, b) => b.height - a.height);

  const audioFormats = deduplicateFormats(
    allFormats.filter((f) => f.hasAudio && !f.hasVideo)
  );

  return {
    title: info.title,
    duration: info.duration ?? null,
    thumbnail: info.thumbnail ?? null,
    uploader: info.uploader ?? null,
    url: info.webpage_url,
    formats: [...videoFormats, ...audioFormats],
  };
}

export interface DownloadHandle {
  process: ResultPromise;
  cancel: () => void;
  outputPath?: string;
}

export function downloadVideo(
  url: string,
  format: VideoFormat,
  outputDir: string,
  noPlaylist: boolean = true,
  outputTemplate: string = '%(title)s.%(ext)s'
): DownloadHandle {
  const outputPath = `${outputDir}/${outputTemplate}`;

  // Always target H.264 for iOS/macOS Photos compatibility.
  // If the selected format is already H.264, use its ID directly.
  // If it's AV1/VP9 (common on Facebook/Instagram Reels), fall back to the best
  // H.264 stream at or below the requested resolution — even if that means a lower
  // resolution — because a working 720p beats a broken 1080p AV1 on iOS.
  const h = format.height > 0 ? format.height : 2160;
  // Two kinds of H.264 streams exist across platforms:
  //   1. Separate video-only track (YouTube DASH) → bestvideo[vcodec^=avc]
  //   2. Combined video+audio track (Facebook/Instagram) → best[vcodec^=avc]
  // We must try both or Facebook will fall through to the AV1 format.
  const h264Selector = [
    // Facebook/Instagram: combined H.264 streams labelled "hd"/"sd" — vcodec is "unknown"
    // in yt-dlp's format list so vcodec filters can't match them; use the IDs directly.
    'hd',
    'sd',
    // YouTube / generic DASH: separate H.264 video + AAC audio
    `bestvideo[vcodec^=avc][height<=${h}]+bestaudio[ext=m4a]`,
    `bestvideo[vcodec^=avc][height<=${h}]+bestaudio[acodec=aac]`,
    `bestvideo[vcodec^=avc][height<=${h}]+bestaudio`,
    // Other platforms with combined H.264 streams
    `best[vcodec^=avc][height<=${h}]`,
    `best[vcodec^=avc]`,
  ].join('/');
  const fallbackSelector = `${format.formatId}+bestaudio[ext=m4a]/${format.formatId}+bestaudio[acodec=aac]/${format.formatId}+bestaudio/best`;
  const formatStr = isH264(format.vcodec)
    ? fallbackSelector
    : `${h264Selector}/${fallbackSelector}`;

  const args = [
    '-f', formatStr,
    '--merge-output-format', 'mp4',
    '--ppa', 'Merger:-movflags +faststart',
    '--newline',
    '--ffmpeg-location', FFMPEG_DIR,
    '-o', outputPath,
    '--no-mtime',
  ];
  if (noPlaylist) args.push('--no-playlist');
  args.push(url);

  const proc = execa('yt-dlp', args);

  return {
    process: proc,
    cancel: () => proc.kill(),
  };
}

export function downloadAudio(
  url: string,
  formatId: string,
  outputDir: string,
  noPlaylist: boolean = true,
  outputTemplate: string = '%(title)s.%(ext)s'
): DownloadHandle {
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
  if (noPlaylist) args.push('--no-playlist');
  args.push(url);

  const proc = execa('yt-dlp', args);

  return {
    process: proc,
    cancel: () => proc.kill(),
  };
}

export async function isSupported(url: string): Promise<boolean> {
  try {
    await execa('yt-dlp', [
      '--dump-json', '--no-download',
      '--no-playlist',
      '--ffmpeg-location', FFMPEG_DIR,
      url,
    ], { timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}
