import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export default function DepError({ deps }) {
    const missing = deps.filter((d) => !d.found);
    return (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsx(Box, { children: _jsx(Text, { color: "red", bold: true, children: "  \u2717 Some required tools are missing" }) }), missing.map((dep) => (_jsxs(Box, { flexDirection: "column", marginLeft: 4, marginTop: 1, children: [_jsxs(Box, { children: [_jsx(Text, { color: "red", children: "\u2717 " }), _jsx(Text, { bold: true, children: dep.name }), _jsx(Text, { dimColor: true, children: " \u2014 not installed" })] }), _jsxs(Box, { marginLeft: 2, children: [_jsx(Text, { dimColor: true, children: "To install, visit: " }), _jsx(Text, { color: "cyan", children: dep.installHint })] })] }, dep.name))), _jsxs(Box, { marginTop: 1, marginLeft: 4, children: [_jsx(Text, { dimColor: true, children: "Install the missing tools above, then run " }), _jsx(Text, { color: "cyan", bold: true, children: "vdl" }), _jsx(Text, { dimColor: true, children: " again." })] })] }));
}
//# sourceMappingURL=dep-error.js.map