import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { defineConfig, loadEnv } from 'vite';

// Paths the gateway serves. The SPA's own pages (/, /cart, /account, /checkout) are client routes: /cart is also an API
// prefix, so it only works as a client-side navigation in dev.
const API_PREFIXES = ['/auth', '/users', '/products', '/search', '/categories', '/cart', '/orders', '/payments'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const remote = (key: string, fallback: string) => ({ external: env[key] ?? fallback, from: 'vite' as const, externalType: 'url' as const });
  return {
    plugins: [
      react(),
      federation({
        name: 'host',
        filename: 'remoteEntry.js',
        // Remotes are loaded at runtime from these entry URLs.
        remotes: {
          catalog: remote('REMOTE_CATALOG_URL', 'http://localhost:5001/assets/remoteEntry.js'),
          cart: remote('REMOTE_CART_URL', 'http://localhost:5002/assets/remoteEntry.js'),
          account: remote('REMOTE_ACCOUNT_URL', 'http://localhost:5003/assets/remoteEntry.js'),
          checkout: remote('REMOTE_CHECKOUT_URL', 'http://localhost:5004/assets/remoteEntry.js'),
        },
        exposes: { './ui': './src/ui.ts' },
        shared: ['react', 'react-dom', 'react-router-dom', '@shoplab/ui-kit'],
      }),
    ],
    build: { target: 'esnext', minify: false, cssCodeSplit: false },
    // Remotes fetch the host's remoteEntry.js (for `host/ui`) from another origin.
    preview: { cors: true },
    // One origin for the browser: every API path goes to shoplab-gateway, which routes it to the right service.
    server: {
      proxy: Object.fromEntries(API_PREFIXES.map((p) => [p, env.GATEWAY_URL ?? 'http://localhost:8080'])),
    },
    test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
  };
});
