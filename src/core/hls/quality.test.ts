import { describe, it, expect } from 'vitest';
import { selectBestQuality, describeVariant } from './quality.js';
import type { QualityVariant } from '../../types/index.js';
import { AppError } from '../errors/AppError.js';

const makeVariant = (overrides: Partial<QualityVariant>): QualityVariant => ({
  groupId: 'chunked',
  name: '1080p60 (source)',
  bandwidth: 8_000_000,
  resolution: '1920x1080',
  frameRate: 60,
  url: 'https://example.com/chunked/index-dvr.m3u8',
  ...overrides,
});

const VARIANTS: QualityVariant[] = [
  makeVariant({ groupId: '480p30', name: '480p30', bandwidth: 1_400_000, resolution: '852x480', frameRate: 30 }),
  makeVariant({ groupId: 'chunked', name: '1080p60 (source)', bandwidth: 8_100_000, resolution: '1920x1080', frameRate: 60 }),
  makeVariant({ groupId: '720p60', name: '720p60', bandwidth: 5_000_000, resolution: '1280x720', frameRate: 60 }),
  makeVariant({ groupId: 'audio_only', name: 'audio only', bandwidth: 192_000, resolution: null, frameRate: null }),
];

describe('selectBestQuality', () => {
  it('returns the highest-bandwidth video variant', () => {
    const best = selectBestQuality(VARIANTS);
    expect(best.groupId).toBe('chunked');
    expect(best.bandwidth).toBe(8_100_000);
  });

  it('filters out audio-only streams', () => {
    const best = selectBestQuality(VARIANTS);
    expect(best.groupId).not.toBe('audio_only');
  });

  it('works with a single video variant', () => {
    const best = selectBestQuality([makeVariant({})]);
    expect(best.groupId).toBe('chunked');
  });

  it('throws AppError when only audio variants are present', () => {
    const audioOnly = [
      makeVariant({ groupId: 'audio_only', name: 'audio only' }),
    ];
    expect(() => selectBestQuality(audioOnly)).toThrow(AppError);
  });

  it('throws AppError on empty input', () => {
    expect(() => selectBestQuality([])).toThrow(AppError);
  });

  it('does not mutate the input array', () => {
    const copy = [...VARIANTS];
    selectBestQuality(VARIANTS);
    expect(VARIANTS).toEqual(copy);
  });
});

describe('describeVariant', () => {
  it('includes name, resolution and Mbps', () => {
    const v = makeVariant({ bandwidth: 8_100_000, resolution: '1920x1080', name: '1080p60 (source)' });
    const desc = describeVariant(v);
    expect(desc).toContain('1080p60 (source)');
    expect(desc).toContain('1920x1080');
    expect(desc).toContain('Mbps');
  });

  it('omits resolution when null', () => {
    const v = makeVariant({ resolution: null, name: 'audio only' });
    const desc = describeVariant(v);
    expect(desc).not.toMatch(/\d+x\d+/);
  });
});
