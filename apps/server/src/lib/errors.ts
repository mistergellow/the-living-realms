import { ErrorCode, type ApiErrorBody } from '@realms/shared';
import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError, type z } from 'zod';

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errors = {
  unauthenticated: () => new AppError(401, ErrorCode.UNAUTHENTICATED, 'You need to log in.'),
  forbidden: (msg = 'Not allowed.') => new AppError(403, ErrorCode.FORBIDDEN, msg),
  notFound: (what = 'Resource') => new AppError(404, ErrorCode.NOT_FOUND, `${what} not found.`),
  validation: (message: string, details?: unknown) =>
    new AppError(400, ErrorCode.VALIDATION_FAILED, message, details),
};

/** Parse untrusted input with a zod schema, throwing a 400 on failure. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

function toValidationError(err: ZodError): AppError {
  const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  return errors.validation(details[0]?.message ?? 'Invalid input.', details);
}

/** Postgres unique-violation helper. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const e = (err as { cause?: unknown })?.cause ?? err;
  const pg = e as { code?: string; constraint_name?: string };
  return pg?.code === '23505' && (!constraint || pg.constraint_name === constraint);
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError | AppError | ZodError, request, reply) => {
    let status = 500;
    let body: ApiErrorBody['error'];

    if (err instanceof AppError) {
      status = err.statusCode;
      body = { code: err.code, message: err.message, details: err.details };
    } else if (err instanceof ZodError) {
      const v = toValidationError(err);
      status = 400;
      body = { code: v.code, message: v.message, details: v.details };
    } else if ((err as FastifyError).statusCode === 429) {
      status = 429;
      body = { code: ErrorCode.RATE_LIMITED, message: 'Too many requests. Slow down.' };
    } else if ((err as FastifyError).statusCode && (err as FastifyError).statusCode! < 500) {
      status = (err as FastifyError).statusCode!;
      body = { code: ErrorCode.VALIDATION_FAILED, message: err.message };
    } else {
      request.log.error({ err }, 'unhandled error');
      body = { code: ErrorCode.INTERNAL, message: 'Something went wrong.' };
    }

    if (status >= 500 && err instanceof AppError) request.log.error({ err }, 'server error');
    void reply.status(status).send({ error: { ...body, requestId: request.id } });
  });
}
