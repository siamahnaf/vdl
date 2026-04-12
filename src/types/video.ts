export interface VideoFormat {
  formatId: string;
  extension: string;
  resolution: string;
  width: number;
  height: number;
  filesize: number | null;
  fps: number | null;
  vcodec: string;
  acodec: string;
  label: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface DownloadProgress {
  percent: number;
  speed: string;
  eta: string;
  downloaded: string;
  total: string;
  status: 'downloading' | 'merging' | 'converting' | 'complete' | 'error';
}

export interface VideoInfo {
  title: string;
  duration: number | null;
  thumbnail: string | null;
  uploader: string | null;
  url: string;
  formats: VideoFormat[];
}

export type UrlType = 'ytdlp' | 'direct-m3u8' | 'unknown';

export interface UrlAnalysis {
  type: UrlType;
  url: string;
}
