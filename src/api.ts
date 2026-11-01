import { ApiError } from '@shoplab/ui-kit';
import { loadTokens, saveTokens, clearTokens, type Tokens } from './storage.ts';

/** Relative URLs: in dev Vite proxies them, in prod the gateway serves them from the same origin. */
export async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...rest.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? 'request_failed');
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

let refreshing: Promise<Tokens | null> | null = null;

/** Exchanges the refresh token once, even if several calls hit a 401 at the same time. */
function refresh(): Promise<Tokens | null> {
  refreshing ??= (async () => {
    const current = loadTokens();
    if (!current) return null;
    try {
      const next = await request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      const tokens = { accessToken: next.accessToken, refreshToken: next.refreshToken };
      saveTokens(tokens);
      return tokens;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Fetch with the current access token; on 401 refreshes once and retries. Exposed to remotes through `host/ui`. */
export async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = loadTokens();
  try {
    return await request<T>(path, { ...init, token: tokens?.accessToken });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401 || !tokens) throw err;
    const next = await refresh();
    if (!next) throw err;
    return request<T>(path, { ...init, token: next.accessToken });
  }
}
