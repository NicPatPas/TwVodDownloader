import { spawn, execFileSync } from 'child_process';
import { FfmpegError } from '../errors/AppError.js';
import { parseFfmpegProgressLine, renderProgressLine } from './progress.js';

/**
 * Returns true if a line looks like an ffmpeg stats/progress line that we
 * simply couldn't parse (e.g. negative time during pre-roll), rather than an
 * actual error message. We don't want to surface those as user-visible errors.
 */
function isStatsLine(line: string): boolean {
  return /frame=/.test(line) || /time=-/.test(line);
}

export interface DownloadOptions {
  /** URL to the HLS media playlist (index-dvr.m3u8) */
  playlistUrl: string;
  /** Start offset in seconds */
  startSec: number;
  /** Duration in seconds to capture */
  durationSec: number;
  /** Absolute path to write the output file */
  outputPath: string;
}

/**
 * Checks that `ffmpeg` is available in PATH.
 * Throws FfmpegError with install instructions if not found.
 */
export function checkFfmpeg(): void {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    throw new FfmpegError(
      'ffmpeg not found. Install it and make sure it is in your PATH.\n' +
        '  Windows : https://ffmpeg.org/download.html (or: winget install ffmpeg)\n' +
        '  macOS   : brew install ffmpeg\n' +
        '  Linux   : sudo apt install ffmpeg  (or your distro equivalent)'
    );
  }
}

/**
 * Downloads a segment of an HLS stream with ffmpeg.
 *
 * Strategy: pass -ss (seek) before -i so ffmpeg skips playlist segments
 * that are entirely before the start time — this avoids downloading the
 * whole VOD.  -t sets the duration (not end time) and -c copy avoids
 * re-encoding, so only a demux/remux is performed.
 *
 * ffmpeg flags used:
 *   -ss <start>     seek in the input stream (pre-input = efficient for HLS)
 *   -i <url>        input HLS playlist
 *   -t <duration>   capture this many seconds of output
 *   -c copy         stream-copy (no re-encode)
 *   -movflags +faststart  place MOOV atom at front of MP4 for streaming
 *   -y              overwrite output if it already exists
 *   -loglevel ...   suppress banner, keep progress stats
 */
export async function downloadSegment(opts: DownloadOptions): Promise<void> {
  const { playlistUrl, startSec, durationSec, outputPath } = opts;

  const args = [
    '-ss', String(startSec),
    '-i', playlistUrl,
    '-t', String(durationSec),
    '-c', 'copy',
    '-movflags', '+faststart',
    '-y',
    // Keep stats output but suppress the verbose info banner
    '-loglevel', 'error',
    '-stats',
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    // ffmpeg writes its progress stats to stderr
    let stderrBuf = '';

    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (chunk: string) => {
      stderrBuf += chunk;

      // Process complete lines; the progress line ends with \r (not \n)
      const lines = stderrBuf.split(/[\r\n]/);
      stderrBuf = lines.pop() ?? '';

      for (const line of lines) {
        const progress = parseFfmpegProgressLine(line);
        if (progress) {
          const bar = renderProgressLine(progress.timeSec, durationSec, progress.speed);
          process.stderr.write(`\r${bar}`);
        } else if (line.trim() && !isStatsLine(line)) {
          // Actual ffmpeg warning/error — print on its own line so it doesn't
          // get swallowed silently, but separate it from the progress bar.
          process.stderr.write(`\n${line}\n`);
        }
      }
    });

    proc.on('error', (err) => {
      reject(new FfmpegError(`Failed to launch ffmpeg: ${err.message}`));
    });

    proc.on('close', (code) => {
      // Flush any content that didn't end with a newline/CR
      if (stderrBuf.trim()) {
        const progress = parseFfmpegProgressLine(stderrBuf);
        if (progress) {
          process.stderr.write(
            `\r${renderProgressLine(progress.timeSec, durationSec, progress.speed)}`
          );
        }
      }
      // Move past the progress bar line
      process.stderr.write('\n');

      if (code === 0) {
        resolve();
      } else {
        reject(new FfmpegError(`ffmpeg exited with code ${code}`, code));
      }
    });
  });
}
