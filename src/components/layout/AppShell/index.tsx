import MobileTabBar from '@/components/layout/MobileTabBar';
import PageTransition from '@/components/layout/PageTransition';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import styles from './AppShell.module.scss';
import type { ReactNode } from 'react';

/**
 * 전체화면 셸. 100dvh 를 고정하고 본문만 스크롤한다 —
 * 모바일에서 하단탭이 스크롤과 함께 밀려 올라가는 일이 없다.
 *
 * 폭에 따라 세 단계로 바뀐다.
 *   ≤600px  하단탭
 *   ≤900px  아이콘 레일(76px)
 *   ≥901px  라벨 사이드바(248px)
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.appshell}>
      <aside className={styles.appshell__aside}>
        <Sidebar />
      </aside>

      <div className={styles.appshell__main}>
        <TopBar />

        <main className={styles.appshell__content}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <div className={styles.appshell__tabbar}>
        <MobileTabBar />
      </div>
    </div>
  );
}
