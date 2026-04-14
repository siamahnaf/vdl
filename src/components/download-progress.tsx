import type React from 'react';
import { Box, Text } from 'ink';
import type { DownloadProgress as ProgressData } from '../types/video.js';

interface Props {
  progress: ProgressData;
  title: string;
  isStream?: boolean;
}

function ProgressBar({ percent, width = 35 }: { percent: number; width?: number }) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  let color: string;
  if (percent >= 100) color = 'green';
  else if (percent >= 60) color = 'cyan';
  else if (percent >= 30) color = 'blue';
  else color = 'magenta';

  return (
    <Text color={color}>{bar}</Text>
  );
}

function StreamBar({ width = 35 }: { width?: number }) {
  const bar = '▓'.repeat(width);
  return <Text color="cyan">{bar}</Text>;
}

function StatusBadge({ status }: { status: ProgressData['status'] }) {
  switch (status) {
    case 'downloading':
      return <Text color="cyan" bold> ↓ DOWNLOADING</Text>;
    case 'merging':
      return <Text color="yellow" bold> ⟳ MERGING</Text>;
    case 'converting':
      return <Text color="yellow" bold> ⟳ CONVERTING</Text>;
    case 'complete':
      return <Text color="green" bold> ✓ COMPLETE</Text>;
    case 'error':
      return <Text color="red" bold> ✗ ERROR</Text>;
  }
}

export default function DownloadProgressView({ progress, title, isStream = false }: Props) {
  const displayTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box>
        <StatusBadge status={progress.status} />
      </Box>

      <Box marginTop={0} marginLeft={1}>
        <Text dimColor>  File: </Text>
        <Text color="white" bold>{displayTitle}</Text>
      </Box>

      {/* Progress bar — show real % if available, streaming bar only as fallback */}
      <Box marginLeft={1} marginTop={1}>
        <Text>  </Text>
        {isStream && progress.percent <= 0 ? (
          <>
            <StreamBar />
            <Text bold color="cyan"> streaming</Text>
          </>
        ) : (
          <>
            <ProgressBar percent={progress.percent} />
            <Text bold color="white"> {progress.percent.toFixed(1)}%</Text>
          </>
        )}
      </Box>

      {/* Stats row */}
      <Box marginLeft={1} marginTop={0}>
        <Text>  </Text>
        {progress.speed && (
          <Box marginRight={2}>
            <Text dimColor>Speed: </Text>
            <Text color="green" bold>{progress.speed}</Text>
          </Box>
        )}
        {progress.downloaded && (
          <Box marginRight={2}>
            <Text dimColor>{isStream ? 'Downloaded: ' : 'Downloaded: '}</Text>
            <Text color="yellow" bold>{progress.downloaded}</Text>
          </Box>
        )}
        {progress.eta && progress.eta !== '00:00' && (
          <Box marginRight={2}>
            <Text dimColor>ETA: </Text>
            <Text color="yellow" bold>{progress.eta}</Text>
          </Box>
        )}
        {progress.total && (
          <Box>
            <Text dimColor>Size: </Text>
            <Text color="magenta" bold>{progress.total}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
