/** Base error class for all application-level errors. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class VodUnavailableError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'VodUnavailableError';
  }
}

export class PlaylistParseError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'PlaylistParseError';
  }
}

export class FfmpegError extends AppError {
  constructor(
    message: string,
    public readonly exitCode?: number | null
  ) {
    super(message);
    this.name = 'FfmpegError';
  }
}
