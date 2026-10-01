'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import Button from '@/components/common/Button';
import FormField from '@/components/common/FormField';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import Select from '@/components/common/Select';
import { createCategory, updateCategory } from '@/service/category';
import { isApiError } from '@/interface/errorType';
import type { CategoryKind, SplitMode } from '@/generated/prisma/enums';
import type { CategoryNodeDto } from '@/service/category/type';
import EmojiPicker from './EmojiPicker';
import styles from './CategoryFormModal.module.scss';

export type CategoryFormTarget =
  | { mode: 'create-parent' }
  | { mode: 'create-child'; parent: CategoryNodeDto }
  | { mode: 'edit'; category: CategoryNodeDto };

type FormTarget = CategoryFormTarget;

/** 폼을 대상마다 새로 마운트하기 위한 키. 앞서 열었던 값이 남지 않는다. */
export function categoryFormKey(target: FormTarget | null): string {
  if (!target) return 'form:none';
  if (target.mode === 'create-parent') return 'create-parent';
  if (target.mode === 'create-child') return `create-child:${target.parent.id}`;

  return `edit:${target.category.id}`;
}

interface CategoryFormModalProps {
  target: FormTarget | null;
  kind: CategoryKind;
  onClose: () => void;
  /** 저장한 분류의 id 를 넘긴다 — 거래 등록 중에 새로 만든 분류를 바로 고르게 한다. */
  onSaved: (savedId: string | null) => void;
}

const formSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(20, '이름은 20자까지 쓸 수 있어요.'),
  defaultSplitMode: z.enum(['', 'SHARED', 'PERSONAL']),
  /** 대분류 아이콘. null 이면 이름으로 자동. 소분류에는 쓰지 않는다. */
  icon: z.string().nullable(),
});
type FormValues = z.infer<typeof formSchema>;

const SPLIT_OPTIONS = [
  { value: '', label: '고르지 않음 (같이 쓴 돈)' },
  { value: 'SHARED', label: '같이 쓴 돈 (나눠서 계산)' },
  { value: 'PERSONAL', label: '각자 쓴 돈 (안 나눔)' },
];

function titleOf(target: FormTarget | null): string {
  if (!target) return '';
  if (target.mode === 'create-parent') return '큰 분류 추가';
  if (target.mode === 'create-child') return `'${target.parent.name}' 세부 분류 추가`;

  return `'${target.category.name}' 수정`;
}

function defaultSplitOf(target: FormTarget | null): FormValues['defaultSplitMode'] {
  if (target?.mode !== 'edit') return '';
  if (target.category.defaultSplitMode === 'PERSONAL') return 'PERSONAL';
  if (target.category.defaultSplitMode === 'SHARED') return 'SHARED';

  return '';
}

/** 아이콘을 고를 수 있는 건 대분류뿐이다 — 소분류는 대분류의 아이콘을 따른다. */
function isParentTarget(target: FormTarget | null): boolean {
  if (!target) return false;
  if (target.mode === 'create-parent') return true;
  if (target.mode === 'create-child') return false;

  return target.category.level === 1;
}

/**
 * 대상이 바뀌면 부모가 `key` 로 이 컴포넌트를 다시 마운트한다.
 * effect 로 reset 하면 대상이 바뀌는 순간 옛 값이 한 프레임 보이고 렌더가 한 번 더 돈다.
 */
export default function CategoryFormModal({ target, kind, onClose, onSaved }: CategoryFormModalProps) {
  const { register, handleSubmit, setError, setValue, control, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: target?.mode === 'edit' ? target.category.name : '',
      defaultSplitMode: defaultSplitOf(target),
      icon: target?.mode === 'edit' ? target.category.icon : null,
    },
  });
  const isParent = isParentTarget(target);
  const [watchedName, watchedIcon] = useWatch({ control, name: ['name', 'icon'] });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      const splitMode = (values.defaultSplitMode === '' ? null : values.defaultSplitMode) as SplitMode | null;

      if (!target) return null;
      if (target.mode === 'edit') {
        const saved = await updateCategory(target.category.id, {
          name: values.name,
          defaultSplitMode: splitMode,
          ...(isParent ? { icon: values.icon } : {}),
        });

        return saved.id;
      }

      const created = await createCategory({
        name: values.name,
        kind,
        parentId: target.mode === 'create-child' ? target.parent.id : null,
        defaultSplitMode: splitMode,
        ...(isParent ? { icon: values.icon } : {}),
      });

      return created.id;
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    let savedId: string | null;

    try {
      savedId = await mutateAsync(values);
    } catch (error) {
      if (isApiError(error) && error.fieldErrors?.name) {
        setError('name', { message: error.fieldErrors.name });

        return;
      }
      toast.error(isApiError(error) ? error.message : '저장하지 못했어요.');

      return;
    }

    toast.success('저장했어요.');
    onSaved(savedId);
  });

  const isEditingSystem = target?.mode === 'edit' && target.category.isSystem;

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={onClose}
      title={titleOf(target)}
      description={isEditingSystem ? '처음부터 있던 분류는 이름과 기본 설정만 바꿀 수 있어요.' : undefined}
      footer={
        <div className={styles.categoryformmodal__actions}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type="submit"
            form="category-form"
            isLoading={isPending || formState.isSubmitting}
          >
            저장
          </Button>
        </div>
      }
    >
      <form
        method="post"
        className={styles.categoryformmodal}
        id="category-form"
        onSubmit={onSubmit}
        noValidate
      >
        <FormField
          label="이름"
          error={formState.errors.name?.message}
          isRequired
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              placeholder="예: 외식"
              aria-describedby={describedBy}
              isInvalid={Boolean(formState.errors.name)}
              {...register('name')}
            />
          )}
        </FormField>

        {isParent && (
          <FormField
            label="아이콘"
            hint="세부 분류도 이 아이콘을 함께 써요. 「자동」은 이름을 보고 골라 드려요."
          >
            {({ id, describedBy }) => (
              <EmojiPicker
                id={id}
                describedBy={describedBy}
                name={watchedName}
                value={watchedIcon}
                onChange={(emoji) => setValue('icon', emoji, { shouldDirty: true })}
              />
            )}
          </FormField>
        )}

        <FormField
          label="기본 나누기 방식"
          hint="거래를 적을 때 미리 골라 둘 값이에요."
          error={formState.errors.defaultSplitMode?.message}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              options={SPLIT_OPTIONS}
              aria-describedby={describedBy}
              {...register('defaultSplitMode')}
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}
