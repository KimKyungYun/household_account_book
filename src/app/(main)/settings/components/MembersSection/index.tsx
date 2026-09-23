'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Skeleton from '@/components/common/Skeleton';
import { useMe } from '@/hooks/useMe';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { updateHousehold } from '@/service/household';
import styles from './MembersSection.module.scss';

export default function MembersSection() {
  const me = useMe();
  const queryClient = useQueryClient();
  const members = me.data?.members ?? [];
  const [names, setNames] = useState<Record<string, string>>({});

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      updateHousehold({
        members: members.map((member) => ({
          id: member.id,
          displayName: names[member.id] ?? member.displayName,
          colorHex: member.colorHex,
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

    toast.success('저장했습니다.');
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ME.ALL });
  };

  if (me.isPending) return <Skeleton height={200} />;
  if (members.length === 0) {
    return (
      <Card title="두 사람 이름">
        <p className={styles.memberssection__note}>배우자가 합류하면 이름을 정할 수 있습니다.</p>
      </Card>
    );
  }

  return (
    <Card
      tone="feature"
      title="두 사람 이름"
      description="거래 목록과 차트에 이 이름으로 표시됩니다."
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
      <div className={styles.memberssection}>
        {members.map((member) => (
          <FormField
            key={member.id}
            label={`${member.displayName} 이름`}
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
    </Card>
  );
}
