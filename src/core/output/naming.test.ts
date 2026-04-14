import { describe, it, expect } from 'vitest';
import { generateOutputPath } from './naming.js';

describe('generateOutputPath', () => {
  it('produces a .mp4 filename', () => {
    const p = generateOutputPath('123456789', 300, 600);
    expect(p).toMatch(/\.mp4$/);
  });

  it('includes the VOD ID', () => {
    const p = generateOutputPath('123456789', 300, 600);
    expect(p).toContain('123456789');
  });

  it('encodes start and end without colons (Windows-safe)', () => {
    const p = generateOutputPath('123', 3600, 7200);
    expect(p).not.toContain(':');
    expect(p).toContain('01h00m00s');
    expect(p).toContain('02h00m00s');
  });

  it('zero-pads single-digit values', () => {
    const p = generateOutputPath('1', 65, 130); // 65s = 0h01m05s
    expect(p).toContain('00h01m05s');
    expect(p).toContain('00h02m10s');
  });

  it('respects a custom directory', () => {
    const dir = 'my_downloads';
    const p = generateOutputPath('abc', 0, 60, dir);
    // Use path.sep-agnostic check: the path must contain the dir name
    expect(p).toContain(dir);
  });
});
