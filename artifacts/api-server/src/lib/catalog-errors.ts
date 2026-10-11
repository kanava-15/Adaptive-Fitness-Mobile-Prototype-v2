import type { ErrorRequestHandler } from 'express';

const unavailableCodes = new Set([
  '42P01', '42703', '3D000', '28P01', '28000',
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
  '08000', '08001', '08003', '08006', '57P01',
]);

export function catalogErrorStatus(error: unknown): 500 | 503 {
  const visited = new Set<unknown>();
  let cause = error;
  while (cause && typeof cause === 'object' && !visited.has(cause)) {
    visited.add(cause);
    const record = cause as { code?: unknown; cause?: unknown };
    if (typeof record.code === 'string' && unavailableCodes.has(record.code)) return 503;
    cause = record.cause;
  }
  return 500;
}

export const catalogErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  req.log.error({ err: error }, 'Catalog request failed');
  const status = catalogErrorStatus(error);
  res.set('Cache-Control', 'no-store').status(status).json({
    error: status === 503
      ? 'Catalog update service is not ready. Your existing catalog is unchanged. Please try again later.'
      : 'Catalog update failed. Your existing catalog is unchanged. Please try again later.',
  });
};
