import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

export type PlaylistChoice = 'single' | 'playlist';

interface Props {
  onSelect: (choice: PlaylistChoice) => void;
}

const items = [
  {
    key: 'single',
    label: '🎬  This video only',
    value: 'single' as PlaylistChoice,
  },
  {
    key: 'playlist',
    label: '📋  Entire playlist',
    value: 'playlist' as PlaylistChoice,
  },
];

export default function PlaylistSelect({ onSelect }: Props) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={0}>
        <Text color="green" bold>? </Text>
        <Text bold>This URL contains a playlist. What would you like to download?</Text>
      </Box>
      <Box marginLeft={2}>
        <SelectInput
          items={items}
          onSelect={(item) => onSelect(item.value)}
          indicatorComponent={({ isSelected }) => (
            <Text color="cyan">{isSelected ? '❯ ' : '  '}</Text>
          )}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
              {label}
            </Text>
          )}
        />
      </Box>
    </Box>
  );
}
