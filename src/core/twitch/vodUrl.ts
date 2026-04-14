import type { VodInfo } from '../../types/index.js';
import { InvalidInputError } from '../errors/AppError.js';

/**
 * Extracts the VOD ID from a Twitch VOD URL.
 *
 * Supported formats:
 *   https://www.twitch.tv/videos/123456789
 *   https://twitch.tv/videos/123456789
 *   https://www.twitch.tv/videos/123456789?t=1h2m3s
 */
export function parseVodUrl(rawUrl: string): VodInfo {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new InvalidInputError(`"${rawUrl}" is not a valid URL.`);
  }

  const isTwitch =
    url.hostname === 'www.twitch.tv' || url.hostname === 'twitch.tv';

  if (!isTwitch) {
    throw new InvalidInputError(
      `URL hostname "${url.hostname}" is not twitch.tv. Only Twitch VOD URLs are supported.`
    );
  }

  // Path should be /videos/<id>
  const match = url.pathname.match(/^\/videos\/(\d+)\/?$/);
  if (!match || !match[1]) {
    throw new InvalidInputError(
      `Could not extract a VOD ID from the path "${url.pathname}". Expected format: /videos/<id>.`
    );
  }

  return {
    vodId: match[1],
    originalUrl: rawUrl.trim(),
  };
}
