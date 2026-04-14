import React, { useState, useEffect, useCallback } from 'react';
import { existsSync } from 'fs';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';

import Header from './components/header.js';
import UrlInput from './components/url-input.js';
import QualitySelect from './components/quality-select.js';
import FormatSelect, { type MediaFormat } from './components/format-select.js';
import PlaylistSelect, { type PlaylistChoice } from './components/playlist-select.js';
import DownloadProgressView from './components/download-progress.js';
import SetupWizard from './components/setup-wizard.js';
import Completion from './components/completion.js';
import ErrorDisplay from './components/error-display.js';
import DepError from './components/dep-error.js';

import { checkDependencies } from './utils/dependency-check.js';
import { loadConfig, saveConfig } from './config/store.js';
import { getVideoInfo, downloadVideo, downloadAudio, isPlaylistUrl, type DownloadHandle } from './core/ytdlp.js';
import { analyzeUrl } from './core/url-analyzer.js';
import { getM3u8Qualities, downloadM3u8 } from './core/ffmpeg.js';
import { extractM3u8Url, getBrowserName } from './core/hls-extractor.js';
import { parseYtdlpProgress } from './core/progress-parser.js';

import type { VideoFormat, VideoInfo, DownloadProgress } from './types/video.js';
import type { VdlConfig } from './types/config.js';

type AppState =
  | 'checking-deps'
  | 'setup'
  | 'url-input'
  | 'playlist-select'
  | 'analyzing'
  | 'format-select'
  | 'quality-select'
  | 'downloading'
  | 'complete'
  | 'error'
  | 'dep-error';

interface Props {
  initialUrl?: string;
  flagAudio?: boolean;
  flagQuality?: string;
}

