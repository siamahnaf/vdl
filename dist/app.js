import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import Header from './components/header.js';
import UrlInput from './components/url-input.js';
import QualitySelect from './components/quality-select.js';
import FormatSelect from './components/format-select.js';
import DownloadProgressView from './components/download-progress.js';
import SetupWizard from './components/setup-wizard.js';
import Completion from './components/completion.js';
import ErrorDisplay from './components/error-display.js';
import DepError from './components/dep-error.js';
import { checkDependencies } from './utils/dependency-check.js';
import { loadConfig, saveConfig } from './config/store.js';
import { getVideoInfo, downloadVideo, downloadAudio } from './core/ytdlp.js';
import { analyzeUrl } from './core/url-analyzer.js';
import { getM3u8Qualities, downloadM3u8, getStreamDuration } from './core/ffmpeg.js';
import { extractM3u8Url, isPlaywrightAvailable } from './core/hls-extractor.js';
import { parseYtdlpProgress, parseFfmpegProgress } from './core/progress-parser.js';
export default function App({ initialUrl, flagAudio, flagQuality }) {
    const { exit } = useApp();
    const [state, setState] = useState('checking-deps');
    const [config, setConfig] = useState(loadConfig());
    const [url, setUrl] = useState(initialUrl ?? '');
    const [videoInfo, setVideoInfo] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState(null);
    const [mediaFormat, setMediaFormat] = useState(flagAudio ? 'audio' : null);
    const [progress, setProgress] = useState({
        percent: 0,
        speed: '',
        eta: '',
        downloaded: '',
        total: '',
        status: 'downloading',
    });
    const [errorMsg, setErrorMsg] = useState('');
    const [errorHint, setErrorHint] = useState('');
    const [depList, setDepList] = useState([]);
    const [startTime, setStartTime] = useState(0);
    const [analyzeMsg, setAnalyzeMsg] = useState('Analyzing URL...');
    // --- M3U8-specific state ---
    const [isM3u8, setIsM3u8] = useState(false);
    const [m3u8Url, setM3u8Url] = useState('');
    const [m3u8Qualities, setM3u8Qualities] = useState([]);
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
            }
            else if (initialUrl) {
                setUrl(initialUrl);
                setState('analyzing');
            }
            else {
                setState('url-input');
            }
        })();
    }, []);
    // Handle URL analysis
    useEffect(() => {
        if (state !== 'analyzing' || !url)
            return;
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
                        const match = info.formats.find((f) => flagQuality === 'best'
                            ? f.hasVideo
                            : f.resolution.includes(flagQuality));
                        if (match) {
                            setSelectedFormat(match);
                            if (mediaFormat) {
                                setState('downloading');
                            }
                            else {
                                setState('format-select');
                            }
                            return;
                        }
                    }
                    setState('quality-select');
                }
                else if (analysis.type === 'direct-m3u8') {
                    setAnalyzeMsg('Fetching stream qualities...');
                    const qualities = await getM3u8Qualities(url);
                    setIsM3u8(true);
                    setM3u8Url(url);
                    if (qualities.length === 1) {
                        setSelectedM3u8(qualities[0].url);
                        setM3u8Qualities(qualities);
                        if (mediaFormat) {
                            setState('downloading');
                        }
                        else {
                            setState('format-select');
                        }
                    }
                    else {
                        setM3u8Qualities(qualities);
                        setState('quality-select');
                    }
                }
                else if (analysis.type === 'needs-extraction') {
                    setAnalyzeMsg('Site not directly supported. Searching for video stream...');
                    const hasPlaywright = await isPlaywrightAvailable();
                    if (!hasPlaywright) {
                        setErrorMsg('This site requires a browser engine for video extraction');
                        setErrorHint('This feature is not available yet for this site');
                        setState('error');
                        return;
                    }
                    const extracted = await extractM3u8Url(url);
                    if (!extracted) {
                        setErrorMsg('Could not find a video on this page');
                        setErrorHint('The video may be protected or the site may not be supported');
                        setState('error');
                        return;
                    }
                    setIsM3u8(true);
                    setM3u8Url(extracted);
                    const qualities = await getM3u8Qualities(extracted);
                    setM3u8Qualities(qualities);
                    if (qualities.length === 1) {
                        setSelectedM3u8(qualities[0].url);
                        if (mediaFormat) {
                            setState('downloading');
                        }
                        else {
                            setState('format-select');
                        }
                    }
                    else {
                        setState('quality-select');
                    }
                }
                else {
                    setErrorMsg('This URL is not supported');
                    setErrorHint('Make sure the URL is correct and try again');
                    setState('error');
                }
            }
            catch (err) {
                setErrorMsg('Could not load video from this URL');
                setErrorHint('Check the URL and try again');
                setState('error');
            }
        })();
    }, [state, url]);
    // Handle downloading
    useEffect(() => {
        if (state !== 'downloading')
            return;
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
                    handle.process.stdout?.on('data', (chunk) => {
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
                }
                else if (selectedFormat) {
                    // yt-dlp download
                    let handle;
                    if (mediaFormat === 'audio') {
                        handle = downloadAudio(url, selectedFormat.formatId, outputDir);
                    }
                    else {
                        handle = downloadVideo(url, selectedFormat.formatId, outputDir);
                    }
                    handle.process.stdout?.on('data', (chunk) => {
                        const lines = chunk.toString().split('\n');
                        for (const line of lines) {
                            const parsed = parseYtdlpProgress(line);
                            if (parsed) {
                                setProgress(parsed);
                            }
                        }
                    });
                    handle.process.stderr?.on('data', (chunk) => {
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
            }
            catch (err) {
                setErrorMsg('Download failed');
                setErrorHint('Check your internet connection and try again');
                setState('error');
            }
        })();
    }, [state]);
    // --- Handlers ---
    const handleSetupComplete = useCallback((downloadDir) => {
        const updated = { ...config, downloadDir, firstRun: false };
        saveConfig(updated);
        setConfig(updated);
        if (initialUrl) {
            setUrl(initialUrl);
            setState('analyzing');
        }
        else {
            setState('url-input');
        }
    }, [config, initialUrl]);
    const handleUrlSubmit = useCallback((inputUrl) => {
        setUrl(inputUrl);
        setState('analyzing');
    }, []);
    const handleQualitySelect = useCallback((format) => {
        setSelectedFormat(format);
        if (mediaFormat) {
            setState('downloading');
        }
        else {
            setState('format-select');
        }
    }, [mediaFormat]);
    const handleM3u8QualitySelect = useCallback((item) => {
        setSelectedM3u8(item.url);
        if (mediaFormat) {
            setState('downloading');
        }
        else {
            setState('format-select');
        }
    }, [mediaFormat]);
    const handleFormatSelect = useCallback((format) => {
        setMediaFormat(format);
        setState('downloading');
    }, []);
    // --- Render ---
    const elapsed = startTime > 0 ? (Date.now() - startTime) / 1000 : 0;
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, {}), state === 'checking-deps' && (_jsxs(Box, { marginLeft: 2, children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { children: " Checking dependencies..." })] })), state === 'dep-error' && _jsx(DepError, { deps: depList }), state === 'setup' && _jsx(SetupWizard, { onComplete: handleSetupComplete }), state === 'url-input' && _jsx(UrlInput, { onSubmit: handleUrlSubmit }), state === 'analyzing' && (_jsxs(Box, { marginLeft: 2, children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), _jsxs(Text, { children: [" ", analyzeMsg] })] })), state === 'quality-select' && !isM3u8 && videoInfo && (_jsx(QualitySelect, { formats: videoInfo.formats, title: videoInfo.title, onSelect: handleQualitySelect })), state === 'quality-select' && isM3u8 && (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { marginBottom: 0, children: [_jsx(Text, { color: "green", bold: true, children: "? " }), _jsx(Text, { bold: true, children: "Select quality" })] }), _jsx(Box, { marginLeft: 2, children: _jsx(M3u8QualitySelect, { qualities: m3u8Qualities, onSelect: handleM3u8QualitySelect }) })] })), state === 'format-select' && _jsx(FormatSelect, { onSelect: handleFormatSelect }), state === 'downloading' && (_jsx(DownloadProgressView, { progress: progress, title: videoInfo?.title ?? 'Downloading...' })), state === 'complete' && (_jsx(Completion, { title: videoInfo?.title ?? 'Download', outputDir: config.downloadDir, elapsed: elapsed })), state === 'error' && _jsx(ErrorDisplay, { message: errorMsg, hint: errorHint })] }));
}
// Small inline component for m3u8 quality selection
import SelectInput from 'ink-select-input';
function M3u8QualitySelect({ qualities, onSelect, }) {
    const items = qualities.map((q) => ({
        label: q.label,
        value: q,
    }));
    return (_jsx(SelectInput, { items: items, onSelect: (item) => onSelect(item.value), indicatorComponent: ({ isSelected }) => (_jsx(Text, { color: "cyan", children: isSelected ? '❯ ' : '  ' })), itemComponent: ({ isSelected, label }) => (_jsx(Text, { color: isSelected ? 'cyan' : undefined, bold: isSelected, children: label })) }));
}
//# sourceMappingURL=app.js.map