import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
export default function UrlInput({ onSubmit }) {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const handleSubmit = (input) => {
        const trimmed = input.trim();
        if (!trimmed) {
            setError('Please enter a URL');
            return;
        }
        try {
            new URL(trimmed);
        }
        catch {
            setError('Invalid URL. Please enter a valid URL');
            return;
        }
        setError('');
        onSubmit(trimmed);
    };
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { children: [_jsx(Text, { color: "green", bold: true, children: "? " }), _jsx(Text, { bold: true, children: "Paste video URL: " })] }), _jsxs(Box, { marginLeft: 2, marginTop: 0, children: [_jsx(Text, { color: "cyan", children: "\u276F " }), _jsx(TextInput, { value: value, onChange: (val) => {
                            setValue(val);
                            if (error)
                                setError('');
                        }, onSubmit: handleSubmit, placeholder: "https://youtube.com/watch?v=..." })] }), error && (_jsx(Box, { marginLeft: 2, marginTop: 0, children: _jsxs(Text, { color: "red", children: ["  \u2717 ", error] }) }))] }));
}
//# sourceMappingURL=url-input.js.map