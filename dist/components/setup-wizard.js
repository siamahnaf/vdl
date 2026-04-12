import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getDefaultDownloadDir } from '../config/store.js';
export default function SetupWizard({ onComplete }) {
    const defaultDir = getDefaultDownloadDir();
    const [value, setValue] = useState('');
    const handleSubmit = (input) => {
        const dir = input.trim() || defaultDir;
        onComplete(dir);
    };
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2699 " }), _jsx(Text, { bold: true, children: "First-time setup" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "green", bold: true, children: "? " }), _jsx(Text, { bold: true, children: "Where should videos be saved?" })] }), _jsxs(Box, { marginLeft: 2, children: [_jsx(Text, { color: "cyan", children: "\u276F " }), _jsx(TextInput, { value: value, onChange: setValue, onSubmit: handleSubmit, placeholder: defaultDir })] }), _jsx(Box, { marginLeft: 4, marginTop: 0, children: _jsxs(Text, { dimColor: true, children: ["Press Enter for default: ", defaultDir] }) })] }));
}
//# sourceMappingURL=setup-wizard.js.map