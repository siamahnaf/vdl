import { execa, type ResultPromise } from 'execa';
import { join, dirname } from 'path';
import ffmpegStatic from 'ffmpeg-static';
import type { DownloadHandle } from './ytdlp.js';

// Use the bundled ffmpeg binary from ffmpeg-static npm package
const FFMPEG = ffmpegStatic as string;
const FFPROBE = join(dirname(FFMPEG), 'ffprobe');

export interface M3u8Quality {
  url: string;
  resolution: string;
  bandwidth: number;
  label: string;
}

/**
 * Parse an m3u8 master playlist to extract available qualities.
 */
export function parseMasterPlaylist(content: string, baseUrl: string): M3u8Quality[] {
  const lines = content.split('\n');
  const qualities: M3u8Quality[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      const bwMatch = line.match(/BANDWIDTH=(\d+)/);

      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith('#')) {
        const streamUrl = nextLine.startsWith('http')
          ? nextLine
          : new URL(nextLine, baseUrl).toString();

        const resolution = resMatch ? resMatch[1]! : 'unknown';
        const bandwidth = bwMatch ? parseInt(bwMatch[1]!, 10) : 0;
        const height = resolution.split('x')[1] ?? '';

        qualities.push({
          url: streamUrl,
          resolution,
          bandwidth,
          label: height ? `${height}p` : resolution,
        });
      }
    }
  }

  return qualities.sort((a, b) => b.bandwidth - a.bandwidth);
}

/**
 * Fetch and parse an m3u8 URL for available qualities.
 */
export async function getM3u8Qualities(m3u8Url: string): Promise<M3u8Quality[]> {
  const response = await fetch(m3u8Url);
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
  }];
}

/**
 * Download an m3u8 stream using ffmpeg.
 */
export function downloadM3u8(
  m3u8Url: string,
  outputDir: string,
  filename: string,
  asAudio: boolean = false
): DownloadHandle {
  const ext = asAudio ? 'mp3' : 'mp4';
  const outputPath = join(outputDir, `${filename}.${ext}`);

  const args = [
    '-i', m3u8Url,
    '-progress', 'pipe:1',
    '-y',
  ];

  if (asAudio) {
    args.push('-vn', '-acodec', 'libmp3lame', '-q:a', '2');
  } else {
    args.push('-c', 'copy', '-bsf:a', 'aac_adtstoasc');
  }

  args.push(outputPath);

  const proc = execa(FFMPEG, args);

  return {
    process: proc,
    cancel: () => proc.kill(),
  };
}

/**
 * Get the duration of a media stream using ffprobe.
 */
export async function getStreamDuration(url: string): Promise<number> {
  try {
    const { stdout } = await execa(FFPROBE, [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      url,
    ], { timeout: 30000 });
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}
