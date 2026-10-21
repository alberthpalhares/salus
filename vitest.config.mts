import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Os testes fazem `npm pack --dry-run` e leem a árvore do repositório;
    // sem paralelismo entre arquivos evita contenção no Windows.
    fileParallelism: false,
  },
});
