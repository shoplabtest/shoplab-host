import { vi } from 'vitest';

export const fakeJwt = (claims: object) => `h.${btoa(JSON.stringify(claims))}.s`;

type Handler = (init: RequestInit) => { status?: number; body?: unknown };

/** Stubs fetch with per-"METHOD path" handlers and records every call. */
export function stubFetch(routes: Record<string, Handler>) {
  const calls: { key: string; init: RequestInit }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (path: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${path}`;
    calls.push({ key, init });
    const h = routes[key];
    if (!h) throw new Error(`unexpected fetch ${key}`);
    const { status = 200, body } = h(init);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }));
  return calls;
}
