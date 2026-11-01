import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import { defineConfig, loadEnv } from 'vite';

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
        },
        exposes: { './ui': './src/ui.ts' },
        shared: ['react', 'react-dom', 'react-router-dom'],
      }),
    ],
    build: { target: 'esnext', minify: false, cssCodeSplit: false },
    // Stands in for the gateway until shoplab-gateway exists: one origin, routed by path prefix.
    server: {
      proxy: {
        '/auth': 'http://localhost:3001',
        '/users': 'http://localhost:3001',
        '/products': 'http://localhost:3002',
        '/search': 'http://localhost:3002',
        '/categories': 'http://localhost:3002',
        '/cart': 'http://localhost:3003',
      },
    },
    test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
  };
});
