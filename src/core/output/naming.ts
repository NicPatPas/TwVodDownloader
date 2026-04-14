import { join } from 'path';

/**
 * Generates a default output filename for a VOD segment.
 *
 * Format: twitch_<vodId>_<start>_<end>.mp4
 * Example: twitch_123456789_00h05m00s_00h10m00s.mp4
 *
 * Colons are avoided in the filename for Windows compatibility.
 */
export function generateOutputPath(
  vodId: string,
  startSec: number,
  endSec: number,
  dir = '.'
): string {
  const start = secsToFileSafe(startSec);
  const end = secsToFileSafe(endSec);
  const filename = `twitch_${vodId}_${start}_${end}.mp4`;
  return join(dir, filename);
}

function secsToFileSafe(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}h${pad(m)}m${pad(s)}s`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
