/**
 * Base HTTP error class with status code.
 * Throw this from route handlers to send specific HTTP errors.
 */
export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

// Convenience constructors
export const BadRequestError = (msg) => new HttpError(400, msg);
export const UnauthorizedError = (msg) => new HttpError(401, msg);
export const ForbiddenError = (msg) => new HttpError(403, msg);
export const NotFoundError = (msg) => new HttpError(404, msg);
