import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export default function Completion({ title, outputDir, elapsed }) {
    const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
    const elapsedStr = elapsed > 60
        ? `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`
        : `${Math.round(elapsed)}s`;
    return (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Box, { children: _jsx(Text, { color: "green", bold: true, children: "  \u2713 Download complete!" }) }), _jsxs(Box, { marginLeft: 4, marginTop: 0, children: [_jsx(Text, { dimColor: true, children: "File:  " }), _jsx(Text, { color: "white", bold: true, children: displayTitle })] }), _jsxs(Box, { marginLeft: 4, children: [_jsx(Text, { dimColor: true, children: "Saved: " }), _jsx(Text, { color: "cyan", children: outputDir })] }), _jsxs(Box, { marginLeft: 4, children: [_jsx(Text, { dimColor: true, children: "Time:  " }), _jsx(Text, { color: "yellow", children: elapsedStr })] }), _jsx(Box, { marginTop: 1, marginLeft: 2, children: _jsx(Text, { dimColor: true, children: '─'.repeat(45) }) })] }));
}
//# sourceMappingURL=completion.js.map