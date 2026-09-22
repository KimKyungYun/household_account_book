'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import SegmentedControl from '@/components/common/SegmentedControl';
import Skeleton from '@/components/common/Skeleton';
import { useMe } from '@/hooks/useMe';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { updateHousehold } from '@/service/household';
import styles from './ShareSection.module.scss';

/** 흔히 쓰는 비율만 버튼으로 둔다. 그 밖은 직접 입력. */
const PRESETS = [
  { value: '5000', label: '5 : 5' },
  { value: '6000', label: '6 : 4' },
  { value: '7000', label: '7 : 3' },
] as const;

export default function ShareSection() {
  const me = useMe();
  const queryClient = useQueryClient();
  const members = me.data?.members ?? [];
  const [names, setNames] = useState<Record<string, string>>({});
  const [firstShareBp, setFirstShareBp] = useState<number | null>(null);

  const first = members[0];
  const second = members[1];
  const shareBp = firstShareBp ?? first?.defaultShareBp ?? 5000;

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      updateHousehold({
        members: members.map((member, index) => ({
          id: member.id,
          displayName: names[member.id] ?? member.displayName,
          colorHex: member.colorHex,
          defaultShareBp: index === 0 ? shareBp : 10_000 - shareBp,
        })),
      }),
  });

  const onSave = async () => {
    try {
      await mutateAsync();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : '저장하지 못했습니다.');

      return;
    }

    toast.success('저장했습니다. 확정하지 않은 달의 정산이 새 비율로 다시 계산됩니다.');
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ME.ALL });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.SETTLEMENT.ALL });
  };

  if (me.isPending) return <Skeleton height={260} />;
  if (!first || !second) {
    return (
      <Card title="분담 비율">
        <p className={styles.sharesection__note}>배우자가 합류하면 분담 비율을 정할 수 있습니다.</p>
      </Card>
    );
  }

  return (
    <Card
      title="분담 비율"
      action={
        <Button
          size="sm"
          onClick={onSave}
          isLoading={isPending}
        >
          저장
        </Button>
      }
    >
      <div className={styles.sharesection}>
        <FormField
          label={`${names[first.id] ?? first.displayName} 몫`}
          hint="공동지출을 나누는 기준입니다. 개인지출에는 영향이 없습니다."
        >
          {() => (
            <div className={styles.sharesection__share}>
              <SegmentedControl
                name="share-preset"
                options={PRESETS}
                value={String(shareBp)}
                onChange={(value) => setFirstShareBp(Number(value))}
                ariaLabel="분담 비율"
              />
              <div className={styles.sharesection__ratio}>
                <span>{(shareBp / 100).toFixed(0)}%</span>
                <span className={styles.sharesection__vs}>:</span>
                <span>{((10_000 - shareBp) / 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </FormField>

        <p className={styles.sharesection__warning}>
          비율을 바꾸면 <strong>확정하지 않은 모든 달</strong>의 정산 결과가 함께 바뀝니다.
        </p>

        <div className={styles.sharesection__names}>
          {members.map((member) => (
            <FormField
              key={member.id}
              label={`${member.slot === 0 ? '첫째 자리' : '둘째 자리'} 표시 이름`}
            >
              {({ id }) => (
                <Input
                  id={id}
                  value={names[member.id] ?? member.displayName}
                  onChange={(event) => setNames((previous) => ({ ...previous, [member.id]: event.target.value }))}
                />
              )}
            </FormField>
          ))}
        </div>
      </div>
    </Card>
  );
}
