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
  // ffmpeg is bundled via ffmpeg-static npm package — no system check needed.
  // Only yt-dlp needs to be on the system (installed via pip3).

  const ytdlpVersion = await checkCommand('yt-dlp');

  const deps: DepStatus[] = [
    {
      name: 'yt-dlp',
      found: ytdlpVersion !== null,
      version: ytdlpVersion ?? '',
      installHint: 'pip3 install yt-dlp',
    },
  ];

  return {
    allFound: deps.every((d) => d.found),
    deps,
  };
}
