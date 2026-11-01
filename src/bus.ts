/** Window events shared by the host and every remote. Names and `detail` shapes are contracts. */
export const AUTH_CHANGED = 'auth:changed';
export const CART_UPDATED = 'cart:updated';

export interface AuthChangedDetail { loggedIn: boolean; userId: string | null }
export interface CartUpdatedDetail { count: number }

export function emit<T>(name: string, detail: T) {
  window.dispatchEvent(new CustomEvent<T>(name, { detail }));
}

export function on<T>(name: string, handler: (detail: T) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<T>).detail);
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}

export const emitAuthChanged = (d: AuthChangedDetail) => emit(AUTH_CHANGED, d);
export const emitCartUpdated = (d: CartUpdatedDetail) => emit(CART_UPDATED, d);
export const onAuthChanged = (h: (d: AuthChangedDetail) => void) => on(AUTH_CHANGED, h);
export const onCartUpdated = (h: (d: CartUpdatedDetail) => void) => on(CART_UPDATED, h);
