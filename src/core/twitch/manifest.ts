import type { VodManifest } from '../../types/index.js';
import { NetworkError, VodUnavailableError } from '../errors/AppError.js';
import { fetchVodToken } from './token.js';
import { parseMasterPlaylist } from '../hls/parser.js';
import { selectBestQuality } from '../hls/quality.js';

/**
 * Constructs the Twitch Usher API URL for a VOD master playlist.
 * The token + sig are obtained from the GQL API and authorize the request.
 */
function buildUsherUrl(vodId: string, token: string, signature: string): string {
  const params = new URLSearchParams({
    sig: signature,
    token,
    allow_source: 'true',
    allow_spectre: 'true',
    // Twitch may return a lower-res playlist if this is absent
    p: String(Math.floor(Math.random() * 9_999_999)),
  });
  return `https://usher.twitchapps.com/vod/${vodId}?${params.toString()}`;
}

/**
 * Fetches the raw master M3U8 playlist text from Twitch's CDN.
 */
async function fetchMasterPlaylist(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new NetworkError(
      `Failed to reach Twitch playlist server (usher.twitchapps.com): ` +
        `${err instanceof Error ? err.message : String(err)}. ` +
        `Check that usher.twitchapps.com is reachable from your network.`
    );
  }

  if (res.status === 403) {
    throw new VodUnavailableError(
      'Twitch returned 403 for the master playlist. ' +
        'The VOD may be subscriber-only, deleted, or region-locked.'
    );
  }

  if (res.status === 404) {
    throw new VodUnavailableError(
      'Twitch returned 404 for the master playlist. The VOD does not exist.'
    );
  }

  if (!res.ok) {
    throw new NetworkError(
      `Master playlist request failed: HTTP ${res.status} ${res.statusText}`,
      res.status
    );
  }

  return res.text();
}

/**
 * Resolves the full quality manifest for a Twitch VOD.
 *
 * Steps:
 *  1. Fetch a playback access token from Twitch's GQL API.
 *  2. Use the token to request the master M3U8 from the Usher API.
 *  3. Parse quality variants from the playlist.
 *  4. Select the best (highest bandwidth) video variant.
 */
export async function resolveVodManifest(vodId: string): Promise<VodManifest> {
  const { value: token, signature } = await fetchVodToken(vodId);
  const usherUrl = buildUsherUrl(vodId, token, signature);
  const m3u8 = await fetchMasterPlaylist(usherUrl);
  const variants = parseMasterPlaylist(m3u8);
  const best = selectBestQuality(variants);
  return { variants, best };
}
