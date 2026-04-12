import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { VdlConfig, DEFAULT_CONFIG } from '../types/config.js';

function getConfigDir(): string {
  if (process.platform === 'win32') {
    return join(process.env['LOCALAPPDATA'] ?? join(homedir(), 'AppData', 'Local'), 'vdl');
  }
  return join(homedir(), '.config', 'vdl');
}

function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

export function getDefaultDownloadDir(): string {
  return join(homedir(), 'Downloads');
}

export function loadConfig(): VdlConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Partial<VdlConfig>): void {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const current = loadConfig();
  const merged = { ...current, ...config };
  writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}
