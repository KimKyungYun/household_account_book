'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import SegmentedControl from '@/components/common/SegmentedControl';
import { SkeletonRows } from '@/components/common/Skeleton';
import { useMe } from '@/hooks/useMe';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { rotateInviteCode, updateHousehold } from '@/service/household';
import { HOUSEHOLD_KIND_RULES, HOUSEHOLD_KINDS } from '@/service/household/kind';
import type { HouseholdKind } from '@/generated/prisma/enums';
import styles from './HouseholdSection.module.scss';

const KIND_OPTIONS = HOUSEHOLD_KINDS.map((kind) => ({ value: kind, label: HOUSEHOLD_KIND_RULES[kind].label }));

export default function HouseholdSection() {
  const me = useMe();
  const queryClient = useQueryClient();
  const [isRotating, setIsRotating] = useState(false);

  const rotation = useMutation({
    mutationFn: rotateInviteCode,
    onSuccess: () => {
      toast.success('새 초대 코드를 발급했습니다.');
      setIsRotating(false);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ME.ALL });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '발급하지 못했습니다.'),
  });

  // 유형은 고르는 즉시 바꾼다. 인원이 새 정원보다 많으면 서버가 이유와 함께 거절한다.
  const kindChange = useMutation({
    mutationFn: (kind: HouseholdKind) => updateHousehold({ kind }),
    onSuccess: (_result, kind) => {
      toast.success(`${HOUSEHOLD_KIND_RULES[kind].label} 장부로 바꿨습니다.`);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ME.ALL });
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '바꾸지 못했습니다.'),
  });

  if (me.isPending) {
    return (
      <Card
        title="우리 집"
        description="장부 이름과 함께 쓰는 사람입니다."
      >
        <SkeletonRows
          count={3}
          isPadded={false}
        />
      </Card>
    );
  }

  const inviteCode = me.data?.household?.inviteCode ?? '';
  const kind = me.data?.household?.kind ?? 'COUPLE';
  const rule = HOUSEHOLD_KIND_RULES[kind];
  const memberCount = me.data?.members.length ?? 0;
  // 자리가 남아 있을 때만 초대 코드를 보여 준다. 개인 장부는 정원이 1명이라 늘 숨는다.
  const canInvite = memberCount < rule.capacity;

  return (
    <>
      <Card
        title="우리 집"
        description={rule.capacity > 1 ? `${rule.label} 장부 · 최대 ${rule.capacity}명까지 함께 쓸 수 있습니다.` : '혼자 쓰는 장부입니다.'}
      >
        <dl className={styles.householdsection}>
          <div className={styles.householdsection__row}>
            <dt>이름</dt>
            <dd>{me.data?.household?.name ?? '-'}</dd>
          </div>
          <div className={styles.householdsection__row}>
            <dt>유형</dt>
            <dd>
              <SegmentedControl
                name="household-kind"
                options={KIND_OPTIONS}
                value={kind}
                onChange={(value) => value !== kind && kindChange.mutate(value as HouseholdKind)}
                ariaLabel="장부 유형"
                isFullWidth={false}
              />
            </dd>
          </div>
          <div className={styles.householdsection__row}>
            <dt>사람</dt>
            <dd>{me.data?.members.map((member) => member.displayName).join(', ') || '-'}</dd>
          </div>
          <div className={styles.householdsection__row}>
            <dt>이메일</dt>
            <dd>{me.data?.user.email ?? '-'}</dd>
          </div>
        </dl>

        {canInvite && (
          <div className={styles.householdsection__invite}>
            <p className={styles.householdsection__invitelead}>
              함께 쓸 사람이 가입한 뒤 &lsquo;초대 코드로 합류&rsquo;에 붙여넣으면 같은 장부를 씁니다.
              ({memberCount}/{rule.capacity}명)
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
        title="초대 코드 재발급"
        description="이전 코드는 사용할 수 없게 됩니다."
        confirmLabel="새로 발급"
        isLoading={rotation.isPending}
      />
    </>
  );
}
