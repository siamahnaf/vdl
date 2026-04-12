import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
const items = [
    {
        label: '🎬  Video (MP4)',
        value: 'video',
    },
    {
        label: '🎵  Audio only (MP3)',
        value: 'audio',
    },
];
export default function FormatSelect({ onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { marginBottom: 0, children: [_jsx(Text, { color: "green", bold: true, children: "? " }), _jsx(Text, { bold: true, children: "Select format" })] }), _jsx(Box, { marginLeft: 2, children: _jsx(SelectInput, { items: items, onSelect: (item) => onSelect(item.value), indicatorComponent: ({ isSelected }) => (_jsx(Text, { color: "cyan", children: isSelected ? '❯ ' : '  ' })), itemComponent: ({ isSelected, label }) => (_jsx(Text, { color: isSelected ? 'cyan' : undefined, bold: isSelected, children: label })) }) })] }));
}
//# sourceMappingURL=format-select.js.map