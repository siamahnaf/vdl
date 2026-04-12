import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  message: string;
  hint?: string;
}

export default function ErrorDisplay({ message, hint }: Props) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="red" bold>  ✗ Error: </Text>
        <Text color="red">{message}</Text>
      </Box>
      {hint && (
        <Box marginLeft={4} marginTop={0}>
          <Text dimColor>💡 {hint}</Text>
        </Box>
      )}
    </Box>
  );
}
