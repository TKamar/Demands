export class AuthClientException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthClientException';
  }
}

export class AuthClientConnectionError extends AuthClientException {
  constructor(public readonly url: string, public readonly details?: string) {
    const message = details
      ? `Failed to connect to auth service at ${url}: ${details}`
      : `Failed to connect to auth service at ${url}`;
    super(message);
    this.name = 'AuthClientConnectionError';
  }
}

export class AuthClientAuthenticationError extends AuthClientException {
  constructor(public readonly details?: string) {
    const message = details
      ? `Auth client authentication failed: ${details}`
      : 'Auth client authentication failed';
    super(message);
    this.name = 'AuthClientAuthenticationError';
  }
}

export class AuthClientUserNotFoundError extends AuthClientException {
  constructor(public readonly userId: string) {
    super(`User ${userId} not found in auth service`);
    this.name = 'AuthClientUserNotFoundError';
  }
}

export class AuthClientConfigurationError extends AuthClientException {
  constructor(public readonly details: string) {
    super(`Auth client configuration error: ${details}`);
    this.name = 'AuthClientConfigurationError';
  }
}
