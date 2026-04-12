#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(`
  Usage
    $ vdl [url]

  Options
    --audio, -a          Download audio only (MP3)
    --quality, -q        Select quality (e.g., 1080, 720, best)
    --set-dir <path>     Change download directory
    --update             Update vdl to latest version
    --check-update       Check if a new version is available
    --version, -v        Show version
    --help               Show help

  Examples
    $ vdl
    $ vdl https://youtube.com/watch?v=dQw4w9WgXcQ
    $ vdl https://youtube.com/watch?v=dQw4w9WgXcQ -q best --audio
    $ vdl --update
`, {
  importMeta: import.meta,
  flags: {
    audio: {
      type: 'boolean',
      shortFlag: 'a',
      default: false,
    },
    quality: {
      type: 'string',
      shortFlag: 'q',
      default: 'ask',
    },
    setDir: {
      type: 'string',
    },
    update: {
      type: 'boolean',
      default: false,
    },
    checkUpdate: {
      type: 'boolean',
      default: false,
    },
  },
});

// Handle --update
if (cli.flags.update) {
  const { performUpdate } = await import('./core/updater.js');
  await performUpdate();
  process.exit(0);
}

// Handle --check-update
if (cli.flags.checkUpdate) {
  const { checkForUpdate } = await import('./core/updater.js');
  await checkForUpdate();
  process.exit(0);
}

// Handle --set-dir
if (cli.flags.setDir) {
  const { saveConfig, loadConfig } = await import('./config/store.js');
  const config = loadConfig();
  saveConfig({ ...config, downloadDir: cli.flags.setDir });
  console.log(`✓ Download directory set to: ${cli.flags.setDir}`);
  process.exit(0);
}

const initialUrl = cli.input[0];

render(
  <App
    initialUrl={initialUrl}
    flagAudio={cli.flags.audio}
    flagQuality={cli.flags.quality}
  />
);
