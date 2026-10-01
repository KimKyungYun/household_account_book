'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/common/Icon';
import BrandLogo from '@/components/common/BrandLogo';
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
      {/* 넓은 화면은 마크와 글자를 합친 로고, 아이콘 레일(좁은 폭)은 마크만 보인다.
          둘 다 장식으로 두고 이름은 링크가 직접 말한다. */}
      <Link
        className={styles.sidebar__brand}
        href={PATH.DASHBOARD}
        aria-label="우리집 가계부 — 대시보드로"
      >
        <Logo
          className={styles.sidebar__mark}
          size={32}
        />
        <BrandLogo
          className={styles.sidebar__lockup}
          height={30}
          isDecorative
        />
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
