import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';

import Header from './components/header.js';
import UrlInput from './components/url-input.js';
import QualitySelect from './components/quality-select.js';
import FormatSelect, { type MediaFormat } from './components/format-select.js';
import DownloadProgressView from './components/download-progress.js';
import SetupWizard from './components/setup-wizard.js';
import Completion from './components/completion.js';
import ErrorDisplay from './components/error-display.js';
import DepError from './components/dep-error.js';

import { checkDependencies } from './utils/dependency-check.js';
import { loadConfig, saveConfig } from './config/store.js';
import { getVideoInfo, downloadVideo, downloadAudio, type DownloadHandle } from './core/ytdlp.js';
import { analyzeUrl } from './core/url-analyzer.js';
import { getM3u8Qualities, downloadM3u8, getStreamDuration } from './core/ffmpeg.js';
import { extractM3u8Url, isPlaywrightAvailable } from './core/hls-extractor.js';
import { parseYtdlpProgress, parseFfmpegProgress } from './core/progress-parser.js';

import type { VideoFormat, VideoInfo, DownloadProgress } from './types/video.js';
import type { VdlConfig } from './types/config.js';

type AppState =
  | 'checking-deps'
  | 'setup'
  | 'url-input'
  | 'analyzing'
  | 'quality-select'
  | 'format-select'
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
  const [m3u8Qualities, setM3u8Qualities] = useState<{ url: string; label: string }[]>([]);
  const [selectedM3u8, setSelectedM3u8] = useState('');

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
        setState('analyzing');
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
          const info = await getVideoInfo(url);
          setVideoInfo(info);
          setIsM3u8(false);

          // Auto-select quality if flag provided
          if (flagQuality && flagQuality !== 'ask') {
            const match = info.formats.find((f) =>
              flagQuality === 'best'
                ? f.hasVideo
                : f.resolution.includes(flagQuality)
            );
            if (match) {
              setSelectedFormat(match);
              if (mediaFormat) {
                setState('downloading');
              } else {
                setState('format-select');
              }
              return;
            }
          }

          setState('quality-select');
        } else if (analysis.type === 'direct-m3u8') {
          setAnalyzeMsg('Fetching stream qualities...');
          const qualities = await getM3u8Qualities(url);
          setIsM3u8(true);
          setM3u8Url(url);

          if (qualities.length === 1) {
            setSelectedM3u8(qualities[0]!.url);
            setM3u8Qualities(qualities);
            if (mediaFormat) {
              setState('downloading');
            } else {
              setState('format-select');
            }
          } else {
            setM3u8Qualities(qualities);
            setState('quality-select');
          }
        } else if (analysis.type === 'needs-extraction') {
          setAnalyzeMsg('Site not directly supported. Searching for video stream...');

          const hasPlaywright = await isPlaywrightAvailable();
          if (!hasPlaywright) {
            setErrorMsg('This site requires Playwright for video extraction');
            setErrorHint('Run: npm install -g playwright && npx playwright install chromium');
            setState('error');
            return;
          }

          const extracted = await extractM3u8Url(url);
          if (!extracted) {
            setErrorMsg('Could not find a video stream on this page');
            setErrorHint('The page may require interaction or the video may be DRM-protected');
            setState('error');
            return;
          }

          setIsM3u8(true);
          setM3u8Url(extracted);
          const qualities = await getM3u8Qualities(extracted);
          setM3u8Qualities(qualities);

          if (qualities.length === 1) {
            setSelectedM3u8(qualities[0]!.url);
            if (mediaFormat) {
              setState('downloading');
            } else {
              setState('format-select');
            }
          } else {
            setState('quality-select');
          }
        } else {
          setErrorMsg('Unsupported URL');
          setErrorHint('Make sure the URL is correct and the site is supported');
          setState('error');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to analyze URL');
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
          // M3U8 download via ffmpeg
          const streamUrl = selectedM3u8 || m3u8Url;
          const filename = videoInfo?.title ?? `vdl-${Date.now()}`;
          const asAudio = mediaFormat === 'audio';

          const totalDuration = await getStreamDuration(streamUrl);
          const handle = downloadM3u8(streamUrl, outputDir, filename, asAudio);

          handle.process.stdout?.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              const parsed = parseFfmpegProgress(line, totalDuration);
              if (parsed) {
                setProgress((prev) => ({
                  ...prev,
                  ...(parsed.percent >= 0 ? { percent: parsed.percent } : {}),
                  ...(parsed.speed ? { speed: parsed.speed } : {}),
                  status: parsed.status,
                }));
              }
            }
          });

          await handle.process;
          setProgress((prev) => ({ ...prev, percent: 100, status: 'complete' }));
          setState('complete');
        } else if (selectedFormat) {
          // yt-dlp download
          let handle: DownloadHandle;

          if (mediaFormat === 'audio') {
            handle = downloadAudio(url, selectedFormat.formatId, outputDir);
          } else {
            handle = downloadVideo(url, selectedFormat.formatId, outputDir);
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
        setErrorMsg(err.message || 'Download failed');
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
      setState('analyzing');
    } else {
      setState('url-input');
    }
  }, [config, initialUrl]);

  const handleUrlSubmit = useCallback((inputUrl: string) => {
    setUrl(inputUrl);
    setState('analyzing');
  }, []);

  const handleQualitySelect = useCallback((format: VideoFormat) => {
    setSelectedFormat(format);
    if (mediaFormat) {
      setState('downloading');
    } else {
      setState('format-select');
    }
  }, [mediaFormat]);

  const handleM3u8QualitySelect = useCallback((item: { url: string; label: string }) => {
    setSelectedM3u8(item.url);
    if (mediaFormat) {
      setState('downloading');
    } else {
      setState('format-select');
    }
  }, [mediaFormat]);

  const handleFormatSelect = useCallback((format: MediaFormat) => {
    setMediaFormat(format);
    setState('downloading');
  }, []);

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

      {state === 'analyzing' && (
        <Box marginLeft={2}>
          <Text color="cyan"><Spinner type="dots" /></Text>
          <Text> {analyzeMsg}</Text>
        </Box>
      )}

      {state === 'quality-select' && !isM3u8 && videoInfo && (
        <QualitySelect
          formats={videoInfo.formats}
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
            {/* Render m3u8 qualities using ink-select-input */}
            <M3u8QualitySelect qualities={m3u8Qualities} onSelect={handleM3u8QualitySelect} />
          </Box>
        </Box>
      )}

      {state === 'format-select' && <FormatSelect onSelect={handleFormatSelect} />}

      {state === 'downloading' && (
        <DownloadProgressView
          progress={progress}
          title={videoInfo?.title ?? 'Downloading...'}
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

// Small inline component for m3u8 quality selection
import SelectInput from 'ink-select-input';

function M3u8QualitySelect({
  qualities,
  onSelect,
}: {
  qualities: { url: string; label: string }[];
  onSelect: (item: { url: string; label: string }) => void;
}) {
  const items = qualities.map((q) => ({
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
