import { Command } from 'commander';
import { parseVodUrl } from '../core/twitch/vodUrl.js';
import { parseTimestamp, formatTimestamp } from '../core/time/timestamp.js';
import { resolveVodManifest } from '../core/twitch/manifest.js';
import { describeVariant } from '../core/hls/quality.js';
import { AppError } from '../core/errors/AppError.js';

const program = new Command();

program
  .name('twdl')
  .description('Download a Twitch VOD segment by time range')
  .version('0.1.0')
  .argument('<url>', 'Twitch VOD URL (e.g. https://www.twitch.tv/videos/123456789)')
  .option('-s, --start <timestamp>', 'Start timestamp (HH:MM:SS, MM:SS, or raw seconds)', '0')
  .option('-e, --end <timestamp>', 'End timestamp (HH:MM:SS, MM:SS, or raw seconds)')
  .option('-o, --output <file>', 'Output file path (default: auto-generated)')
  .action(
    async (url: string, options: { start: string; end?: string; output?: string }) => {
      try {
        // --- Parse inputs ---
        const vodInfo = parseVodUrl(url);
        const startTs = parseTimestamp(options.start);
        const endTs = options.end ? parseTimestamp(options.end) : null;

        if (endTs !== null && endTs.totalSeconds <= startTs.totalSeconds) {
          console.error(
            `Error: end (${formatTimestamp(endTs.totalSeconds)}) must be after start (${formatTimestamp(startTs.totalSeconds)}).`
          );
          process.exit(1);
        }

        console.log(`VOD ID:  ${vodInfo.vodId}`);
        console.log(`Start:   ${formatTimestamp(startTs.totalSeconds)}`);
        if (endTs) {
          const dur = endTs.totalSeconds - startTs.totalSeconds;
          console.log(`End:     ${formatTimestamp(endTs.totalSeconds)}`);
          console.log(`Length:  ${formatTimestamp(dur)}`);
        }

        // --- Resolve manifest ---
        console.log('\nResolving VOD playlist…');
        const manifest = await resolveVodManifest(vodInfo.vodId);

        console.log('\nAvailable qualities:');
        for (const v of manifest.variants) {
          const marker = v.groupId === manifest.best.groupId ? ' ✓' : '';
          console.log(`  ${describeVariant(v)}${marker}`);
        }

        console.log(`\nSelected: ${describeVariant(manifest.best)}`);
        console.log('\n(Phase 2 complete. Download not yet implemented.)');
      } catch (err) {
        if (err instanceof AppError) {
          console.error(`\nError: ${err.message}`);
          process.exit(1);
        }
        throw err;
      }
    }
  );

program.parse(process.argv);
