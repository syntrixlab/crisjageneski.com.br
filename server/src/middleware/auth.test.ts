import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { requireAuth } from './auth';

function makeRes() {
  return {} as any;
}

describe('requireAuth', () => {
  it('calls next with the decoded payload when the cookie has a valid token', () => {
    const token = jwt.sign({ id: '1', email: 'a@b.com', role: 'admin' }, env.JWT_SECRET, { expiresIn: '2h' });
    const req = { cookies: { user_session: token } } as any;
    const next = vi.fn();

    requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ id: '1', email: 'a@b.com', role: 'admin' });
  });

  it('calls next with a 401 error when there is no cookie', () => {
    const req = { cookies: {} } as any;
    const next = vi.fn();

    requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('calls next with a 401 error when the cookie token is invalid', () => {
    const req = { cookies: { user_session: 'not-a-real-token' } } as any;
    const next = vi.fn();

    requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });
});
