'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import Skeleton from '@/components/common/Skeleton';
import { useMe } from '@/hooks/useMe';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { updateHousehold } from '@/service/household';
import { HOUSEHOLD_KIND_RULES, RELATION_LABEL } from '@/service/household/kind';
import type { MemberRelation } from '@/generated/prisma/enums';
import type { MeMemberDto } from '@/service/auth/type';
import styles from './MembersSection.module.scss';

interface Draft {
  displayName?: string;
  relation?: MemberRelation;
}

const DESCRIPTION = '거래 목록과 차트에 이 이름으로 표시됩니다.';

/** 구성원 이름과 관계. 유형이 허락하는 관계만 고를 수 있다. */
export default function MembersSection() {
  const me = useMe();
  const queryClient = useQueryClient();
  const members = me.data?.members ?? [];
  const kind = me.data?.household?.kind ?? 'COUPLE';
  const rule = HOUSEHOLD_KIND_RULES[kind];
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const valueOf = (member: MeMemberDto) => ({
    displayName: drafts[member.id]?.displayName ?? member.displayName,
    relation: drafts[member.id]?.relation ?? member.relation,
  });

  const patch = (id: string, next: Draft) =>
    setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], ...next } }));

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () => updateHousehold({ members: members.map((member) => ({ id: member.id, ...valueOf(member) })) }),
  });

  const onSave = async () => {
    try {
      await mutateAsync();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : '저장하지 못했습니다.');

      return;
    }

    toast.success('저장했습니다.');
    setDrafts({});
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ME.ALL });
  };

  const title = rule.capacity > 1 ? '구성원' : '내 이름';

  if (me.isPending) {
    return (
      <Card
        tone="feature"
        title="구성원"
        description={DESCRIPTION}
      >
        <div
          className={styles.memberssection}
          role="status"
          aria-label="불러오는 중"
        >
          <Skeleton height={44} />
          <Skeleton height={44} />
        </div>
      </Card>
    );
  }

  return (
    <Card
      tone="feature"
      title={title}
      description={DESCRIPTION}
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
      <ul className={styles.memberssection}>
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            value={valueOf(member)}
            relations={rule.relations}
            isMe={member.id === me.data?.member?.id}
            onChange={(next) => patch(member.id, next)}
          />
        ))}
      </ul>
    </Card>
  );
}

interface MemberRowProps {
  member: MeMemberDto;
  value: { displayName: string; relation: MemberRelation };
  relations: readonly MemberRelation[];
  isMe: boolean;
  onChange: (next: Draft) => void;
}

/** 구성원 한 사람 — 색 점, 이름, 관계. */
function MemberRow({ member, value, relations, isMe, onChange }: MemberRowProps) {
  return (
    <li className={styles.memberssection__member}>
      <span
        className={styles.memberssection__dot}
        style={{ backgroundColor: member.colorHex }}
        aria-hidden="true"
      />
      <FormField
        label={isMe ? '내 이름' : '이름'}
        className={styles.memberssection__name}
      >
        {({ id }) => (
          <Input
            id={id}
            value={value.displayName}
            onChange={(event) => onChange({ displayName: event.target.value })}
          />
        )}
      </FormField>
      {relations.length > 1 && (
        <FormField label="관계">
          {({ id }) => (
            <Select
              id={id}
              value={value.relation}
              options={relations.map((relation) => ({ value: relation, label: RELATION_LABEL[relation] }))}
              onChange={(event) => onChange({ relation: event.target.value as MemberRelation })}
            />
          )}
        </FormField>
      )}
    </li>
  );
}
