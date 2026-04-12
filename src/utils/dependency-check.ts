import { execaCommand } from 'execa';

interface DepStatus {
  name: string;
  found: boolean;
  version: string;
  installHint: string;
}

async function checkCommand(cmd: string): Promise<string | null> {
  try {
    const { stdout } = await execaCommand(`${cmd} --version`);
    return stdout.trim().split('\n')[0] ?? null;
  } catch {
    return null;
  }
}

export async function checkDependencies(): Promise<{
  allFound: boolean;
  deps: DepStatus[];
}> {
  const ytdlpVersion = await checkCommand('yt-dlp');

  const deps: DepStatus[] = [
    {
      name: 'yt-dlp',
      found: ytdlpVersion !== null,
      version: ytdlpVersion ?? '',
      installHint: 'https://github.com/yt-dlp/yt-dlp#installation',
    },
  ];

  return {
    allFound: deps.every((d) => d.found),
    deps,
  };
}
