'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/common/Icon';
import { MOBILE_NAV } from '@/routes/nav';
import { PATH } from '@/routes/paths';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/utils/ts/cn';
import styles from './MobileTabBar.module.scss';

/**
 * 모바일 하단탭. 가운데 등록 버튼이 엄지에 가장 가까운 자리를 차지한다.
 *
 * 왼쪽 두 자리는 링크, 오른쪽은 링크 하나와 전체 메뉴 버튼이다. 나머지 화면들을
 * '설정' 뒤에 숨기지 않고 메뉴 버튼이 여는 드로어에서 한 번에 닿게 한다.
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const openMenu = useUiStore((state) => state.openMenu);
  const isMenuOpen = useUiStore((state) => state.isMenuOpen);

  const [first, second, third] = MOBILE_NAV;
  const left = [first, second].filter(Boolean);
  const right = [third].filter(Boolean);

  const renderTab = (item: (typeof MOBILE_NAV)[number]) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.href}
        className={cn(styles.mobiletabbar__tab, { [styles['mobiletabbar__tab--active']]: isActive })}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon
          name={item.icon}
          size={22}
        />
        <span className={styles.mobiletabbar__label}>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      className={styles.mobiletabbar}
      aria-label="주요 메뉴"
    >
      {left.map(renderTab)}

      <Link
        className={styles.mobiletabbar__add}
        href={PATH.TRANSACTION_NEW}
        aria-label="거래 등록"
      >
        <Icon
          name="plus"
          size={24}
        />
      </Link>

      {right.map(renderTab)}

      <button
        type="button"
        className={cn(styles.mobiletabbar__tab, { [styles['mobiletabbar__tab--active']]: isMenuOpen })}
        aria-haspopup="dialog"
        aria-expanded={isMenuOpen}
        onClick={openMenu}
      >
        <Icon
          name="menu"
          size={22}
        />
        <span className={styles.mobiletabbar__label}>메뉴</span>
      </button>
    </nav>
  );
}
