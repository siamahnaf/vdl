import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { existsSync } from 'fs';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import Header from './components/header.js';
import UrlInput from './components/url-input.js';
import QualitySelect from './components/quality-select.js';
import FormatSelect from './components/format-select.js';
import PlaylistSelect from './components/playlist-select.js';
import DownloadProgressView from './components/download-progress.js';
import SetupWizard from './components/setup-wizard.js';
import Completion from './components/completion.js';
import ErrorDisplay from './components/error-display.js';
import DepError from './components/dep-error.js';
import { checkDependencies } from './utils/dependency-check.js';
import { loadConfig, saveConfig } from './config/store.js';
import { getVideoInfo, downloadVideo, downloadAudio, isPlaylistUrl } from './core/ytdlp.js';
import { analyzeUrl } from './core/url-analyzer.js';
import { getM3u8Qualities, downloadM3u8, getM3u8PlaylistDuration } from './core/ffmpeg.js';
import { extractM3u8Url, getBrowserName } from './core/hls-extractor.js';
import { parseYtdlpProgress, formatTime } from './core/progress-parser.js';
export default function App({ initialUrl, flagAudio, flagQuality }) {
    const { exit } = useApp();
    const [state, setState] = useState('checking-deps');
    const [config, setConfig] = useState(loadConfig());
    const [url, setUrl] = useState(initialUrl ?? '');
    const [videoInfo, setVideoInfo] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState(null);
    const [mediaFormat, setMediaFormat] = useState(flagAudio ? 'audio' : null);
    const [noPlaylist, setNoPlaylist] = useState(true);
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
    const [m3u8Headers, setM3u8Headers] = useState({});
    const [m3u8Qualities, setM3u8Qualities] = useState([]);
    const [selectedM3u8Height, setSelectedM3u8Height] = useState(0);
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
                // Check if playlist URL — ask user
                if (isPlaylistUrl(initialUrl)) {
                    setState('playlist-select');
                }
                else {
                    setState('analyzing');
                }
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
                    const info = await getVideoInfo(url, noPlaylist);
                    setVideoInfo(info);
                    setIsM3u8(false);
                    if (mediaFormat) {
                        setState('quality-select');
                    }
                    else {
                        setState('format-select');
                    }
                }
                else if (analysis.type === 'direct-m3u8') {
                    setAnalyzeMsg('Fetching stream qualities...');
                    const qualities = await getM3u8Qualities(url);
                    setIsM3u8(true);
                    setM3u8Url(url);
                    setM3u8Qualities(qualities);
                    if (mediaFormat) {
                        if (qualities.length === 1) {
                            setSelectedM3u8(qualities[0].url);
                            setSelectedM3u8Height(qualities[0].height);
                            setState('downloading');
                        }
                        else {
                            setState('quality-select');
                        }
                    }
                    else {
                        setState('format-select');
                    }
                }
                else if (analysis.type === 'needs-extraction') {
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
                    let qualities = [
                        { url: extracted.url, label: 'Default quality', height: 0 },
                    ];
                    try {
                        const fetchedQualities = await getM3u8Qualities(extracted.url, extracted.headers);
                        if (fetchedQualities.length > 0) {
                            qualities = fetchedQualities;
                        }
                    }
                    catch {
                        // Use default quality
                    }
                    setM3u8Qualities(qualities);
                    if (mediaFormat) {
                        if (qualities.length === 1) {
                            setSelectedM3u8(qualities[0].url);
                            setSelectedM3u8Height(qualities[0].height);
                            setState('downloading');
                        }
                        else {
                            setState('quality-select');
                        }
                    }
                    else {
                        setState('format-select');
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
                    const filename = videoInfo?.title ?? `vdl-${Date.now()}`;
                    const asAudio = mediaFormat === 'audio';
                    // Pass the specific quality stream URL (already has video+audio muxed for HLS)
                    const streamUrl = selectedM3u8 || m3u8Url;
                    // Parse duration from the playlist using captured headers (ffprobe won't work
                    // on authenticated streams, but we already have the session headers from CDP).
                    const totalDurSec = await getM3u8PlaylistDuration(streamUrl, m3u8Headers);
                    const handle = downloadM3u8(streamUrl, outputDir, filename, asAudio, m3u8Headers);
                    const onData = (chunk) => {
                        const lines = chunk.toString().split('\n');
                        for (const line of lines) {
                            const parsed = parseYtdlpProgress(line);
                            if (parsed) {
                                setProgress((prev) => {
                                    // Never go backwards on percentage (concurrent frags report out-of-order)
                                    const pct = parsed.percent > 0 && parsed.percent < prev.percent
                                        ? prev.percent
                                        : parsed.percent;
                                    // Show elapsed video time (e.g. "45:23 / 1:38:09") when duration is known
                                    let downloaded = parsed.downloaded;
                                    let total = parsed.total;
                                    if (totalDurSec > 0 && pct > 0) {
                                        downloaded = formatTime(Math.floor((pct / 100) * totalDurSec));
                                        total = formatTime(totalDurSec);
                                    }
                                    return { ...prev, ...parsed, percent: pct, downloaded, total };
                                });
                            }
                        }
                    };
                    handle.process.stdout?.on('data', onData);
                    handle.process.stderr?.on('data', onData);
                    try {
                        await handle.process;
                    }
                    catch (processErr) {
                        // yt-dlp sometimes exits non-zero after a successful download (post-processing quirk).
                        // If the output file exists and has content, treat it as success.
                        const outFile = handle.outputPath;
                        if (outFile && existsSync(outFile)) {
                            // File was created — download succeeded despite the exit code
                        }
                        else {
                            throw processErr;
                        }
                    }
                    setProgress((prev) => ({ ...prev, percent: 100, status: 'complete' }));
                    setState('complete');
                }
                else if (selectedFormat) {
                    let handle;
                    if (mediaFormat === 'audio') {
                        handle = downloadAudio(url, selectedFormat.formatId, outputDir, noPlaylist);
                    }
                    else {
                        handle = downloadVideo(url, selectedFormat.formatId, outputDir, noPlaylist);
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
            if (isPlaylistUrl(initialUrl)) {
                setState('playlist-select');
            }
            else {
                setState('analyzing');
            }
        }
        else {
            setState('url-input');
        }
    }, [config, initialUrl]);
    const handleUrlSubmit = useCallback((inputUrl) => {
        setUrl(inputUrl);
        if (isPlaylistUrl(inputUrl)) {
            setState('playlist-select');
        }
        else {
            setState('analyzing');
        }
    }, []);
    const handlePlaylistSelect = useCallback((choice) => {
        setNoPlaylist(choice === 'single');
        setState('analyzing');
    }, []);
    const handleFormatSelect = useCallback((format) => {
        setMediaFormat(format);
        if (isM3u8) {
            if (m3u8Qualities.length === 1) {
                setSelectedM3u8(m3u8Qualities[0].url);
                setSelectedM3u8Height(m3u8Qualities[0].height);
                setState('downloading');
            }
            else {
                setState('quality-select');
            }
        }
        else {
            if (flagQuality && flagQuality !== 'ask' && videoInfo) {
                const formats = format === 'audio'
                    ? videoInfo.formats.filter((f) => f.hasAudio && !f.hasVideo)
                    : videoInfo.formats.filter((f) => f.hasVideo);
                const match = formats.find((f) => flagQuality === 'best'
                    ? true
                    : f.resolution.includes(flagQuality));
                if (match) {
                    setSelectedFormat(match);
                    setState('downloading');
                    return;
                }
            }
            setState('quality-select');
        }
    }, [isM3u8, m3u8Qualities, flagQuality, videoInfo]);
    const handleQualitySelect = useCallback((format) => {
        setSelectedFormat(format);
        setState('downloading');
    }, []);
    const handleM3u8QualitySelect = useCallback((item) => {
        setSelectedM3u8(item.url);
        setSelectedM3u8Height(item.height);
        setState('downloading');
    }, []);
    const getFilteredFormats = () => {
        if (!videoInfo)
            return [];
        if (mediaFormat === 'audio') {
            return videoInfo.formats.filter((f) => f.hasAudio && !f.hasVideo);
        }
        return videoInfo.formats.filter((f) => f.hasVideo);
    };
    // --- Render ---
    const elapsed = startTime > 0 ? (Date.now() - startTime) / 1000 : 0;
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Header, {}), state === 'checking-deps' && (_jsxs(Box, { marginLeft: 2, children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { children: " Checking dependencies..." })] })), state === 'dep-error' && _jsx(DepError, { deps: depList }), state === 'setup' && _jsx(SetupWizard, { onComplete: handleSetupComplete }), state === 'url-input' && _jsx(UrlInput, { onSubmit: handleUrlSubmit }), state === 'playlist-select' && _jsx(PlaylistSelect, { onSelect: handlePlaylistSelect }), state === 'analyzing' && (_jsxs(Box, { marginLeft: 2, children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), _jsxs(Text, { children: [" ", analyzeMsg] })] })), state === 'format-select' && _jsx(FormatSelect, { onSelect: handleFormatSelect }), state === 'quality-select' && !isM3u8 && videoInfo && (_jsx(QualitySelect, { formats: getFilteredFormats(), title: videoInfo.title, onSelect: handleQualitySelect })), state === 'quality-select' && isM3u8 && (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { marginBottom: 0, children: [_jsx(Text, { color: "green", bold: true, children: "? " }), _jsx(Text, { bold: true, children: "Select quality" })] }), _jsx(Box, { marginLeft: 2, children: _jsx(M3u8QualitySelect, { qualities: m3u8Qualities, onSelect: handleM3u8QualitySelect }) })] })), state === 'downloading' && (_jsx(DownloadProgressView, { progress: progress, title: videoInfo?.title ?? 'Downloading...', isStream: isM3u8 })), state === 'complete' && (_jsx(Completion, { title: videoInfo?.title ?? 'Download', outputDir: config.downloadDir, elapsed: elapsed })), state === 'error' && _jsx(ErrorDisplay, { message: errorMsg, hint: errorHint })] }));
}
import SelectInput from 'ink-select-input';
function M3u8QualitySelect({ qualities, onSelect, }) {
    const items = qualities.map((q, i) => ({
        key: `m3u8-${i}`,
        label: q.label,
        value: q,
    }));
    return (_jsx(SelectInput, { items: items, onSelect: (item) => onSelect(item.value), indicatorComponent: ({ isSelected }) => (_jsx(Text, { color: "cyan", children: isSelected ? '❯ ' : '  ' })), itemComponent: ({ isSelected, label }) => (_jsx(Text, { color: isSelected ? 'cyan' : undefined, bold: isSelected, children: label })) }));
}
//# sourceMappingURL=app.js.map