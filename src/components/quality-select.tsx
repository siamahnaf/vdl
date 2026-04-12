import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { VideoFormat } from '../types/video.js';

interface Props {
  formats: VideoFormat[];
  title: string;
  onSelect: (format: VideoFormat) => void;
}

interface SelectItem {
  label: string;
  value: VideoFormat;
}

export default function QualitySelect({ formats, title, onSelect }: Props) {
  const items: SelectItem[] = formats.map((f) => ({
    label: f.label,
    value: f,
  }));

  return (
    <Box flexDirection="column">
      <Box marginBottom={0}>
        <Text color="green" bold>? </Text>
        <Text bold>Select quality</Text>
        <Text dimColor> — </Text>
        <Text color="yellow">{title}</Text>
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
