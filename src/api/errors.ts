/**
 * What can go wrong talking to Reddit, as classes a screen can tell apart:
 * whether to retry, wait, or send the person back to sign in.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The sign-in no longer works: revoked on Reddit, or the client ID changed. */
export class AuthError extends ApiError {
  constructor(message = 'Reddit no longer accepts this sign-in. Sign in again.') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

/** Reddit refused the client ID, or the app's access to the API. */
export class ClientError extends ApiError {
  constructor(message = 'Reddit refused this app’s client ID. Check it in Settings.') {
    super(message, 403);
    this.name = 'ClientError';
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Could not reach Reddit. Check the connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends ApiError {
  constructor(
    /** Seconds until Reddit's window resets, when it said. */
    readonly retryAfter?: number,
  ) {
    super('Reddit asked the app to slow down. Try again in a minute.', 429);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends ApiError {
  constructor(
    message = 'Reddit has nothing here. It may have been deleted, banned or made private.',
  ) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/** Reddit answered with something the app does not understand. */
export class ResponseError extends ApiError {
  constructor(message = 'Reddit sent something unexpected.') {
    super(message);
    this.name = 'ResponseError';
  }
}
