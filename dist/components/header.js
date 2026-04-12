import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
const LOGO = `
 ╦  ╦╔╦╗╦
 ╚╗╔╝ ║║║
  ╚╝ ═╩╝╩═╝`;
export default function Header() {
    return (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Box, { children: _jsx(Text, { color: "cyan", bold: true, children: LOGO }) }), _jsxs(Box, { marginLeft: 1, children: [_jsx(Text, { dimColor: true, children: "Video Downloader \u2014 " }), _jsx(Text, { color: "gray", children: "Download from any platform" })] }), _jsx(Box, { marginLeft: 1, marginTop: 0, children: _jsx(Text, { dimColor: true, children: '─'.repeat(45) }) })] }));
}
//# sourceMappingURL=header.js.map