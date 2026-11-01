/** Browser-state keys. `cartId` is written by the cart remote; the host reads it to merge a guest cart on login. */
export const AUTH_KEY = 'shoplab.session';
const LEGACY_AUTH_KEY = 'shoplab.auth';
export const CART_ID_KEY = 'cartId';

export interface Tokens { accessToken: string; refreshToken: string }

const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };

export const loadTokens = (): Tokens | null =>
  safe(() => {
    const raw = localStorage.getItem(AUTH_KEY) ?? localStorage.getItem(LEGACY_AUTH_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  }, null);
export const saveTokens = (t: Tokens) => safe(() => localStorage.setItem(AUTH_KEY, JSON.stringify(t)), undefined);
export const clearTokens = () => safe(() => (localStorage.removeItem(AUTH_KEY), localStorage.removeItem(LEGACY_AUTH_KEY)), undefined);

export const readGuestCartId = (): string | null => safe(() => localStorage.getItem(CART_ID_KEY), null);
export const clearGuestCartId = () => safe(() => localStorage.removeItem(CART_ID_KEY), undefined);
