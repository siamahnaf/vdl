import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text } from 'ink';
function ProgressBar({ percent, width = 35 }) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    let color;
    if (percent >= 100)
        color = 'green';
    else if (percent >= 60)
        color = 'cyan';
    else if (percent >= 30)
        color = 'blue';
    else
        color = 'magenta';
    return (_jsx(Text, { color: color, children: bar }));
}
function StreamBar({ width = 35 }) {
    const bar = '▓'.repeat(width);
    return _jsx(Text, { color: "cyan", children: bar });
}
function StatusBadge({ status }) {
    switch (status) {
        case 'downloading':
            return _jsx(Text, { color: "cyan", bold: true, children: " \u2193 DOWNLOADING" });
        case 'merging':
            return _jsx(Text, { color: "yellow", bold: true, children: " \u27F3 MERGING" });
        case 'converting':
            return _jsx(Text, { color: "yellow", bold: true, children: " \u27F3 CONVERTING" });
        case 'complete':
            return _jsx(Text, { color: "green", bold: true, children: " \u2713 COMPLETE" });
        case 'error':
            return _jsx(Text, { color: "red", bold: true, children: " \u2717 ERROR" });
    }
}
export default function DownloadProgressView({ progress, title, isStream = false }) {
    const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
    return (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Box, { children: _jsx(StatusBadge, { status: progress.status }) }), _jsxs(Box, { marginTop: 0, marginLeft: 1, children: [_jsx(Text, { dimColor: true, children: "  File: " }), _jsx(Text, { color: "white", bold: true, children: displayTitle })] }), _jsxs(Box, { marginLeft: 1, marginTop: 1, children: [_jsx(Text, { children: "  " }), isStream ? (_jsxs(_Fragment, { children: [_jsx(StreamBar, {}), _jsx(Text, { bold: true, color: "cyan", children: " streaming" })] })) : (_jsxs(_Fragment, { children: [_jsx(ProgressBar, { percent: progress.percent }), _jsxs(Text, { bold: true, color: "white", children: [" ", progress.percent.toFixed(1), "%"] })] }))] }), _jsxs(Box, { marginLeft: 1, marginTop: 0, children: [_jsx(Text, { children: "  " }), progress.speed && (_jsxs(Box, { marginRight: 2, children: [_jsx(Text, { dimColor: true, children: "Speed: " }), _jsx(Text, { color: "green", bold: true, children: progress.speed })] })), progress.downloaded && (_jsxs(Box, { marginRight: 2, children: [_jsx(Text, { dimColor: true, children: isStream ? 'Downloaded: ' : 'Downloaded: ' }), _jsx(Text, { color: "yellow", bold: true, children: progress.downloaded })] })), progress.eta && progress.eta !== '00:00' && (_jsxs(Box, { marginRight: 2, children: [_jsx(Text, { dimColor: true, children: "ETA: " }), _jsx(Text, { color: "yellow", bold: true, children: progress.eta })] })), progress.total && (_jsxs(Box, { children: [_jsx(Text, { dimColor: true, children: "Size: " }), _jsx(Text, { color: "magenta", bold: true, children: progress.total })] }))] })] }));
}
//# sourceMappingURL=download-progress.js.map