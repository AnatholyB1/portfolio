import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Separate config: RLS integration tests hit a real Supabase BRANCH, never prod.
// Env comes from .env.test.local (gitignored), SV_TEST_ prefix only.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.rls.test.ts'],
    setupFiles: ['tests/rls/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: loadEnv('test', process.cwd(), 'SV_TEST_'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
    },
  },
});
