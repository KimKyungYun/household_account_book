'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Skeleton from '@/components/common/Skeleton';
import { useMe } from '@/hooks/useMe';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { rotateInviteCode } from '@/service/household';
import styles from './HouseholdSection.module.scss';

export default function HouseholdSection() {
  const me = useMe();
  const queryClient = useQueryClient();
  const [isRotating, setIsRotating] = useState(false);

  const rotation = useMutation({
    mutationFn: rotateInviteCode,
    onSuccess: () => {
      toast.success('새 초대 코드를 발급했습니다. 이전 코드는 더 쓸 수 없습니다.');
      setIsRotating(false);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ME.ALL });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '발급하지 못했습니다.'),
  });

  if (me.isPending) return <Skeleton height={180} />;

  const inviteCode = me.data?.household?.inviteCode ?? '';
  const isAlone = (me.data?.members.length ?? 0) < 2;

  return (
    <>
      <Card title="가구">
        <dl className={styles.householdsection}>
          <div className={styles.householdsection__row}>
            <dt>이름</dt>
            <dd>{me.data?.household?.name ?? '-'}</dd>
          </div>
          <div className={styles.householdsection__row}>
            <dt>구성원</dt>
            <dd>{me.data?.members.map((member) => member.displayName).join(', ') || '-'}</dd>
          </div>
          <div className={styles.householdsection__row}>
            <dt>내 이메일</dt>
            <dd>{me.data?.user.email ?? '-'}</dd>
          </div>
        </dl>

        {isAlone && (
          <div className={styles.householdsection__invite}>
            <p className={styles.householdsection__invitelead}>
              배우자에게 이 코드를 전해 주세요. 가입 후 &lsquo;초대 코드로 합류&rsquo;에서 붙여넣으면 같은 장부를 씁니다.
            </p>
            <code className={styles.householdsection__code}>{inviteCode}</code>
            <div className={styles.householdsection__inviteactions}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteCode).then(
                    () => toast.success('초대 코드를 복사했습니다.'),
                    () => toast.error('복사하지 못했습니다. 코드를 직접 선택해 주세요.'),
                  );
                }}
              >
                복사
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRotating(true)}
              >
                새로 발급
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={isRotating}
        onClose={() => setIsRotating(false)}
        onConfirm={() => rotation.mutate()}
        title="초대 코드를 새로 발급할까요?"
        description="이전 코드로는 합류할 수 없게 됩니다."
        confirmLabel="새로 발급"
        isLoading={rotation.isPending}
      />
    </>
  );
}
