'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Button from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { titleOfPath } from '@/routes/nav';
import { PATH } from '@/routes/paths';
import styles from './TopBar.module.scss';

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className={styles.topbar}>
      <h1 className={styles.topbar__title}>{titleOfPath(pathname)}</h1>

      <div className={styles.topbar__actions}>
        <ThemeToggle />
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
