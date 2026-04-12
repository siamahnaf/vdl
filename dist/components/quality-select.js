import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
export default function QualitySelect({ formats, title, onSelect }) {
    const items = formats.map((f, i) => ({
        key: `${f.formatId}-${i}`,
        label: f.label,
        value: f,
    }));
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { marginBottom: 0, children: [_jsx(Text, { color: "green", bold: true, children: "? " }), _jsx(Text, { bold: true, children: "Select quality" }), _jsx(Text, { dimColor: true, children: " \u2014 " }), _jsx(Text, { color: "yellow", children: title })] }), _jsx(Box, { marginLeft: 2, children: _jsx(SelectInput, { items: items, onSelect: (item) => onSelect(item.value), indicatorComponent: ({ isSelected }) => (_jsx(Text, { color: "cyan", children: isSelected ? '❯ ' : '  ' })), itemComponent: ({ isSelected, label }) => (_jsx(Text, { color: isSelected ? 'cyan' : undefined, bold: isSelected, children: label })) }) })] }));
}
//# sourceMappingURL=quality-select.js.map