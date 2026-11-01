import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, decodeUser, useAuth } from '../src/auth.tsx';
import { AUTH_CHANGED, CART_UPDATED } from '../src/bus.ts';
import { AUTH_KEY, CART_ID_KEY } from '../src/storage.ts';
import { fakeJwt, stubFetch } from './helpers.ts';

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const access = fakeJwt({ sub: 'u-1', role: 'customer', tenant: 'default' });
const events = (name: string) => {
  const seen: unknown[] = [];
  window.addEventListener(name, (e) => seen.push((e as CustomEvent).detail));
  return seen;
};

describe('decodeUser', () => {
  it('reads sub and role claims', () => expect(decodeUser(access)).toEqual({ id: 'u-1', role: 'customer' }));
  it('returns null for garbage', () => expect(decodeUser('nope')).toBeNull());
});

describe('AuthProvider', () => {
  it('login stores tokens, exposes the user and emits auth:changed', async () => {
    stubFetch({ 'POST /auth/login': () => ({ body: { accessToken: access, refreshToken: 'r1', expiresIn: 900 } }) });
    const seen = events(AUTH_CHANGED);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login('a@shoplab.test', 'password123'));
    expect(result.current.user).toEqual({ id: 'u-1', role: 'customer' });
    expect(JSON.parse(localStorage.getItem(AUTH_KEY)!)).toEqual({ accessToken: access, refreshToken: 'r1' });
    expect(seen).toContainEqual({ loggedIn: true, userId: 'u-1' });
  });

  it('a failed login leaves no tokens behind', async () => {
    stubFetch({ 'POST /auth/login': () => ({ status: 401, body: { error: 'invalid_credentials' } }) });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(act(() => result.current.login('a@shoplab.test', 'bad'))).rejects.toMatchObject({ status: 401, code: 'invalid_credentials' });
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('login merges the guest cart named by localStorage.cartId, then clears it', async () => {
    localStorage.setItem(CART_ID_KEY, 'guest-9');
    const calls = stubFetch({
      'POST /auth/login': () => ({ body: { accessToken: access, refreshToken: 'r1', expiresIn: 900 } }),
      'POST /cart/merge': () => ({ body: { id: 'c1', lines: [{ quantity: 2 }, { quantity: 3 }] } }),
    });
    const counts = events(CART_UPDATED);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login('a@shoplab.test', 'password123'));
    const merge = calls.find((c) => c.key === 'POST /cart/merge')!;
    expect(JSON.parse(merge.init.body as string)).toEqual({ guestCartId: 'guest-9' });
    expect((merge.init.headers as Record<string, string>).authorization).toBe(`Bearer ${access}`);
    expect(localStorage.getItem(CART_ID_KEY)).toBeNull();
    expect(counts).toContainEqual({ count: 5 });
  });

  it('keeps the guest cart id when the merge fails', async () => {
    localStorage.setItem(CART_ID_KEY, 'guest-9');
    stubFetch({
      'POST /auth/login': () => ({ body: { accessToken: access, refreshToken: 'r1', expiresIn: 900 } }),
      'POST /cart/merge': () => ({ status: 502, body: { error: 'down' } }),
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login('a@shoplab.test', 'password123'));
    expect(result.current.user).not.toBeNull();
    expect(localStorage.getItem(CART_ID_KEY)).toBe('guest-9');
  });

  it('restores a saved session and announces it', async () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ accessToken: access, refreshToken: 'r1' }));
    const seen = events(AUTH_CHANGED);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user?.id).toBe('u-1');
    await waitFor(() => expect(seen).toContainEqual({ loggedIn: true, userId: 'u-1' }));
  });

  it('still restores a session saved under the legacy shoplab.auth key', async () => {
    localStorage.setItem('shoplab.auth', JSON.stringify({ accessToken: access, refreshToken: 'r1' }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user?.id).toBe('u-1');
  });

  it('logout clears tokens even when the server call fails', async () => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ accessToken: access, refreshToken: 'r1' }));
    stubFetch({ 'POST /auth/logout': () => ({ status: 500, body: {} }) });
    const seen = events(AUTH_CHANGED);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
    expect(seen.at(-1)).toEqual({ loggedIn: false, userId: null });
  });

  it('useAuth outside the provider throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
