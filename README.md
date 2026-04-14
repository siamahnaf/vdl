<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/siamahnaf/assets-kit/main/logo/logo-white.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/siamahnaf/assets-kit/main/logo/logo-black.png">
  <img alt="Siam Ahnaf" src="https://raw.githubusercontent.com/siamahnaf/assets-kit/main/logo/logo-black.png" height="auto" width="240">
</picture>

# VDL — Video Downloader CLI

Beautiful interactive CLI for downloading videos and audio from any social media platform.

```
  ╦  ╦╔╦╗╦
  ╚╗╔╝ ║║║
   ╚╝ ═╩╝╩═╝
```

## Features

- **Interactive UI** — Beautiful terminal interface with spinners, progress bars, and colored output
- **Any platform** — YouTube, Instagram, TikTok, Twitter/X, Facebook, and 1000+ more sites
- **Quality selection** — Choose from all available video qualities
- **Video or Audio** — Download as MP4 video or extract audio as MP3
- **m3u8/HLS support** — Download HLS streams from streaming sites
- **Cross-platform** — Works on macOS, Linux, and Windows

## Prerequisites

Make sure these are installed before running the install command:

| Tool | Minimum | Download |
|------|---------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Python | **3.10+** | [python.org](https://python.org) |

> **Note:** macOS ships with Python 3.9 by default which is not supported. Install Python 3.10 or newer from [python.org](https://python.org) before running the installer.

## Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/siamahnaf/vdl/main/scripts/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/siamahnaf/vdl/main/scripts/install.ps1 | iex
```

## Usage

```bash
# Interactive mode — full guided experience
vdl

# Direct URL — skip the URL prompt
vdl https://youtube.com/watch?v=dQw4w9WgXcQ

# Download audio only
vdl https://youtube.com/watch?v=dQw4w9WgXcQ --audio

# Select specific quality
vdl https://youtube.com/watch?v=dQw4w9WgXcQ -q 1080

# Best quality, no prompts
vdl https://youtube.com/watch?v=dQw4w9WgXcQ -q best

# Change download directory
vdl --set-dir ~/Videos

# Update to latest version
vdl --update
```

## How It Works

1. Run `vdl` — prompted for URL (or pass it as argument)
2. CLI analyzes the URL and fetches all available qualities
3. Select your preferred quality from the interactive list
4. Choose format — Video (MP4) or Audio (MP3)
5. Watch the beautiful download progress bar
6. Done! File saved to your download directory

## Uninstall

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/siamahnaf/vdl/main/scripts/uninstall.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/siamahnaf/vdl/main/scripts/uninstall.ps1 | iex
```

## License

MIT — Siam Ahnaf
