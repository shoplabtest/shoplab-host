import { describe, expect, it } from 'vitest';
import { authFetch } from '../src/api.ts';
import { AUTH_KEY } from '../src/storage.ts';
import { stubFetch } from './helpers.ts';

const save = (accessToken: string, refreshToken: string) => localStorage.setItem(AUTH_KEY, JSON.stringify({ accessToken, refreshToken }));
const bearer = (init: RequestInit) => (init.headers as Record<string, string>).authorization;

describe('authFetch', () => {
  it('sends the access token', async () => {
    save('a1', 'r1');
    const calls = stubFetch({ 'GET /cart': () => ({ body: { ok: true } }) });
    await authFetch('/cart');
    expect(bearer(calls[0].init)).toBe('Bearer a1');
  });

  it('on 401 refreshes once, saves the new pair and retries', async () => {
    save('old', 'r1');
    let first = true;
    const calls = stubFetch({
      'GET /cart': (init) => (bearer(init) === 'Bearer old' && first ? ((first = false), { status: 401, body: {} }) : { body: { ok: true } }),
      'POST /auth/refresh': () => ({ body: { accessToken: 'new', refreshToken: 'r2', expiresIn: 900 } }),
    });
    expect(await authFetch('/cart')).toEqual({ ok: true });
    expect(JSON.parse(localStorage.getItem(AUTH_KEY)!)).toEqual({ accessToken: 'new', refreshToken: 'r2' });
    expect(bearer(calls.at(-1)!.init)).toBe('Bearer new');
  });

  it('concurrent 401s share one refresh call', async () => {
    save('old', 'r1');
    const calls = stubFetch({
      'GET /a': (init) => (bearer(init) === 'Bearer old' ? { status: 401, body: {} } : { body: 'a' }),
      'GET /b': (init) => (bearer(init) === 'Bearer old' ? { status: 401, body: {} } : { body: 'b' }),
      'POST /auth/refresh': () => ({ body: { accessToken: 'new', refreshToken: 'r2', expiresIn: 900 } }),
    });
    expect(await Promise.all([authFetch('/a'), authFetch('/b')])).toEqual(['a', 'b']);
    expect(calls.filter((c) => c.key === 'POST /auth/refresh')).toHaveLength(1);
  });

  it('a failed refresh clears the session and surfaces the 401', async () => {
    save('old', 'r1');
    stubFetch({
      'GET /cart': () => ({ status: 401, body: { error: 'unauthorized' } }),
      'POST /auth/refresh': () => ({ status: 401, body: { error: 'invalid_refresh_token' } }),
    });
    await expect(authFetch('/cart')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('does not try to refresh when logged out', async () => {
    const calls = stubFetch({ 'GET /cart': () => ({ status: 401, body: {} }) });
    await expect(authFetch('/cart')).rejects.toMatchObject({ status: 401 });
    expect(calls).toHaveLength(1);
  });
});
