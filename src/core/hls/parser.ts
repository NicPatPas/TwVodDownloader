import type { QualityVariant } from '../../types/index.js';
import { PlaylistParseError } from '../errors/AppError.js';

/**
 * Parses an HLS attribute list string into a key→value map.
 *
 * Example input:  BANDWIDTH=8111528,CODECS="avc1.64002A,mp4a.40.2",RESOLUTION=1920x1080
 * Handles both quoted and unquoted values.
 */
function parseAttributeList(attrString: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Matches: KEY="quoted value"  or  KEY=unquoted-value
  // Stops at the next comma+KEY= boundary to avoid splitting quoted commas wrongly
  const regex = /([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(attrString)) !== null) {
    const key = m[1]!;
    // quoted value is group 2, unquoted is group 3
    result[key] = m[2] !== undefined ? m[2] : (m[3] ?? '');
  }
  return result;
}

/**
 * Parses a Twitch HLS master playlist string into an array of QualityVariants.
 *
 * Expected playlist structure (Twitch-specific):
 *   - One #EXT-X-MEDIA line per quality (provides the human-readable NAME)
 *   - One #EXT-X-STREAM-INF line + URL line per quality variant
 *
 * The VIDEO attribute on EXT-X-STREAM-INF matches the GROUP-ID on EXT-X-MEDIA,
 * which is how we map variants to their friendly names.
 */
export function parseMasterPlaylist(m3u8: string): QualityVariant[] {
  const lines = m3u8.split('\n').map((l) => l.trim()).filter(Boolean);

  if (!lines[0]?.startsWith('#EXTM3U')) {
    throw new PlaylistParseError('Content does not appear to be a valid M3U8 playlist.');
  }

  // First pass: build groupId → human name map from EXT-X-MEDIA lines
  const groupNames: Record<string, string> = {};
  for (const line of lines) {
    if (!line.startsWith('#EXT-X-MEDIA:')) continue;
    const attrs = parseAttributeList(line.slice('#EXT-X-MEDIA:'.length));
    if (attrs['GROUP-ID'] && attrs['NAME']) {
      groupNames[attrs['GROUP-ID']] = attrs['NAME'];
    }
  }

  // Second pass: pair each EXT-X-STREAM-INF with the URL on the next non-comment line
  const variants: QualityVariant[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.startsWith('#EXT-X-STREAM-INF:')) continue;

    const attrs = parseAttributeList(line.slice('#EXT-X-STREAM-INF:'.length));

    // Find the next non-comment, non-empty line — this is the stream URL
    let url: string | null = null;
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j]!.startsWith('#')) {
        url = lines[j]!;
        break;
      }
    }

    if (!url) {
      throw new PlaylistParseError(
        `EXT-X-STREAM-INF at line ${i + 1} has no following URL.`
      );
    }

    const groupId = attrs['VIDEO'] ?? attrs['GROUP-ID'] ?? 'unknown';
    const bandwidth = parseInt(attrs['BANDWIDTH'] ?? '0', 10);
    const resolution = attrs['RESOLUTION'] ?? null;
    const frameRate = attrs['FRAME-RATE'] ? parseFloat(attrs['FRAME-RATE']) : null;
    const name = groupNames[groupId] ?? groupId;

    variants.push({ groupId, name, bandwidth, resolution, frameRate, url });
  }

  if (variants.length === 0) {
    throw new PlaylistParseError('No stream variants found in master playlist.');
  }

  return variants;
}
