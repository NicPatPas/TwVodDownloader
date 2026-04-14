#!/usr/bin/env node
import { Command } from 'commander';
import { existsSync } from 'fs';
import { parseVodUrl } from '../core/twitch/vodUrl.js';
import { parseTimestamp, formatTimestamp } from '../core/time/timestamp.js';
import { resolveVodManifest } from '../core/twitch/manifest.js';
import { describeVariant } from '../core/hls/quality.js';
import { checkFfmpeg, downloadSegment } from '../core/ffmpeg/runner.js';
import { generateOutputPath } from '../core/output/naming.js';
import { AppError } from '../core/errors/AppError.js';

/** Print an error and exit with code 1. */
function die(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const program = new Command();

program
  .name('twdl')
  .description('Download a clip from a Twitch VOD using a start/end timestamp.')
  .version('0.1.0')
  .argument('<url>', 'Twitch VOD URL  (https://www.twitch.tv/videos/<id>)')
  .option(
    '-s, --start <timestamp>',
    'Start of the clip  (HH:MM:SS, MM:SS, or raw seconds)',
    '0'
  )
  .requiredOption(
    '-e, --end <timestamp>',
    'End of the clip  (HH:MM:SS, MM:SS, or raw seconds)'
  )
  .option(
    '-o, --output <file>',
    'Output file path  (default: twitch_<id>_<start>_<end>.mp4 in current directory)'
  )
  .option(
    '--overwrite',
    'Overwrite the output file if it already exists',
    false
  )
  .addHelpText(
    'after',
    `
Examples:
  twdl https://www.twitch.tv/videos/123456789 -s 01:30:00 -e 01:35:00
  twdl https://www.twitch.tv/videos/123456789 -s 12:30 -e 14:00 -o clip.mp4
  twdl https://www.twitch.tv/videos/123456789 -s 3600 -e 3900 --overwrite

Timestamp formats:
  HH:MM:SS   01:30:00  (1 hour 30 minutes)
  MM:SS      12:30     (12 minutes 30 seconds)
  Seconds    5400      (raw seconds)

Notes:
  - Requires ffmpeg in your PATH.  Install: https://ffmpeg.org/download.html
  - The highest available quality is selected automatically.
  - Stream-copy is used (no re-encoding), so downloads are fast.
`
  )
  .action(
    async (
      url: string,
      options: { start: string; end: string; output?: string; overwrite: boolean }
    ) => {
      try {
        // ── 1. Validate inputs ──────────────────────────────────────────────
        checkFfmpeg();

        const vodInfo = parseVodUrl(url);
        const startTs = parseTimestamp(options.start);
        const endTs = parseTimestamp(options.end);

        if (endTs.totalSeconds <= startTs.totalSeconds) {
          die(
            `End (${formatTimestamp(endTs.totalSeconds)}) must be after ` +
              `start (${formatTimestamp(startTs.totalSeconds)}).`
          );
        }

        const startSec = startTs.totalSeconds;
        const endSec = endTs.totalSeconds;
        const durationSec = endSec - startSec;
        const outputPath =
          options.output ?? generateOutputPath(vodInfo.vodId, startSec, endSec);

        if (!options.overwrite && existsSync(outputPath)) {
          die(
            `Output file already exists: ${outputPath}\n` +
              `  Delete it, use -o to choose a different path, or pass --overwrite.`
          );
        }

        // ── 2. Resolve VOD manifest ─────────────────────────────────────────
        console.log(`VOD:     ${vodInfo.vodId}`);
        console.log(
          `Range:   ${formatTimestamp(startSec)} → ${formatTimestamp(endSec)}` +
            `  (${formatTimestamp(durationSec)})`
        );
        console.log(`Output:  ${outputPath}`);
        console.log('');
        console.log('Resolving playlist…');

        const manifest = await resolveVodManifest(vodInfo.vodId);

        console.log('Available qualities:');
        for (const v of manifest.variants) {
          const marker = v.groupId === manifest.best.groupId ? ' ✓' : '  ';
          console.log(`  ${marker} ${describeVariant(v)}`);
        }
        console.log('');

        // ── 3. Download with ffmpeg ─────────────────────────────────────────
        console.log(`Downloading: ${describeVariant(manifest.best)}`);
        await downloadSegment({
          playlistUrl: manifest.best.url,
          startSec,
          durationSec,
          outputPath,
        });

        console.log(`Done.  Saved to: ${outputPath}`);
      } catch (err) {
        if (err instanceof AppError) {
          die(err.message);
        }
        throw err;
      }
    }
  );

program.parse(process.argv);
