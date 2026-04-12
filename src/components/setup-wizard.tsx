import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { getDefaultDownloadDir } from '../config/store.js';

interface Props {
  onComplete: (downloadDir: string) => void;
}

export default function SetupWizard({ onComplete }: Props) {
  const defaultDir = getDefaultDownloadDir();
  const [value, setValue] = useState('');

  const handleSubmit = (input: string) => {
    const dir = input.trim() || defaultDir;
    onComplete(dir);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="yellow" bold>⚙ </Text>
        <Text bold>First-time setup</Text>
      </Box>

      <Box>
        <Text color="green" bold>? </Text>
        <Text bold>Where should videos be saved?</Text>
      </Box>

      <Box marginLeft={2}>
        <Text color="cyan">❯ </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={defaultDir}
        />
      </Box>

      <Box marginLeft={4} marginTop={0}>
        <Text dimColor>Press Enter for default: {defaultDir}</Text>
      </Box>
    </Box>
  );
}
