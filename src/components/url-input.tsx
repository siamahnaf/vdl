import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
  onSubmit: (url: string) => void;
}

export default function UrlInput({ onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError('Please enter a URL');
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setError('Invalid URL. Please enter a valid URL');
      return;
    }

    setError('');
    onSubmit(trimmed);
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="green" bold>? </Text>
        <Text bold>Paste video URL: </Text>
      </Box>
      <Box marginLeft={2} marginTop={0}>
        <Text color="cyan">❯ </Text>
        <TextInput
          value={value}
          onChange={(val) => {
            setValue(val);
            if (error) setError('');
          }}
          onSubmit={handleSubmit}
          placeholder="https://youtube.com/watch?v=..."
        />
      </Box>
      {error && (
        <Box marginLeft={2} marginTop={0}>
          <Text color="red">  ✗ {error}</Text>
        </Box>
      )}
    </Box>
  );
}
