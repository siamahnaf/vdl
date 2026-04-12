import React from 'react';
import { Box, Text } from 'ink';

const LOGO = `
 ╦  ╦╔╦╗╦
 ╚╗╔╝ ║║║
  ╚╝ ═╩╝╩═╝`;

export default function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color="cyan" bold>{LOGO}</Text>
      </Box>
      <Box marginLeft={1}>
        <Text dimColor>Video Downloader — </Text>
        <Text color="gray">Download from any platform</Text>
      </Box>
      <Box marginLeft={1} marginTop={0}>
        <Text dimColor>{'─'.repeat(45)}</Text>
      </Box>
    </Box>
  );
}
