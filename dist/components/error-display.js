import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export default function ErrorDisplay({ message, hint }) {
    return (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsxs(Box, { children: [_jsx(Text, { color: "red", bold: true, children: "  \u2717 " }), _jsx(Text, { color: "red", children: message })] }), hint && (_jsx(Box, { marginLeft: 4, marginTop: 0, children: _jsx(Text, { dimColor: true, children: hint }) }))] }));
}
//# sourceMappingURL=error-display.js.map