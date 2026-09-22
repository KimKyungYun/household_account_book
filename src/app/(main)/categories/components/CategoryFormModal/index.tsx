'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
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
import styles from './CategoryFormModal.module.scss';

type FormTarget =
  | { mode: 'create-parent' }
  | { mode: 'create-child'; parent: CategoryNodeDto }
  | { mode: 'edit'; category: CategoryNodeDto };

interface CategoryFormModalProps {
  target: FormTarget | null;
  kind: CategoryKind;
  onClose: () => void;
  onSaved: () => void;
}

const formSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(20, '이름은 20자까지 쓸 수 있습니다.'),
  defaultSplitMode: z.enum(['', 'SHARED', 'PERSONAL']),
});
type FormValues = z.infer<typeof formSchema>;

const SPLIT_OPTIONS = [
  { value: '', label: '지정 안 함 (공동으로 봅니다)' },
  { value: 'SHARED', label: '공동 — 분담 정산에 들어갑니다' },
  { value: 'PERSONAL', label: '개인 — 정산에서 빠집니다' },
];

function titleOf(target: FormTarget | null): string {
  if (!target) return '';
  if (target.mode === 'create-parent') return '대분류 추가';
  if (target.mode === 'create-child') return `'${target.parent.name}' 소분류 추가`;

  return `'${target.category.name}' 수정`;
}

function defaultSplitOf(target: FormTarget | null): FormValues['defaultSplitMode'] {
  if (target?.mode !== 'edit') return '';
  if (target.category.defaultSplitMode === 'PERSONAL') return 'PERSONAL';
  if (target.category.defaultSplitMode === 'SHARED') return 'SHARED';

  return '';
}

/**
 * 대상이 바뀌면 부모가 `key` 로 이 컴포넌트를 다시 마운트한다.
 * effect 로 reset 하면 대상이 바뀌는 순간 옛 값이 한 프레임 보이고 렌더가 한 번 더 돈다.
 */
export default function CategoryFormModal({ target, kind, onClose, onSaved }: CategoryFormModalProps) {
  const { register, handleSubmit, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: target?.mode === 'edit' ? target.category.name : '',
      defaultSplitMode: defaultSplitOf(target),
    },
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      const splitMode = (values.defaultSplitMode === '' ? null : values.defaultSplitMode) as SplitMode | null;

      if (!target) return;
      if (target.mode === 'edit') {
        await updateCategory(target.category.id, { name: values.name, defaultSplitMode: splitMode });

        return;
      }

      await createCategory({
        name: values.name,
        kind,
        parentId: target.mode === 'create-child' ? target.parent.id : null,
        defaultSplitMode: splitMode,
      });
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutateAsync(values);
    } catch (error) {
      if (isApiError(error) && error.fieldErrors?.name) {
        setError('name', { message: error.fieldErrors.name });

        return;
      }
      toast.error(isApiError(error) ? error.message : '저장하지 못했습니다.');

      return;
    }

    toast.success('저장했습니다.');
    onSaved();
  });

  const isEditingSystem = target?.mode === 'edit' && target.category.isSystem;

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={onClose}
      title={titleOf(target)}
      description={isEditingSystem ? '기본 카테고리는 이름과 분담 방식만 바꿀 수 있습니다.' : undefined}
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

        <FormField
          label="기본 분담 방식"
          hint="이 카테고리로 거래를 등록할 때 처음 고를 값입니다."
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
