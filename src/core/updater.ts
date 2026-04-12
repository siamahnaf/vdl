import { execaCommand } from 'execa';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO = 'siamahnaf/vdl';

interface ReleaseInfo {
  tag_name: string;
  html_url: string;
}

function getCurrentVersion(): string {
  try {
    const prefix = process.env['PREFIX'] ?? join(process.env['HOME'] ?? '', '.local');
    const pkgPath = join(prefix, 'share', 'vdl', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    try {
      const dir = import.meta.dirname ?? '.';
      for (const rel of ['../..', '..', '.']) {
        try {
          const p = join(dir, rel, 'package.json');
          const pkg = JSON.parse(readFileSync(p, 'utf-8'));
          if (pkg.name === 'vdl') return pkg.version;
        } catch { /* try next */ }
      }
      return '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}

async function getLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    if (!response.ok) return null;
    return (await response.json()) as ReleaseInfo;
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export async function checkForUpdate(): Promise<void> {
  const current = getCurrentVersion();
  console.log(`  Current version: v${current}`);
  console.log('  Checking for updates...');
  console.log('');

  const release = await getLatestRelease();

  if (!release) {
    console.log('  \x1b[32m✓\x1b[0m You\'re on the latest version');
    return;
  }

  const latest = release.tag_name.replace(/^v/, '');
  const cmp = compareVersions(latest, current);

  if (cmp <= 0) {
    console.log(`  \x1b[32m✓\x1b[0m You're on the latest version (v${current})`);
  } else {
    console.log(`  New version available: \x1b[1mv${latest}\x1b[0m (current: v${current})`);
    console.log('');
    console.log('  Update with: \x1b[36mvdl --update\x1b[0m');
  }
}

export async function performUpdate(): Promise<void> {
  const current = getCurrentVersion();

  console.log('');
  console.log('  \x1b[36m\x1b[1mVDL Update\x1b[0m');
  console.log(`  \x1b[2m${'─'.repeat(40)}\x1b[0m`);
  console.log('');
  console.log(`  Current version: v${current}`);

  const release = await getLatestRelease();
  if (release) {
    const latest = release.tag_name.replace(/^v/, '');
    if (compareVersions(latest, current) <= 0) {
      console.log(`  \x1b[32m✓\x1b[0m Already on the latest version (v${current})`);
      console.log('');
      return;
    }
    console.log(`  Latest version:  v${latest}`);
  }

  console.log('');
  console.log('  \x1b[36m↓\x1b[0m Downloading latest version...');

  const prefix = process.env['PREFIX'] ?? join(process.env['HOME'] ?? '', '.local');
  const libDir = join(prefix, 'share', 'vdl');
  const tmpDir = `/tmp/vdl-update-${Date.now()}`;

  try {
    await execaCommand(
      `mkdir -p ${tmpDir} && curl -fsSL https://codeload.github.com/${REPO}/tar.gz/refs/heads/main | tar -xz -C ${tmpDir}`,
      { shell: true }
    );

    const srcDir = join(tmpDir, 'vdl-main');

    console.log('  \x1b[36m↓\x1b[0m Setting up...');
    await execaCommand('npm install --production', { cwd: srcDir, shell: true, stdio: 'ignore' });

    console.log('  \x1b[36m→\x1b[0m Installing...');
    await execaCommand(`rm -rf "${libDir}/dist" "${libDir}/node_modules" "${libDir}/package.json"`, { shell: true });
    await execaCommand(`cp -r "${srcDir}/dist" "${libDir}/dist"`, { shell: true });
    await execaCommand(`cp -r "${srcDir}/node_modules" "${libDir}/node_modules"`, { shell: true });
    await execaCommand(`cp "${srcDir}/package.json" "${libDir}/package.json"`, { shell: true });

    await execaCommand(`rm -rf "${tmpDir}"`, { shell: true });

    const newPkg = JSON.parse(readFileSync(join(libDir, 'package.json'), 'utf-8'));

    console.log('');
    console.log(`  \x1b[32m\x1b[1m✓ Updated successfully!\x1b[0m v${current} → v${newPkg.version}`);
    console.log('');
  } catch {
    await execaCommand(`rm -rf "${tmpDir}"`, { shell: true }).catch(() => {});

    console.log('');
    console.log('  \x1b[31m✗ Update failed. Please check your internet connection and try again.\x1b[0m');
    console.log('');
  }
}
