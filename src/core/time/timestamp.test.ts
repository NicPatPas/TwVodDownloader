import { describe, it, expect } from 'vitest';
import { parseTimestamp, formatTimestamp } from './timestamp.js';
import { InvalidInputError } from '../errors/AppError.js';

describe('parseTimestamp', () => {
  it('parses MM:SS', () => {
    expect(parseTimestamp('12:30').totalSeconds).toBe(750);
  });

  it('parses HH:MM:SS', () => {
    expect(parseTimestamp('01:12:30').totalSeconds).toBe(4350);
  });

  it('parses raw seconds', () => {
    expect(parseTimestamp('90').totalSeconds).toBe(90);
  });

  it('parses zero', () => {
    expect(parseTimestamp('0').totalSeconds).toBe(0);
    expect(parseTimestamp('00:00').totalSeconds).toBe(0);
    expect(parseTimestamp('00:00:00').totalSeconds).toBe(0);
  });

  it('preserves the raw string', () => {
    expect(parseTimestamp('01:30').raw).toBe('01:30');
  });

  it('rejects out-of-range seconds', () => {
    expect(() => parseTimestamp('00:60')).toThrow(InvalidInputError);
  });

  it('rejects out-of-range minutes', () => {
    expect(() => parseTimestamp('60:00')).toThrow(InvalidInputError);
  });

  it('rejects garbage input', () => {
    expect(() => parseTimestamp('abc')).toThrow(InvalidInputError);
  });

  it('rejects partial-colon input', () => {
    expect(() => parseTimestamp('1:2:3:4')).toThrow(InvalidInputError);
  });
});

describe('formatTimestamp', () => {
  it('formats zero', () => {
    expect(formatTimestamp(0)).toBe('00:00:00');
  });

  it('formats under an hour', () => {
    expect(formatTimestamp(750)).toBe('00:12:30');
  });

  it('formats over an hour', () => {
    expect(formatTimestamp(4350)).toBe('01:12:30');
  });
});
