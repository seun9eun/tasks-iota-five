import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// In production Vercel serves everything under api/ as its own function. In
// development Vite runs the same files through its own module loader, so there
// is one implementation of the auth endpoints rather than two.
const API_ROUTES: Record<string, string> = {
  '/api/auth/login': '/api/auth/login.ts',
  '/api/auth/callback': '/api/auth/callback.ts',
  '/api/token': '/api/token.ts',
  '/api/logout': '/api/logout.ts',
};

const devApi = (): Plugin => ({
  name: 'dev-api',
  configureServer(server) {
    dotenv.config();
    server.middlewares.use(async (req, res, next) => {
      const modulePath = API_ROUTES[(req.url ?? '').split('?')[0]];
      if (!modulePath) return next();
      try {
        const loaded = await server.ssrLoadModule(modulePath);
        await loaded.default(req, res);
      } catch (err) {
        next(err);
      }
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), devApi()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
