import type { ParsedTimestamp } from '../../types/index.js';
import { InvalidInputError } from '../errors/AppError.js';

/**
 * Parses a timestamp string into total seconds.
 *
 * Accepted formats:
 *   MM:SS        e.g. 12:30  → 750s
 *   HH:MM:SS     e.g. 01:12:30 → 4350s
 *   Raw number   e.g. 90 → 90s  (interpreted as seconds)
 */
export function parseTimestamp(input: string): ParsedTimestamp {
  const trimmed = input.trim();

  // Raw number: treat as seconds
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    return { totalSeconds: seconds, raw: trimmed };
  }

  // HH:MM:SS or MM:SS
  const parts = trimmed.split(':');
  if (parts.length === 2 || parts.length === 3) {
    const nums = parts.map((p) => {
      if (!/^\d{1,2}$/.test(p)) {
        throw new InvalidInputError(
          `Invalid timestamp segment "${p}" in "${input}". Each part must be 1–2 digits.`
        );
      }
      return parseInt(p, 10);
    });

    // nums is guaranteed to have 2 or 3 elements here
    let hours = 0;
    let minutes: number;
    let seconds: number;

    if (nums.length === 3) {
      hours = nums[0]!;
      minutes = nums[1]!;
      seconds = nums[2]!;
    } else {
      minutes = nums[0]!;
      seconds = nums[1]!;
    }

    if (minutes > 59 || seconds > 59) {
      throw new InvalidInputError(
        `Timestamp "${input}" has out-of-range minutes or seconds (must be 0–59).`
      );
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return { totalSeconds, raw: trimmed };
  }

  throw new InvalidInputError(
    `Cannot parse timestamp "${input}". Use HH:MM:SS, MM:SS, or raw seconds.`
  );
}

/** Formats total seconds back into HH:MM:SS for display or ffmpeg use. */
export function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
