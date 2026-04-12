import React from 'react';
import { Box, Text } from 'ink';

interface DepInfo {
  name: string;
  found: boolean;
  installHint: string;
}

interface Props {
  deps: DepInfo[];
}

export default function DepError({ deps }: Props) {
  const missing = deps.filter((d) => !d.found);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <Text color="red" bold>  ✗ Some required tools are missing</Text>
      </Box>

      {missing.map((dep) => (
        <Box key={dep.name} flexDirection="column" marginLeft={4} marginTop={1}>
          <Box>
            <Text color="red">✗ </Text>
            <Text bold>{dep.name}</Text>
            <Text dimColor> — not installed</Text>
          </Box>
          <Box marginLeft={2}>
            <Text dimColor>To install, visit: </Text>
            <Text color="cyan">{dep.installHint}</Text>
          </Box>
        </Box>
      ))}

      <Box marginTop={1} marginLeft={4}>
        <Text dimColor>Install the missing tools above, then run </Text>
        <Text color="cyan" bold>vdl</Text>
        <Text dimColor> again.</Text>
      </Box>
    </Box>
  );
}
