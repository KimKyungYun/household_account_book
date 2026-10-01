'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import { titleOfPath } from '@/routes/nav';
import { PATH } from '@/routes/paths';
import { useUiStore } from '@/stores/uiStore';
import styles from './TopBar.module.scss';

export default function TopBar() {
  const pathname = usePathname();
  const openMenu = useUiStore((state) => state.openMenu);
  const isMenuOpen = useUiStore((state) => state.isMenuOpen);

  return (
    <header className={styles.topbar}>
      <h1 className={styles.topbar__title}>{titleOfPath(pathname)}</h1>

      <div className={styles.topbar__actions}>
        {/* 하단탭에도 같은 버튼이 있지만, 화면 위쪽을 보고 있을 때 엄지를 내렸다
            올릴 필요가 없도록 여기에도 둔다. 좁은 폭에서만 보인다. */}
        <button
          type="button"
          className={styles.topbar__menu}
          aria-label="전체 메뉴"
          aria-haspopup="dialog"
          aria-expanded={isMenuOpen}
          onClick={openMenu}
        >
          <Icon
            name="menu"
            size={20}
          />
        </button>

        <Link
          className={styles.topbar__cta}
          href={PATH.TRANSACTION_NEW}
        >
          <Button
            size="sm"
            iconLeft={<Icon
              name="plus"
              size={16}
            />}
          >
            거래 등록
          </Button>
        </Link>
      </div>
    </header>
  );
}
