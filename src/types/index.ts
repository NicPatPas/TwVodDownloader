export interface CliOptions {
  url: string;
  start: string;
  end: string;
  output?: string;
}

export interface ParsedTimestamp {
  /** Total seconds from the start of the VOD */
  totalSeconds: number;
  /** Original input string, for display */
  raw: string;
}

export interface VodInfo {
  vodId: string;
  originalUrl: string;
}

/** A single quality variant parsed from the HLS master playlist. */
export interface QualityVariant {
  /** Group ID as used in the playlist, e.g. "chunked", "720p60", "audio_only" */
  groupId: string;
  /** Human-readable name from the EXT-X-MEDIA NAME attribute */
  name: string;
  /** Bits per second */
  bandwidth: number;
  /** e.g. "1920x1080", or null if not present (audio-only) */
  resolution: string | null;
  /** Frames per second, or null if not present */
  frameRate: number | null;
  /** URL to the media playlist (index-dvr.m3u8) */
  url: string;
}

/** Result of resolving a VOD manifest. */
export interface VodManifest {
  variants: QualityVariant[];
  best: QualityVariant;
}
