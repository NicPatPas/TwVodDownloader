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
