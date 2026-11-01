// Exposed to remotes as `host/ui`. Remotes use this instead of talking to the host's internals.
export { useAuth } from './auth.tsx';
export type { User, AuthValue } from './auth.tsx';
export { authFetch } from './api.ts';
export { emitCartUpdated, onCartUpdated, onAuthChanged } from './bus.ts';
export type { AuthChangedDetail, CartUpdatedDetail } from './bus.ts';
export { CART_ID_KEY } from './storage.ts';
