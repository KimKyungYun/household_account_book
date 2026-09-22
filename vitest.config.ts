import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig 의 paths(@/*) 를 Vite 가 직접 해석한다 — vite-tsconfig-paths 플러그인이 필요 없다.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
