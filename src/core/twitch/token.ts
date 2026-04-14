import { NetworkError, VodUnavailableError } from '../errors/AppError.js';

/**
 * The Twitch web-player client ID. This is a well-known public value embedded
 * in the Twitch web player and used by many open-source Twitch tools.
 * It is NOT a secret — it identifies the "web player" client to Twitch's API.
 * If requests start failing, check whether this value has been rotated.
 */
const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

interface PlaybackAccessToken {
  value: string;
  signature: string;
}

interface GqlResponse {
  data?: {
    videoPlaybackAccessToken?: PlaybackAccessToken | null;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Fetches the Twitch playback access token for a VOD.
 * This token + signature pair is required to construct an authenticated
 * URL for the Twitch Usher API (master playlist endpoint).
 *
 * Uses the unofficial Twitch GQL API — the same endpoint the Twitch web player
 * uses. Subscriber-only or deleted VODs will result in a VodUnavailableError.
 */
export async function fetchVodToken(vodId: string): Promise<PlaybackAccessToken> {
  const body = {
    operationName: 'PlaybackAccessToken_Template',
    // Full query string — more stable than relying on a persisted query hash
    query: `query PlaybackAccessToken_Template(
      $login: String!
      $isLive: Boolean!
      $vodID: ID!
      $isVod: Boolean!
      $playerType: String!
    ) {
      streamPlaybackAccessToken(
        channelName: $login
        params: { platform: "web", playerBackend: "mediaplayer", playerType: $playerType }
      ) @include(if: $isLive) {
        value
        signature
        __typename
      }
      videoPlaybackAccessToken(
        id: $vodID
        params: { platform: "web", playerBackend: "mediaplayer", playerType: $playerType }
      ) @include(if: $isVod) {
        value
        signature
        __typename
      }
    }`,
    variables: {
      isLive: false,
      login: '',
      isVod: true,
      vodID: vodId,
      playerType: 'site',
    },
  };

  let res: Response;
  try {
    res = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: {
        'Client-Id': TWITCH_CLIENT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new NetworkError(
      `Failed to reach Twitch GQL API: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok) {
    throw new NetworkError(
      `Twitch GQL API returned HTTP ${res.status} ${res.statusText}`,
      res.status
    );
  }

  const json = (await res.json()) as GqlResponse;

  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new VodUnavailableError(`Twitch API error: ${msg}`);
  }

  const token = json.data?.videoPlaybackAccessToken;
  if (!token) {
    throw new VodUnavailableError(
      `No playback token returned for VOD ${vodId}. ` +
        `The VOD may be deleted, subscriber-only, or otherwise unavailable.`
    );
  }

  return token;
}
