'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import Button from '@/components/common/Button';
import CategoryIcon from '@/components/common/CategoryIcon';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import CategoryDeleteModal from '@/components/category/CategoryDeleteModal';
import CategoryFormModal, { categoryFormKey } from '@/components/category/CategoryFormModal';
import type { CategoryFormTarget } from '@/components/category/CategoryFormModal';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { cn } from '@/utils/ts/cn';
import type { CategoryKind } from '@/generated/prisma/enums';
import type { CategoryNodeDto, CategoryTreeDto } from '@/service/category/type';
import styles from './CategorySelectModal.module.scss';

interface CategorySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: readonly CategoryTreeDto[];
  /** 지금 적는 거래의 종류. 새 분류도 이 종류로 만든다. */
  kind: CategoryKind;
  value: string | null;
  /** 고른 소분류 id. 고른 분류를 지우면 null 로 비운다. */
  onChange: (categoryId: string | null) => void;
}

/** 검색어가 소분류 이름이나 그 상위 분류 이름에 들면 남긴다. 상위 이름이 맞으면 딸린 소분류를 다 보인다. */
function filterGroups(groups: readonly CategoryNodeDto[], keyword: string): CategoryNodeDto[] {
  const query = keyword.trim();
  if (!query) return [...groups];

  return groups
    .map((parent) => (parent.name.includes(query)
      ? parent
      : { ...parent, children: parent.children.filter((child) => child.name.includes(query)) }))
    .filter((parent) => parent.children.length > 0);
}

/**
 * 거래를 적다가 분류를 고르는 창. 거래 등록 창 위에 한 겹 더 뜬다(폰에서는 아래에서 올라오는 시트).
 *
 * 평소에는 고르기만 한다 — 칩을 누르면 고르고 닫힌다. [편집]을 눌러야 추가·이름 바꾸기·지우기가 열린다.
 * 고르려다 잘못 눌러 분류를 지우는 일을 막는다. 추가·수정·삭제는 분류 관리 화면과 같은 창을 써서
 * '거래가 있는 분류는 다른 분류로 옮긴 뒤 지운다' 같은 규칙이 어디서든 같다.
 */
export default function CategorySelectModal({ isOpen, onClose, tree, kind, value, onChange }: CategorySelectModalProps) {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formTarget, setFormTarget] = useState<CategoryFormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryNodeDto | null>(null);

  const groups = useMemo(() => tree.flatMap((group) => group.categories), [tree]);
  const shown = useMemo(() => filterGroups(groups, keyword), [groups, keyword]);

  // 다시 열었을 때 지난 검색어·편집 상태가 남아 있지 않게 한다.
  const close = () => {
    setKeyword('');
    setIsEditing(false);
    onClose();
  };

  const select = (categoryId: string) => {
    onChange(categoryId);
    close();
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.CATEGORY.ALL });
  };

  const onSaved = (savedId: string | null) => {
    const target = formTarget;
    setFormTarget(null);
    refresh();

    // 거래를 적다가 세부 분류를 새로 만들었으면 그것을 쓰려던 것이다. 바로 고르고 닫는다.
    if (target?.mode === 'create-child' && savedId) select(savedId);
  };

  const onDeleted = () => {
    if (deleteTarget?.id === value) onChange(null);
    setDeleteTarget(null);
    refresh();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={close}
        title="분류 고르기"
        description={isEditing
          ? '칩을 누르면 이름을 바꾸고, ✕ 를 누르면 지워요. 처음부터 있던 분류는 지울 수 없어요.'
          : '고르면 바로 거래에 적혀요.'}
        size="lg"
        footer={
          <div className={styles.categoryselectmodal__footer}>
            {isEditing && (
              <Button
                variant="secondary"
                iconLeft={<Icon
                  name="plus"
                  size={16}
                />}
                onClick={() => setFormTarget({ mode: 'create-parent' })}
              >
                큰 분류 추가
              </Button>
            )}
            <Button
              variant={isEditing ? 'primary' : 'secondary'}
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? '편집 끝내기' : '편집'}
            </Button>
          </div>
        }
      >
        <div className={styles.categoryselectmodal}>
          <Input
            type="search"
            aria-label="분류 찾기"
            placeholder="분류 이름으로 찾기"
            leading={<Icon
              name="search"
              size={16}
            />}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />

          {shown.length === 0 ? (
            <EmptyState
              title="찾는 분류가 없어요"
              description={isEditing ? '아래에서 새 분류를 만들 수 있어요.' : '[편집]을 누르면 새 분류를 만들 수 있어요.'}
            />
          ) : (
            <ul className={styles.categoryselectmodal__groups}>
              {shown.map((parent) => (
                <li
                  key={parent.id}
                  className={styles.categoryselectmodal__group}
                >
                  <div className={styles.categoryselectmodal__grouphead}>
                    <CategoryIcon
                      name={parent.name}
                      icon={parent.icon}
                      color={parent.colorHex}
                      size="sm"
                    />
                    <span className={styles.categoryselectmodal__groupname}>{parent.name}</span>

                    {isEditing && (
                      <span className={styles.categoryselectmodal__groupactions}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setFormTarget({ mode: 'create-child', parent })}
                        >
                          세부 분류 추가
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setFormTarget({ mode: 'edit', category: parent })}
                        >
                          이름 바꾸기
                        </Button>
                      </span>
                    )}
                  </div>

                  {parent.children.length === 0 ? (
                    <p className={styles.categoryselectmodal__nochild}>
                      세부 분류가 없어 고를 수 없어요.{isEditing ? '' : ' [편집]에서 만들어 주세요.'}
                    </p>
                  ) : (
                    <ul className={styles.categoryselectmodal__children}>
                      {parent.children.map((child) => (
                        <li
                          key={child.id}
                          className={cn(styles.categoryselectmodal__child, {
                            [styles['categoryselectmodal__child--selected']]: child.id === value,
                          })}
                        >
                          <button
                            type="button"
                            className={styles.categoryselectmodal__pick}
                            onClick={() => (isEditing
                              ? setFormTarget({ mode: 'edit', category: child })
                              : select(child.id))}
                            aria-pressed={isEditing ? undefined : child.id === value}
                            title={isEditing ? '이름 바꾸기' : undefined}
                          >
                            {child.name}
                          </button>

                          {/* 기본 분류는 지울 수 없다(이름만 바꾼다). */}
                          {isEditing && !child.isSystem && (
                            <button
                              type="button"
                              className={styles.categoryselectmodal__remove}
                              onClick={() => setDeleteTarget(child)}
                              aria-label={`'${child.name}' 지우기`}
                            >
                              <Icon
                                name="close"
                                size={14}
                              />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* 고르기 창 위에 한 겹 더 뜬다. Esc 는 맨 위 창만 닫는다. */}
      <CategoryFormModal
        key={categoryFormKey(formTarget)}
        target={formTarget}
        kind={kind}
        onClose={() => setFormTarget(null)}
        onSaved={onSaved}
      />

      <CategoryDeleteModal
        key={`delete:${deleteTarget?.id ?? 'none'}`}
        category={deleteTarget}
        groups={groups}
        onClose={() => setDeleteTarget(null)}
        onDone={onDeleted}
      />
    </>
  );
}
