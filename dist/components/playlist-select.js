import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
const items = [
    {
        key: 'single',
        label: '🎬  This video only',
        value: 'single',
    },
    {
        key: 'playlist',
        label: '📋  Entire playlist',
        value: 'playlist',
    },
];
export default function PlaylistSelect({ onSelect }) {
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { marginBottom: 0, children: [_jsx(Text, { color: "green", bold: true, children: "? " }), _jsx(Text, { bold: true, children: "This URL contains a playlist. What would you like to download?" })] }), _jsx(Box, { marginLeft: 2, children: _jsx(SelectInput, { items: items, onSelect: (item) => onSelect(item.value), indicatorComponent: ({ isSelected }) => (_jsx(Text, { color: "cyan", children: isSelected ? '❯ ' : '  ' })), itemComponent: ({ isSelected, label }) => (_jsx(Text, { color: isSelected ? 'cyan' : undefined, bold: isSelected, children: label })) }) })] }));
}
//# sourceMappingURL=playlist-select.js.map