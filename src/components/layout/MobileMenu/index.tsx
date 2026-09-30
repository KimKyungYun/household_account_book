'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Icon from '@/components/common/Icon';
import Modal from '@/components/common/Modal';
import { SIDEBAR_NAV } from '@/routes/nav';
import { PATH } from '@/routes/paths';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/utils/ts/cn';
import styles from './MobileMenu.module.scss';

/**
 * 모바일 전체 메뉴.
 *
 * 하단탭에는 네 자리밖에 없어 예산·자산·반복 거래·리포트·분류가 들어가지 못한다.
 * 그 다섯을 '더보기 → 설정 화면' 뒤에 숨기면 두 번 눌러야 닿는다. 옆에서 밀려 나오는
 * 판에 **사이드바와 같은 목록**을 그대로 얹어 한 번에 닿게 한다.
 *
 * 목록을 따로 적지 않고 `SIDEBAR_NAV` 를 쓴다. 메뉴가 늘 때 한 곳만 고치면 된다.
 */
export default function MobileMenu() {
  const pathname = usePathname();
  const isOpen = useUiStore((state) => state.isMenuOpen);
  const closeMenu = useUiStore((state) => state.closeMenu);

  // 메뉴를 눌러 화면이 바뀌면 판은 제 할 일을 끝냈다. 닫지 않으면 새 화면 위에 그대로 남는다.
  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeMenu}
      placement="drawer"
      title="전체 메뉴"
    >
      <nav aria-label="전체 메뉴">
        <ul className={styles.mobilemenu__list}>
          {SIDEBAR_NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  className={cn(styles.mobilemenu__link, {
                    [styles['mobilemenu__link--active']]: isActive,
                  })}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link
        className={styles.mobilemenu__cta}
        href={PATH.TRANSACTION_NEW}
      >
        <Icon
          name="plus"
          size={18}
        />
        거래 등록
      </Link>
    </Modal>
  );
}
