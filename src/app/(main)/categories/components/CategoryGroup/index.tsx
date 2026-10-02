'use client';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import CategoryIcon from '@/components/common/CategoryIcon';
import Icon from '@/components/common/Icon';
import type { CategoryNodeDto } from '@/service/category/type';
import styles from './CategoryGroup.module.scss';

export type MoveOffset = -1 | 1;

interface CategoryGroupProps {
  parent: CategoryNodeDto;
  isFirst: boolean;
  isLast: boolean;
  /** 순서를 저장하는 동안 단추를 잠근다. 연달아 눌러 순서가 엉키지 않게. */
  isReordering: boolean;
  onAddChild: (parent: CategoryNodeDto) => void;
  onEdit: (category: CategoryNodeDto) => void;
  onDelete: (category: CategoryNodeDto) => void;
  /** 형제 사이에서 한 칸 위(-1)·아래(1)로. */
  onMove: (category: CategoryNodeDto, offset: MoveOffset) => void;
}

/** 큰 분류 하나와 그 밑의 세부 분류. 처음부터 있던 분류도 똑같이 고치고 옮기고 지운다. */
export default function CategoryGroup({
  parent,
  isFirst,
  isLast,
  isReordering,
  onAddChild,
  onEdit,
  onDelete,
  onMove,
}: CategoryGroupProps) {
  return (
    <li className={styles.categorygroup}>
      <div className={styles.categorygroup__head}>
        <CategoryIcon
          name={parent.name}
          icon={parent.icon}
          color={parent.colorHex}
        />
        <span className={styles.categorygroup__name}>{parent.name}</span>
        {parent.defaultSplitMode === 'PERSONAL' && <Badge tone="neutral">각자 돈</Badge>}
        <span className={styles.categorygroup__count}>거래 {parent.transactionCount}건</span>
        <OrderButtons
          label={parent.name}
          canMoveUp={!isFirst}
          canMoveDown={!isLast}
          isDisabled={isReordering}
          onMove={(offset) => onMove(parent, offset)}
        />

        <div className={styles.categorygroup__actions}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddChild(parent)}
          >
            세부 분류 추가
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(parent)}
          >
            고치기
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(parent)}
          >
            지우기
          </Button>
        </div>
      </div>

      <ul className={styles.categorygroup__children}>
        {parent.children.map((child, index) => (
          <CategoryChildRow
            key={child.id}
            child={child}
            canMoveUp={index > 0}
            canMoveDown={index < parent.children.length - 1}
            isReordering={isReordering}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
        {parent.children.length === 0 && (
          <li className={styles.categorygroup__nochild}>
            세부 분류가 없어 이 분류로는 거래를 등록할 수 없어요.
          </li>
        )}
      </ul>
    </li>
  );
}

interface CategoryChildRowProps {
  child: CategoryNodeDto;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isReordering: boolean;
  onEdit: (category: CategoryNodeDto) => void;
  onDelete: (category: CategoryNodeDto) => void;
  onMove: (category: CategoryNodeDto, offset: MoveOffset) => void;
}

function CategoryChildRow({ child, canMoveUp, canMoveDown, isReordering, onEdit, onDelete, onMove }: CategoryChildRowProps) {
  return (
    <li className={styles.categorygroup__child}>
      <button
        type="button"
        className={styles.categorygroup__childname}
        onClick={() => onEdit(child)}
        title="고치기"
      >
        {child.name}
      </button>
      <span className={styles.categorygroup__childcount}>
        {child.transactionCount === 0 ? '' : `${child.transactionCount}건`}
      </span>
      <div className={styles.categorygroup__childactions}>
        <OrderButtons
          label={child.name}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          isDisabled={isReordering}
          onMove={(offset) => onMove(child, offset)}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(child)}
        >
          지우기
        </Button>
      </div>
    </li>
  );
}

interface OrderButtonsProps {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isDisabled: boolean;
  onMove: (offset: MoveOffset) => void;
}

/** 위·아래 한 칸씩. 끌어 옮기기는 폰에서 스크롤과 부딪혀 단추로 둔다. */
function OrderButtons({ label, canMoveUp, canMoveDown, isDisabled, onMove }: OrderButtonsProps) {
  return (
    <span className={styles.categorygroup__order}>
      <button
        type="button"
        className={styles.categorygroup__orderbutton}
        onClick={() => onMove(-1)}
        disabled={!canMoveUp || isDisabled}
        aria-label={`'${label}' 위로`}
      >
        <Icon
          name="chevronUp"
          size={16}
        />
      </button>
      <button
        type="button"
        className={styles.categorygroup__orderbutton}
        onClick={() => onMove(1)}
        disabled={!canMoveDown || isDisabled}
        aria-label={`'${label}' 아래로`}
      >
        <Icon
          name="chevronDown"
          size={16}
        />
      </button>
    </span>
  );
}
