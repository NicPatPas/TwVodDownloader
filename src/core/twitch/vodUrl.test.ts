import { describe, it, expect } from 'vitest';
import { parseVodUrl } from './vodUrl.js';
import { InvalidInputError } from '../errors/AppError.js';

describe('parseVodUrl', () => {
  it('extracts VOD ID from a standard URL', () => {
    const result = parseVodUrl('https://www.twitch.tv/videos/123456789');
    expect(result.vodId).toBe('123456789');
  });

  it('handles twitch.tv without www', () => {
    const result = parseVodUrl('https://twitch.tv/videos/987654321');
    expect(result.vodId).toBe('987654321');
  });

  it('strips query parameters (e.g. ?t=1h2m3s) cleanly', () => {
    const result = parseVodUrl('https://www.twitch.tv/videos/123456789?t=1h2m3s');
    expect(result.vodId).toBe('123456789');
  });

  it('preserves the original URL', () => {
    const url = 'https://www.twitch.tv/videos/123456789';
    expect(parseVodUrl(url).originalUrl).toBe(url);
  });

  it('rejects a non-Twitch URL', () => {
    expect(() => parseVodUrl('https://youtube.com/watch?v=abc')).toThrow(InvalidInputError);
  });

  it('rejects a Twitch channel URL (not a VOD)', () => {
    expect(() => parseVodUrl('https://www.twitch.tv/some_streamer')).toThrow(InvalidInputError);
  });

  it('rejects a completely invalid URL', () => {
    expect(() => parseVodUrl('not-a-url')).toThrow(InvalidInputError);
  });
});
