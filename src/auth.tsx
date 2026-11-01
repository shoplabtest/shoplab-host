import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authFetch, request } from './api.ts';
import { emitAuthChanged, emitCartUpdated } from './bus.ts';
import { clearGuestCartId, clearTokens, loadTokens, readGuestCartId, saveTokens, type Tokens } from './storage.ts';

export interface User { id: string; role: 'customer' | 'staff' | 'admin' }

export interface AuthValue {
  user: User | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

/** Reads the iam access-token claims (`sub`, `role`). The signature is checked by services, not here. */
export function decodeUser(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string; role?: User['role'] };
    return payload.sub && payload.role ? { id: payload.sub, role: payload.role } : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** After login, folds the guest cart (id kept by the cart remote in localStorage.cartId) into the user's cart. */
async function mergeGuestCart(accessToken: string) {
  const guestCartId = readGuestCartId();
  if (!guestCartId) return;
  try {
    const cart = await request<{ lines: { quantity: number }[] }>('/cart/merge', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ guestCartId }),
    });
    clearGuestCartId();
    emitCartUpdated({ count: cart.lines.reduce((n, l) => n + l.quantity, 0) });
  } catch {
    // Keep the guest id so the next login can retry; shopping continues either way.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<Tokens | null>(() => loadTokens());
  const user = useMemo(() => (tokens ? decodeUser(tokens.accessToken) : null), [tokens]);

  useEffect(() => {
    emitAuthChanged({ loggedIn: !!user, userId: user?.id ?? null });
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const next = await request<Tokens & { expiresIn: number }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    const saved = { accessToken: next.accessToken, refreshToken: next.refreshToken };
    saveTokens(saved);
    setTokens(saved);
    await mergeGuestCart(saved.accessToken);
  }, []);

  const logout = useCallback(async () => {
    const current = loadTokens();
    if (current) await authFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: current.refreshToken }) }).catch(() => {});
    clearTokens();
    setTokens(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
