import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    // Same-origin in development: the browser only talks to Vite, which proxies to the API.
    proxy: {
      '/api': { target: API },
      '/ws': { target: API.replace(/^http/, 'ws'), ws: true },
    },
  },
  build: { sourcemap: true },
  test: { environment: 'node' },
});
