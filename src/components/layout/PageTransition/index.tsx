'use client';

import { usePathname } from 'next/navigation';
import styles from './PageTransition.module.scss';
import type { ReactNode } from 'react';

/**
 * 화면을 옮길 때 본문이 한 번 떠오른다.
 *
 * App Router 는 화면을 옮겨도 `main` 을 그대로 두고 안의 내용만 바꾼다. 그래서
 * 경로를 `key` 로 걸어 새 화면일 때만 다시 마운트시킨다 — 그러지 않으면 등장
 * 애니메이션이 첫 방문에 한 번만 돈다.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={styles.pagetransition}
    >
      {children}
    </div>
  );
}
