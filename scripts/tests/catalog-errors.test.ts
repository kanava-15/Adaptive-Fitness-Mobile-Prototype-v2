import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { catalogErrorHandler, catalogErrorStatus } from '../../artifacts/api-server/src/lib/catalog-errors';

test('missing schema and connection errors are unavailable, including wrapped causes', () => {
  for (const code of ['42P01', '42703', '3D000', '28P01', 'ECONNREFUSED', 'ETIMEDOUT']) {
    assert.equal(catalogErrorStatus(new Error('Failed query', { cause: { code } })), 503);
  }
  assert.equal(catalogErrorStatus(new Error('Invalid release')), 500);
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  assert.equal(catalogErrorStatus(cyclic), 500);
});

test('catalog errors return safe JSON and no-store, not an HTML error page', () => {
  let status: unknown;
  let body: unknown;
  const headers = new Map();
  const req = { log: { error() {} } } as unknown as Request;
  const res = {
    headersSent: false,
    set(key: string, value: string) { headers.set(key, value); return this; },
    status(value: number) { status = value; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as Response;
  catalogErrorHandler(new Error('Sensitive internal detail', { cause: { code: '42P01' } }),
    req, res, (() => assert.fail('Unexpected error forwarding')) as NextFunction);
  assert.equal(status, 503);
  assert.equal(headers.get('Cache-Control'), 'no-store');
  assert.match((body as { error: string }).error, /existing catalog is unchanged/);
  assert.ok(!JSON.stringify(body).includes('Sensitive internal detail'));
});

test('errors after response headers are forwarded', () => {
  const error = new Error('Already streaming');
  let forwarded: unknown;
  catalogErrorHandler(error, {} as Request, { headersSent: true } as Response,
    ((value: unknown) => { forwarded = value; }) as NextFunction);
  assert.equal(forwarded, error);
});
