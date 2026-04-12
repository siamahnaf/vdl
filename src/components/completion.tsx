import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  title: string;
  outputDir: string;
  elapsed: number;
}

export default function Completion({ title, outputDir, elapsed }: Props) {
  const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
  const elapsedStr = elapsed > 60
    ? `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`
    : `${Math.round(elapsed)}s`;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="green" bold>  ✓ Download complete!</Text>
      </Box>

      <Box marginLeft={4} marginTop={0}>
        <Text dimColor>File:  </Text>
        <Text color="white" bold>{displayTitle}</Text>
      </Box>

      <Box marginLeft={4}>
        <Text dimColor>Saved: </Text>
        <Text color="cyan">{outputDir}</Text>
      </Box>

      <Box marginLeft={4}>
        <Text dimColor>Time:  </Text>
        <Text color="yellow">{elapsedStr}</Text>
      </Box>

      <Box marginTop={1} marginLeft={2}>
        <Text dimColor>{'─'.repeat(45)}</Text>
      </Box>
    </Box>
  );
}
