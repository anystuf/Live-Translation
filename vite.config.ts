import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Only PORT is read here; GEMINI_API_KEY is deliberately never referenced in
  // client-side config so it cannot end up in the bundle.
  const env = loadEnv(mode, process.cwd(), '');
  const serverPort = env.PORT ?? '8787';

  const base = mode === 'production' ? env.VITE_BASE_PATH || './' : '/';

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '/src': '/src',
      },
    },
    server: {
      port: 5173,
      proxy: {
        // The browser calls /api/token; Vite forwards it to the token server.
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'es2022',
      sourcemap: true,
    },
  };
});
