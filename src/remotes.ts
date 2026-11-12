import { lazy } from 'react';

// Resolved at runtime from the remote entry URLs configured in vite.config.ts.
export const CatalogPage = lazy(() => import('catalog/Page'));
export const CartPage = lazy(() => import('cart/Cart'));
export const AccountPage = lazy(() => import('account/Account'));
export const CheckoutPage = lazy(() => import('checkout/Checkout'));
