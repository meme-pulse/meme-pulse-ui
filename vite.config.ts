import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // API 요청을 Bun 서버로 프록시
      '/api/dlmm-suggest': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // GraphQL은 외부 서버로 프록시
      '/api/graphql': {
        target: 'http://3.34.129.83:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/graphql/, '/v1/graphql'),
      },
    },
  },
});
