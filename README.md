# twdl — Twitch VOD Downloader

A command-line tool that downloads a time-range clip from a Twitch VOD in the highest available quality. No GUI, no browser extension, no login required for public VODs.

## Requirements

- **Node.js** 18 or later
- **ffmpeg** in your PATH

Install ffmpeg if you don't have it:
- **Windows:** `winget install ffmpeg` or download from https://ffmpeg.org/download.html
- **macOS:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg` (or your distro's equivalent)

## Setup

```bash
npm install
npm run build
```

## Usage

```
node dist/cli/index.js <url> -s <start> -e <end> [options]
```

Or, after `npm link`, use the shorter form:

```
twdl <url> -s <start> -e <end> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `-s, --start <timestamp>` | Start of the clip (default: `0`) |
| `-e, --end <timestamp>` | **Required.** End of the clip |
| `-o, --output <file>` | Output file path (default: auto-generated) |
| `--overwrite` | Overwrite output file if it already exists |
| `-V, --version` | Print version |
| `-h, --help` | Show help |

### Timestamp formats

All three forms are equivalent ways to express 1 hour 30 minutes:

| Format | Example |
|--------|---------|
| `HH:MM:SS` | `01:30:00` |
| `MM:SS` | `90:00` |
| Raw seconds | `5400` |

## Examples

Download minutes 5–10 of a VOD:
```bash
node dist/cli/index.js https://www.twitch.tv/videos/123456789 -s 00:05:00 -e 00:10:00
```

Download with a custom output path:
```bash
node dist/cli/index.js https://www.twitch.tv/videos/123456789 -s 01:30:00 -e 01:35:00 -o highlight.mp4
```

Download using raw seconds:
```bash
node dist/cli/index.js https://www.twitch.tv/videos/123456789 -s 3600 -e 3900
```

Overwrite an existing file:
```bash
node dist/cli/index.js https://www.twitch.tv/videos/123456789 -s 00:05:00 -e 00:10:00 --overwrite
```

### Example output

```
VOD:     123456789
Range:   00:05:00 → 00:10:00  (00:05:00)
Output:  twitch_123456789_00h05m00s_00h10m00s.mp4

Resolving playlist…
Available qualities:
   ✓  1080p60 (source) 1920x1080 — 8.1 Mbps
      720p60 1280x720 — 5.0 Mbps
      480p30 852x480 — 1.4 Mbps
      360p30 640x360 — 0.6 Mbps
      160p30 284x160 — 0.3 Mbps
      audio only  — 0.2 Mbps

Downloading: 1080p60 (source) 1920x1080 — 8.1 Mbps
[===================>] 100%  00:05:00 / 00:05:00  speed: 45x
Done.  Saved to: twitch_123456789_00h05m00s_00h10m00s.mp4
```

## How it works

1. **Token fetch** — calls the Twitch GQL API (same endpoint the web player uses) to get a signed playback token for the VOD.
2. **Playlist resolution** — uses the token to request the HLS master playlist from the Twitch Usher API (`usher.twitchapps.com`).
3. **Quality selection** — parses the master playlist and picks the highest-bandwidth video variant.
4. **Download** — runs `ffmpeg` with `-ss <start> -t <duration> -c copy`, which seeks efficiently in the HLS playlist (skipping segments before the start time) and stream-copies without re-encoding.

Output is always an `.mp4` file. The stream-copy approach is fast and lossless.

## Known limitations

- **Subscriber-only VODs** require an authenticated token. This tool uses an unauthenticated request, so subscriber-only VODs will return a 403 or an empty token.
- **Network restrictions** — the Twitch Usher API (`usher.twitchapps.com`) must be reachable from your machine. Some ISPs or corporate networks block it.
- **Clip precision** — because `-c copy` is used (no re-encoding), the actual start/end of the output may be slightly off from the requested timestamps (trimmed to the nearest keyframe boundary). This is usually within a few seconds.

## Development

```bash
npm test          # run all unit tests (vitest)
npm run build     # compile TypeScript → dist/
```

### Project structure

```
src/
  cli/            # command-line entry point
  core/
    twitch/       # GQL token fetch, VOD URL parsing, manifest resolution
    hls/          # M3U8 master playlist parser, quality selection
    ffmpeg/       # ffmpeg runner, progress bar parsing
    time/         # timestamp parsing and formatting
    output/       # output filename generation
    errors/       # shared error types
  types/          # shared TypeScript interfaces
```
