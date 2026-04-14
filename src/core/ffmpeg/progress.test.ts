import { describe, it, expect } from 'vitest';
import { parseFfmpegProgressLine, renderProgressLine } from './progress.js';

describe('parseFfmpegProgressLine', () => {
  const SAMPLE =
    'frame=  100 fps= 50 q=-1.0 size=    256kB time=00:02:30.50 bitrate= 512.0kbits/s speed=2.10x    ';

  it('parses time as total seconds', () => {
    const result = parseFfmpegProgressLine(SAMPLE);
    expect(result).not.toBeNull();
    // 2*60 + 30 + 0.5 = 150.5
    expect(result!.timeSec).toBeCloseTo(150.5);
  });

  it('parses speed string', () => {
    const result = parseFfmpegProgressLine(SAMPLE);
    expect(result!.speed).toBe('2.10x');
  });

  it('returns null for lines without a time= field', () => {
    expect(parseFfmpegProgressLine('ffmpeg version 6.0 Copyright...')).toBeNull();
  });

  it('handles HH:MM:SS with hours', () => {
    const line = 'time=01:05:00.00 speed=1x';
    const result = parseFfmpegProgressLine(line);
    expect(result!.timeSec).toBeCloseTo(3900);
  });

  it('returns null speed when field is absent', () => {
    const result = parseFfmpegProgressLine('time=00:01:00.00');
    expect(result!.speed).toBeNull();
  });
});

describe('renderProgressLine', () => {
  it('shows 0% at start', () => {
    const line = renderProgressLine(0, 300, null);
    expect(line).toContain('  0%');
  });

  it('shows 50% at halfway', () => {
    const line = renderProgressLine(150, 300, null);
    expect(line).toContain(' 50%');
  });

  it('shows 100% at end', () => {
    const line = renderProgressLine(300, 300, null);
    expect(line).toContain('100%');
  });

  it('includes speed when provided', () => {
    const line = renderProgressLine(150, 300, '2.10x');
    expect(line).toContain('2.10x');
  });

  it('does not exceed 100% for over-run', () => {
    const line = renderProgressLine(400, 300, null);
    expect(line).toContain('100%');
  });
});
