/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
		plugins: [react(), tailwindcss()],
		resolve: {
			alias: {
				'@': path.resolve(import.meta.dirname, './src'),
			},
		},
		test: {
			environment: 'jsdom',
			globals: true,
			setupFiles: ['./src/test/setup.ts'],
		},
		base: env.VITE_BASE_PATH || '/',
		server: {
			port: 7070,
			// proxy: {
			//   '/api': {
			//     target: env.VITE_API_URL || 'http://localhost:8080',
			//     changeOrigin: true,
			//     secure: false,
			//   },
			// },
		},
	};
});
