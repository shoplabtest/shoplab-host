# shoplab-host

Module Federation shell for ShopLab: routing, auth context and the remote loader. React + Vite.

**Loads** (runtime, from `REMOTE_*_URL`, defaults `localhost:5001-5003`): `catalog/Page`, `cart/Cart`, `account/Account`.
**Exposes** `./api`: `useAuth`, `authFetch`, `emitCartUpdated`, `onCartUpdated`, `onAuthChanged`, `CART_ID_KEY`.

**Window events:** `auth:changed` `{ loggedIn, userId }`, `cart:updated` `{ count }`.
**Browser state:** `localStorage.shoplab.auth` (tokens, owned here), `localStorage.cartId` (guest cart, written by the cart remote, read here to call `POST /cart/merge` after login).
**Props passed to catalog:** `onAddToCart(productId)`, `currency`.

A remote that fails to load shows a fallback instead of breaking the shell.

```
npm install
npm run dev      # port 5000; Vite proxies /auth, /products, /search, /categories, /cart to local services
npm test
npm run build    # emits dist/assets/remoteEntry.js
```
