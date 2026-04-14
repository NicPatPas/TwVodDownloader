/**
 * Parses a `time=HH:MM:SS.ss` value out of a ffmpeg stderr progress line.
 * Returns total seconds, or null if the pattern is not found.
 *
 * Example line:
 *   frame=  100 fps= 50 q=-1.0 size=    256kB time=00:02:30.50 bitrate= 512.0kbits/s speed=2x
 */
export function parseFfmpegProgressLine(line: string): { timeSec: number; speed: string | null } | null {
  const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d+)/);
  if (!timeMatch) return null;

  const h = parseInt(timeMatch[1]!, 10);
  const m = parseInt(timeMatch[2]!, 10);
  const s = parseInt(timeMatch[3]!, 10);
  const frac = parseFloat(`0.${timeMatch[4]!}`);
  const timeSec = h * 3600 + m * 60 + s + frac;

  const speedMatch = line.match(/speed=\s*(\S+)/);
  const speed = speedMatch ? speedMatch[1]! : null;

  return { timeSec, speed };
}

/**
 * Renders a compact single-line progress string suitable for \r overwriting.
 *
 * Example:  [========>           ] 42%  00:02:06 / 00:05:00  speed: 2.10x
 */
export function renderProgressLine(currentSec: number, totalSec: number, speed: string | null): string {
  const pct = totalSec > 0 ? Math.min(100, Math.floor((currentSec / totalSec) * 100)) : 0;

  const BAR_WIDTH = 20;
  const filled = Math.floor((pct / 100) * BAR_WIDTH);
  const bar =
    '='.repeat(filled) +
    (filled < BAR_WIDTH ? '>' : '') +
    ' '.repeat(Math.max(0, BAR_WIDTH - filled - 1));

  const current = fmtSec(currentSec);
  const total = fmtSec(totalSec);
  const speedStr = speed ? `  speed: ${speed}` : '';

  return `[${bar}] ${String(pct).padStart(3)}%  ${current} / ${total}${speedStr}`;
}

function fmtSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
