'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/common/Icon';
import Logo from '@/components/common/Logo';
import { SIDEBAR_NAV } from '@/routes/nav';
import { PATH } from '@/routes/paths';
import { cn } from '@/utils/ts/cn';
import styles from './Sidebar.module.scss';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      className={styles.sidebar}
      aria-label="주요 메뉴"
    >
      {/* 워드마크는 데스크톱에서만 보인다. 좁은 폭에서 마크만 남으면 이 링크에
          읽어 줄 이름이 없어지므로 이름을 직접 붙인다. */}
      <Link
        className={styles.sidebar__brand}
        href={PATH.DASHBOARD}
        aria-label="우리집 가계부 — 대시보드로"
      >
        <Logo
          className={styles.sidebar__mark}
          size={32}
        />
        <span className={styles.sidebar__wordmark}>우리집 가계부</span>
      </Link>

      <ul className={styles.sidebar__list}>
        {SIDEBAR_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                className={cn(styles.sidebar__link, { [styles['sidebar__link--active']]: isActive })}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <Icon name={item.icon} />
                <span className={styles.sidebar__label}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
