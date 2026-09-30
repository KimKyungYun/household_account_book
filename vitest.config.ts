import { defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig 의 paths(@/*) 를 Vite 가 직접 해석한다 — vite-tsconfig-paths 플러그인이 필요 없다.
  resolve: { tsconfigPaths: true },
  test: {
    // 훅·컴포넌트 테스트가 섞여 있다. DOM 이 필요한 파일만 따로 두지 않고 전부 jsdom 에서 돌린다.
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
