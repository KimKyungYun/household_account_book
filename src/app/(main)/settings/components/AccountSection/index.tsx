'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Icon from '@/components/common/Icon';
import { PATH } from '@/routes/paths';
import styles from './AccountSection.module.scss';

export default function AccountSection() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Card
      title="계정"
      description=""
    >
      <div className={styles.accountsection}>
        <p className={styles.accountsection__note}>
          기록은 그대로 남습니다.
        </p>
        <Button
          variant="secondary"
          iconLeft={<Icon
            name="logout"
            size={16}
          />}
          isLoading={isSigningOut}
          // 기록은 그대로 남고 다시 로그인하면 되므로 한 번 더 묻지 않는다.
          onClick={() => {
            setIsSigningOut(true);
            void signOut({ callbackUrl: PATH.LOGIN });
          }}
        >
          로그아웃
        </Button>
      </div>
    </Card>
  );
}
