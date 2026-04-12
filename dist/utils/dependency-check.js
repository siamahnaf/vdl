import { execaCommand } from 'execa';
async function checkCommand(cmd) {
    try {
        const { stdout } = await execaCommand(`${cmd} --version`);
        return stdout.trim().split('\n')[0] ?? null;
    }
    catch {
        return null;
    }
}
export async function checkDependencies() {
    const ytdlpVersion = await checkCommand('yt-dlp');
    const deps = [
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
//# sourceMappingURL=dependency-check.js.map