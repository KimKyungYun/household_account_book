'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Icon from '@/components/common/Icon';
import { PATH } from '@/routes/paths';
import PasswordModal from '../PasswordModal';
import styles from './AccountSection.module.scss';

/**
 * 내 정보. 비밀번호 입력란을 설정 화면에 늘 펼쳐 두지 않는다 — 버튼을 눌러야 창이 열린다.
 */
export default function AccountSection() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  return (
    <Card
      title="내 정보"
      description="비밀번호를 바꾸거나 로그아웃할 수 있어요"
    >
      <ul className={styles.accountsection}>
        <li className={styles.accountsection__row}>
          <div className={styles.accountsection__text}>
            <span className={styles.accountsection__label}>비밀번호</span>
            <span className={styles.accountsection__note}>바꾸면 다음 로그인부터 새 비밀번호를 써요.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPasswordOpen(true)}
          >
            비밀번호 변경
          </Button>
        </li>

        <li className={styles.accountsection__row}>
          <div className={styles.accountsection__text}>
            <span className={styles.accountsection__label}>로그아웃</span>
            <span className={styles.accountsection__note}>로그아웃해도 기록은 그대로 남아요.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
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
        </li>
      </ul>

      <PasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
      />
    </Card>
  );
}
