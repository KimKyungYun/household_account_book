'use client';

import { useState } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ResetModal from '../ResetModal';
import styles from './ResetSection.module.scss';

/** 거래·자산·대출·반복 거래 초기화. 확인 창에서 건수를 보여 주고 확인 문구를 입력해야 실행한다. */
export default function ResetSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card title="데이터 초기화">
      <div className={styles.resetsection}>
        <div className={styles.resetsection__text}>
          <span className={styles.resetsection__label}>거래·자산 초기화</span>
          <span className={styles.resetsection__note}>
            거래, 자산, 대출, 반복 거래를 모두 지워요. 분류·결제수단·예산·구성원은 남아요.
          </span>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          초기화
        </Button>
      </div>

      {/* 열 때마다 새로 그려 이전에 입력한 확인 문구가 남지 않게 한다. */}
      {isOpen && (
        <ResetModal
          isOpen
          onClose={() => setIsOpen(false)}
        />
      )}
    </Card>
  );
}
