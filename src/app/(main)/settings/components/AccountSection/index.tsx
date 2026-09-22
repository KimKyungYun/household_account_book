'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Icon from '@/components/common/Icon';
import { PATH } from '@/routes/paths';
import styles from './AccountSection.module.scss';

export default function AccountSection() {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <>
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
            onClick={() => setIsConfirming(true)}
          >
            로그아웃
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        onConfirm={() => {
          setIsSigningOut(true);
          void signOut({ callbackUrl: PATH.LOGIN });
        }}
        title="로그아웃"
        confirmLabel="로그아웃"
        isLoading={isSigningOut}
      />
    </>
  );
}
