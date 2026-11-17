import { pino, type Logger, type LoggerOptions } from 'pino';

export type { Logger };

/** Paths that must never reach the logs. */
export const LOG_REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
];

export function loggerOptions(opts: {
  service: string;
  level: string;
  pretty: boolean;
}): LoggerOptions {
  return {
    level: opts.level,
    base: { service: opts.service },
    redact: { paths: LOG_REDACT_PATHS, censor: '[redacted]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(opts.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  };
}

export function createLogger(opts: { service: string; level: string; pretty: boolean }): Logger {
  return pino(loggerOptions(opts));
}
