import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

export type MediaFormat = 'video' | 'audio';

interface Props {
  onSelect: (format: MediaFormat) => void;
}

const items = [
  {
    label: '🎬  Video (MP4)',
    value: 'video' as MediaFormat,
  },
  {
    label: '🎵  Audio only (MP3)',
    value: 'audio' as MediaFormat,
  },
];

export default function FormatSelect({ onSelect }: Props) {
  return (
    <Box flexDirection="column">
      <Box marginBottom={0}>
        <Text color="green" bold>? </Text>
        <Text bold>Select format</Text>
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
