import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The monorepo's root .env. Vite exposes only VITE_-prefixed variables to the app.
const ENV_DIR = '../..';

/** Reads a required setting from the root .env. There are no built-in defaults. */
function requireEnv(env: Record<string, string>, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is not set. Add it to the root .env (see .env.example).`);
  }
  return value;
}

function requirePort(env: Record<string, string>, key: string): number {
  const port = Number(requireEnv(env, key));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${key} must be a port number.`);
  }
  return port;
}

/** Forwards /api to the API. While it is still starting, answers 503 quietly instead of logging proxy errors. */
function apiProxy(target: string): Record<string, ProxyOptions> {
  return {
    '/api': {
      target,
      changeOrigin: false,
      configure: (proxy) => {
        proxy.on('error', (_error, _req, res) => {
          if ('writeHead' in res && !res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                statusCode: 503,
                code: 'API_STARTING',
                message: 'The server is starting. Try again in a moment',
              }),
            );
          }
        });
      },
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // Server settings are only needed by `vite` and `vite preview`, so `vite build`
  // in CI does not require them.
  const serve = command === 'serve';
  const env = serve ? loadEnv(mode, ENV_DIR, '') : {};

  return {
    envDir: ENV_DIR,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Registration runs from an external script so the CSP never needs 'unsafe-inline'.
        injectRegister: 'script',
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'fonts/*.woff2'],
        manifest: {
          id: '/',
          name: 'ChitFund',
          short_name: 'ChitFund',
          description: 'Chit group installments, payouts and member records',
          lang: 'en-IN',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#0F4C81',
          background_color: '#F6F7F9',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // App shell and static assets only. API responses are never cached.
          globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: serve
      ? {
          port: requirePort(env, 'WEB_PORT'),
          strictPort: true,
          proxy: apiProxy(requireEnv(env, 'API_PROXY_TARGET')),
        }
      : undefined,
    preview: serve
      ? {
          port: requirePort(env, 'WEB_PREVIEW_PORT'),
          strictPort: true,
          proxy: apiProxy(requireEnv(env, 'API_PROXY_TARGET')),
        }
      : undefined,
    build: {
      sourcemap: true,
      target: 'es2022',
      rollupOptions: {
        output: {
          // Libraries change far less often than app code; separate chunks stay
          // cached on phones across app releases.
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
            data: ['@tanstack/react-query', 'zod', 'react-hook-form', '@hookform/resolvers'],
            i18n: ['i18next', 'react-i18next'],
          },
        },
      },
    },
  };
});
