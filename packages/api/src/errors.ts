export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  readonly status = 409;
  readonly code: string;

  constructor(message: string, code = 'CONFLICT') {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
  }
}
