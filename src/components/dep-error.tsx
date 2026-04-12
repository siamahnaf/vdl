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
        <Text color="red" bold>  ✗ Missing dependencies</Text>
      </Box>
      <Box marginLeft={4} marginTop={0}>
        <Text dimColor>The following tools are required. Install them and run vdl again:</Text>
      </Box>

      {missing.map((dep) => (
        <Box key={dep.name} flexDirection="column" marginLeft={4} marginTop={1}>
          <Box>
            <Text color="red">✗ </Text>
            <Text bold>{dep.name}</Text>
            <Text dimColor> not found</Text>
          </Box>
          <Box marginLeft={2}>
            <Text dimColor>Install: </Text>
            <Text color="yellow">{dep.installHint}</Text>
          </Box>
        </Box>
      ))}

      <Box marginTop={1} marginLeft={4}>
        <Text dimColor>Or re-run the installer to auto-install them:</Text>
      </Box>
      <Box marginLeft={6}>
        <Text color="cyan">curl -fsSL https://raw.githubusercontent.com/siamahnaf/vdl/main/scripts/install.sh | bash</Text>
      </Box>
    </Box>
  );
}
