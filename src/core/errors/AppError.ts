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
