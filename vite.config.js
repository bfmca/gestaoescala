import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENV || mode),
    },

    resolve: {
      extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
    },

    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          warn(warning);
        },
      },
    },
  };
});