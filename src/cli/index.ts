import { Command } from 'commander';
import { parseVodUrl } from '../core/twitch/vodUrl.js';
import { parseTimestamp, formatTimestamp } from '../core/time/timestamp.js';
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
  .action((url: string, options: { start: string; end?: string; output?: string }) => {
    try {
      const vodInfo = parseVodUrl(url);
      const startTs = parseTimestamp(options.start);
      const endTs = options.end ? parseTimestamp(options.end) : null;

      if (endTs !== null && endTs.totalSeconds <= startTs.totalSeconds) {
        console.error(
          `Error: end timestamp (${formatTimestamp(endTs.totalSeconds)}) must be after start timestamp (${formatTimestamp(startTs.totalSeconds)}).`
        );
        process.exit(1);
      }

      console.log('VOD ID:   ', vodInfo.vodId);
      console.log('Start:    ', formatTimestamp(startTs.totalSeconds));
      if (endTs) {
        console.log('End:      ', formatTimestamp(endTs.totalSeconds));
        const durationSec = endTs.totalSeconds - startTs.totalSeconds;
        console.log('Duration: ', formatTimestamp(durationSec));
      }
      if (options.output) {
        console.log('Output:   ', options.output);
      }

      console.log('\n(Phase 1: parsing complete. Download not yet implemented.)');
    } catch (err) {
      if (err instanceof AppError) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  });

program.parse(process.argv);