export default function App({ initialUrl, flagAudio, flagQuality }: Props) {
  const { exit } = useApp();

  const [state, setState] = useState<AppState>('checking-deps');
  const [config, setConfig] = useState<VdlConfig>(loadConfig());
  const [url, setUrl] = useState(initialUrl ?? '');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [mediaFormat, setMediaFormat] = useState<MediaFormat | null>(flagAudio ? 'audio' : null);
  const [noPlaylist, setNoPlaylist] = useState(true);
  const [progress, setProgress] = useState<DownloadProgress>({
    percent: 0,
    speed: '',
    eta: '',
    downloaded: '',
    total: '',
    status: 'downloading',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [depList, setDepList] = useState<{ name: string; found: boolean; installHint: string }[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [analyzeMsg, setAnalyzeMsg] = useState('Analyzing URL...');

  // --- M3U8-specific state ---
  const [isM3u8, setIsM3u8] = useState(false);
  const [m3u8Url, setM3u8Url] = useState('');
  const [m3u8Headers, setM3u8Headers] = useState<Record<string, string>>({});
  const [m3u8Qualities, setM3u8Qualities] = useState<{ url: string; label: string; height: number }[]>([]);
  const [selectedM3u8Height, setSelectedM3u8Height] = useState(0);

  // Check dependencies on mount
  useEffect(() => {
    (async () => {
      const { allFound, deps } = await checkDependencies();
      if (!allFound) {
        setDepList(deps);
        setState('dep-error');
        return;
      }

      if (config.firstRun) {
        setState('setup');
      } else if (initialUrl) {
        setUrl(initialUrl);
        // Check if playlist URL — ask user
        if (isPlaylistUrl(initialUrl)) {
          setState('playlist-select');
        } else {
          setState('analyzing');
        }
      } else {
        setState('url-input');
      }
    })();
  }, []);

  // Handle URL analysis
  useEffect(() => {
    if (state !== 'analyzing' || !url) return;

    (async () => {
      try {
        setAnalyzeMsg('Analyzing URL...');
        const analysis = await analyzeUrl(url);

        if (analysis.type === 'ytdlp') {
          setAnalyzeMsg('Fetching available qualities...');
          const info = await getVideoInfo(url, noPlaylist);
          setVideoInfo(info);
          setIsM3u8(false);

          if (mediaFormat) {
            setState('quality-select');
          } else {
            setState('format-select');
          }
        } else if (analysis.type === 'direct-m3u8') {
          setAnalyzeMsg('Fetching stream qualities...');
          const qualities = await getM3u8Qualities(url);
          setIsM3u8(true);
          setM3u8Url(url);
          setM3u8Qualities(qualities);

          if (mediaFormat) {
            if (qualities.length === 1) {
              setSelectedM3u8Height(qualities[0]!.height);
              setState('downloading');
            } else {
              setState('quality-select');
            }
          } else {
            setState('format-select');
          }
        } else if (analysis.type === 'needs-extraction') {
          const browserName = getBrowserName();
          setAnalyzeMsg(`Searching for video stream using ${browserName}...`);

          const extracted = await extractM3u8Url(url);
          if (!extracted) {
            setErrorMsg('Could not find a video on this page');
            setErrorHint('The video may be protected or the site may not be supported');
            setState('error');
            return;
          }

          setIsM3u8(true);
          setM3u8Url(extracted.url);
          setM3u8Headers(extracted.headers);

          // Fetch qualities using the captured browser headers
          let qualities: { url: string; label: string; height: number }[] = [
            { url: extracted.url, label: 'Default quality', height: 0 },
          ];

          try {
            const fetchedQualities = await getM3u8Qualities(extracted.url, extracted.headers);
            if (fetchedQualities.length > 0) {
              qualities = fetchedQualities;
            }
          } catch {
            // Use default quality
          }
          setM3u8Qualities(qualities);

          if (mediaFormat) {
            if (qualities.length === 1) {
              setSelectedM3u8Height(qualities[0]!.height);
              setState('downloading');
            } else {
              setState('quality-select');
            }
          } else {
            setState('format-select');
          }
        } else {
          setErrorMsg('This URL is not supported');
          setErrorHint('Make sure the URL is correct and try again');
          setState('error');
        }
      } catch (err: any) {
        setErrorMsg('Could not load video from this URL');
        setErrorHint('Check the URL and try again');
        setState('error');
      }
    })();
  }, [state, url]);

  // Handle downloading
  useEffect(() => {
    if (state !== 'downloading') return;

    setStartTime(Date.now());

    (async () => {
      try {
        const outputDir = config.downloadDir;

        if (isM3u8) {
          const filename = videoInfo?.title ?? `vdl-${Date.now()}`;
          const asAudio = mediaFormat === 'audio';

          // Always pass the master URL + height so yt-dlp can merge video+audio properly
          const handle = downloadM3u8(m3u8Url, outputDir, filename, asAudio, m3u8Headers, selectedM3u8Height);

          const onData = (chunk: Buffer) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              const parsed = parseYtdlpProgress(line);
              if (parsed) {
                setProgress((prev) => {
                  // Never go backwards on percentage (concurrent frags report out-of-order)
                  const pct = parsed.percent > 0 && parsed.percent < prev.percent
                    ? prev.percent
                    : parsed.percent;
                  return { ...prev, ...parsed, percent: pct };
                });
              }
            }
          };

          handle.process.stdout?.on('data', onData);
          handle.process.stderr?.on('data', onData);

          try {
            await handle.process;
          } catch (processErr) {
            // yt-dlp sometimes exits non-zero after a successful download (post-processing quirk).
            // If the output file exists and has content, treat it as success.
            const outFile = handle.outputPath;
            if (outFile && existsSync(outFile)) {
              // File was created — download succeeded despite the exit code
            } else {
              throw processErr;
            }
          }
          setProgress((prev) => ({ ...prev, percent: 100, status: 'complete' }));
          setState('complete');
        } else if (selectedFormat) {
          let handle: DownloadHandle;

          if (mediaFormat === 'audio') {
            handle = downloadAudio(url, selectedFormat.formatId, outputDir, noPlaylist);
          } else {
            handle = downloadVideo(url, selectedFormat.formatId, outputDir, noPlaylist);
          }

          handle.process.stdout?.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              const parsed = parseYtdlpProgress(line);
              if (parsed) {
                setProgress(parsed);
              }
            }
          });

          handle.process.stderr?.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              const parsed = parseYtdlpProgress(line);
              if (parsed) {
                setProgress(parsed);
              }
            }
          });

          await handle.process;
          setProgress((prev) => ({ ...prev, percent: 100, status: 'complete' }));
          setState('complete');
        }
      } catch (err: any) {
        setErrorMsg('Download failed');
        setErrorHint('Check your internet connection and try again');
        setState('error');
      }
    })();
  }, [state]);

  // --- Handlers ---

  const handleSetupComplete = useCallback((downloadDir: string) => {
    const updated = { ...config, downloadDir, firstRun: false };
    saveConfig(updated);
    setConfig(updated);

    if (initialUrl) {
      setUrl(initialUrl);
      if (isPlaylistUrl(initialUrl)) {
        setState('playlist-select');
      } else {
        setState('analyzing');
      }
    } else {
      setState('url-input');
    }
  }, [config, initialUrl]);

  const handleUrlSubmit = useCallback((inputUrl: string) => {
    setUrl(inputUrl);
    if (isPlaylistUrl(inputUrl)) {
      setState('playlist-select');
    } else {
      setState('analyzing');
    }
  }, []);

  const handlePlaylistSelect = useCallback((choice: PlaylistChoice) => {
    setNoPlaylist(choice === 'single');
    setState('analyzing');
  }, []);

  const handleFormatSelect = useCallback((format: MediaFormat) => {
    setMediaFormat(format);

    if (isM3u8) {
      if (m3u8Qualities.length === 1) {
        setSelectedM3u8Height(m3u8Qualities[0]!.height);
        setState('downloading');
      } else {
        setState('quality-select');
      }
    } else {
      if (flagQuality && flagQuality !== 'ask' && videoInfo) {
        const formats = format === 'audio'
          ? videoInfo.formats.filter((f) => f.hasAudio && !f.hasVideo)
          : videoInfo.formats.filter((f) => f.hasVideo);

        const match = formats.find((f) =>
          flagQuality === 'best'
            ? true
            : f.resolution.includes(flagQuality!)
        );
        if (match) {
          setSelectedFormat(match);
          setState('downloading');
          return;
        }
      }

      setState('quality-select');
    }
  }, [isM3u8, m3u8Qualities, flagQuality, videoInfo]);

  const handleQualitySelect = useCallback((format: VideoFormat) => {
    setSelectedFormat(format);
    setState('downloading');
  }, []);

  const handleM3u8QualitySelect = useCallback((item: { url: string; label: string; height: number }) => {
    setSelectedM3u8Height(item.height);
    setState('downloading');
  }, []);

  const getFilteredFormats = (): VideoFormat[] => {
    if (!videoInfo) return [];
    if (mediaFormat === 'audio') {
      return videoInfo.formats.filter((f) => f.hasAudio && !f.hasVideo);
    }
    return videoInfo.formats.filter((f) => f.hasVideo);
  };

  // --- Render ---

  const elapsed = startTime > 0 ? (Date.now() - startTime) / 1000 : 0;

  return (
    <Box flexDirection="column">
      <Header />

      {state === 'checking-deps' && (
        <Box marginLeft={2}>
          <Text color="cyan"><Spinner type="dots" /></Text>
          <Text> Checking dependencies...</Text>
        </Box>
      )}

      {state === 'dep-error' && <DepError deps={depList} />}

      {state === 'setup' && <SetupWizard onComplete={handleSetupComplete} />}

      {state === 'url-input' && <UrlInput onSubmit={handleUrlSubmit} />}

      {state === 'playlist-select' && <PlaylistSelect onSelect={handlePlaylistSelect} />}

      {state === 'analyzing' && (
        <Box marginLeft={2}>
          <Text color="cyan"><Spinner type="dots" /></Text>
          <Text> {analyzeMsg}</Text>
        </Box>
      )}

      {state === 'format-select' && <FormatSelect onSelect={handleFormatSelect} />}

      {state === 'quality-select' && !isM3u8 && videoInfo && (
        <QualitySelect
          formats={getFilteredFormats()}
          title={videoInfo.title}
          onSelect={handleQualitySelect}
        />
      )}

      {state === 'quality-select' && isM3u8 && (
        <Box flexDirection="column">
          <Box marginBottom={0}>
            <Text color="green" bold>? </Text>
            <Text bold>Select quality</Text>
          </Box>
          <Box marginLeft={2}>
            <M3u8QualitySelect qualities={m3u8Qualities} onSelect={handleM3u8QualitySelect} />
          </Box>
        </Box>
      )}

      {state === 'downloading' && (
        <DownloadProgressView
          progress={progress}
          title={videoInfo?.title ?? 'Downloading...'}
          isStream={isM3u8}
        />
      )}

      {state === 'complete' && (
        <Completion
          title={videoInfo?.title ?? 'Download'}
          outputDir={config.downloadDir}
          elapsed={elapsed}
        />
      )}

      {state === 'error' && <ErrorDisplay message={errorMsg} hint={errorHint} />}
    </Box>
  );
}

import SelectInput from 'ink-select-input';

function M3u8QualitySelect({
  qualities,
  onSelect,
}: {
  qualities: { url: string; label: string; height: number }[];
  onSelect: (item: { url: string; label: string; height: number }) => void;
}) {
  const items = qualities.map((q, i) => ({
    key: `m3u8-${i}`,
    label: q.label,
    value: q,
  }));

  return (
    <SelectInput
      items={items}
      onSelect={(item) => onSelect(item.value)}
      indicatorComponent={({ isSelected }) => (
        <Text color="cyan">{isSelected ? '❯ ' : '  '}</Text>
      )}
      itemComponent={({ isSelected, label }) => (
        <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
          {label}
        </Text>
      )}
    />
  );
}
