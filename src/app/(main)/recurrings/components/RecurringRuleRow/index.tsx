import Amount from '@/components/common/Amount';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import CategoryIcon from '@/components/common/CategoryIcon';
import { formatDateLabel } from '@/utils/ts/formatDate';
import type { RecurringRuleDto } from '@/service/recurring/type';
import styles from './RecurringRuleRow.module.scss';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function describeRule(rule: RecurringRuleDto): string {
  const every = rule.interval > 1 ? `${rule.interval}` : '';

  if (rule.freq === 'WEEKLY') {
    return `${every ? `${every}주마다` : '매주'} ${WEEKDAY_LABELS[rule.weekday ?? 0]}요일`;
  }
  if (rule.freq === 'YEARLY') {
    return `${every ? `${every}년마다` : '매년'} ${rule.monthOfYear}월 ${rule.dayOfMonth}일`;
  }
  // 31일은 말일을 겸한다 — 그대로 보여주면 2월에 왜 28일인지 알 수 없다.
  const day = rule.dayOfMonth === 31 ? '말일' : `${rule.dayOfMonth}일`;

  return `${every ? `${every}개월마다` : '매월'} ${day}`;
}

/** 어디로 가는 돈인지. 자산에 쌓이는 규칙은 분류(예적금)보다 자산 이름이 더 알려 준다. */
function describeTarget(rule: RecurringRuleDto): string {
  if (rule.asset) return ` · ${rule.asset.name}`;
  if (rule.category) return ` · ${rule.category.parentName ?? ''} ${rule.category.name}`;

  return '';
}

interface RecurringRuleRowProps {
  rule: RecurringRuleDto;
  isToggling: boolean;
  onEdit: (rule: RecurringRuleDto) => void;
  onToggle: (rule: RecurringRuleDto) => void;
  onDelete: (rule: RecurringRuleDto) => void;
}

export default function RecurringRuleRow({ rule, isToggling, onEdit, onToggle, onDelete }: RecurringRuleRowProps) {
  return (
    <li className={styles.recurringrulerow}>
      <button
        type="button"
        className={styles.recurringrulerow__main}
        onClick={() => onEdit(rule)}
      >
        {/* 분류가 없는 '옮긴 돈'은 계좌 이동 아이콘으로 선다. */}
        <CategoryIcon
          name={rule.category?.name ?? '계좌이동'}
          parent={rule.category?.parentName ? { name: rule.category.parentName } : null}
        />
        <span className={styles.recurringrulerow__text}>
          <span className={styles.recurringrulerow__name}>
            {rule.name}
            {!rule.isActive && <Badge tone="neutral">중지</Badge>}
            {rule.splitMode === 'PERSONAL' && rule.type !== 'TRANSFER' && <Badge tone="neutral">개인</Badge>}
          </span>
          <span className={styles.recurringrulerow__meta}>
            {describeRule(rule)}
            {describeTarget(rule)}
            {` · ${rule.member.displayName}`}
            {rule.nextOccurrenceDate ? ` · 다음 ${formatDateLabel(rule.nextOccurrenceDate)}` : ''}
          </span>
        </span>
      </button>

      <div className={styles.recurringrulerow__side}>
        <Amount
          value={rule.amount}
          tone={rule.type === 'INCOME' ? 'income' : rule.type === 'EXPENSE' ? 'expense' : 'transfer'}
        />

        <div className={styles.recurringrulerow__actions}>
          <Button
            size="sm"
            variant="ghost"
            isLoading={isToggling}
            onClick={() => onToggle(rule)}
            title={rule.isActive ? '자동으로 적는 걸 잠시 멈춰요' : '자동으로 적는 걸 다시 시작해요'}
          >
            {rule.isActive ? '중지' : '다시 시작'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(rule)}
            title="반복 거래를 완전히 지워요"
          >
            삭제
          </Button>
        </div>
      </div>
    </li>
  );
}
