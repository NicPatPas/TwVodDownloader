import type { QualityVariant } from '../../types/index.js';
import { AppError } from '../errors/AppError.js';

/**
 * Selects the best video quality from a list of variants.
 *
 * Strategy:
 *  1. Filter out audio-only streams (groupId or name contains "audio").
 *  2. Sort remaining variants by bandwidth descending.
 *  3. Return the first (highest bandwidth) variant.
 *
 * On Twitch, "chunked" is the source quality and always has the highest
 * bandwidth, so this naturally selects it when available.
 */
export function selectBestQuality(variants: QualityVariant[]): QualityVariant {
  const videoVariants = variants.filter(
    (v) =>
      !v.groupId.toLowerCase().includes('audio') &&
      !v.name.toLowerCase().includes('audio')
  );

  if (videoVariants.length === 0) {
    throw new AppError(
      'No video quality variants found in the playlist (only audio-only streams are present).'
    );
  }

  // Sort descending by bandwidth; ties are broken by resolution pixel count
  const sorted = [...videoVariants].sort((a, b) => {
    const bwDiff = b.bandwidth - a.bandwidth;
    if (bwDiff !== 0) return bwDiff;
    return pixelCount(b.resolution) - pixelCount(a.resolution);
  });

  return sorted[0]!;
}

function pixelCount(resolution: string | null): number {
  if (!resolution) return 0;
  const [w, h] = resolution.split('x').map(Number);
  return (w ?? 0) * (h ?? 0);
}

/** Returns a short display string for a variant, e.g. "1080p60 (source) — 8.1 Mbps" */
export function describeVariant(v: QualityVariant): string {
  const mbps = (v.bandwidth / 1_000_000).toFixed(1);
  const res = v.resolution ? ` ${v.resolution}` : '';
  return `${v.name}${res} — ${mbps} Mbps`;
}
