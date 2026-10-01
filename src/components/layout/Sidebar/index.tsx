'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/common/Icon';
import Logo from '@/components/common/Logo';
import { APP_SLOGAN } from '@/lib/brand';
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
      {/* 글자 로고 하나를 폭에 따라 크기만 바꿔 쓴다. 이름은 링크가 직접 말한다. */}
      <Link
        className={styles.sidebar__brand}
        href={PATH.DASHBOARD}
        aria-label="모아 — 대시보드로"
      >
        {/* 로고 아래 왼쪽에 맞춰 한 마디를 단다. 아이콘 레일(좁은 폭)에서는 로고만 남긴다. */}
        <span className={styles.sidebar__lockup}>
          <Logo
            className={styles.sidebar__logo}
            isDecorative
          />
          <span className={styles.sidebar__slogan}>{APP_SLOGAN}</span>
        </span>
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
