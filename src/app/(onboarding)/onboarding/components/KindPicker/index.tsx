import { HOUSEHOLD_KIND_RULES, HOUSEHOLD_KINDS } from '@/service/household/kind';
import { cn } from '@/utils/ts/cn';
import type { HouseholdKind } from '@/generated/prisma/enums';
import styles from './KindPicker.module.scss';

interface KindPickerProps {
  value: HouseholdKind;
  onChange: (kind: HouseholdKind) => void;
}

/** 가구 유형을 카드 세 장 중에서 고른다. 라디오 묶음이라 화살표 키로도 옮겨 다닌다. */
export default function KindPicker({ value, onChange }: KindPickerProps) {
  return (
    <div
      className={styles.kindpicker}
      role="radiogroup"
      aria-label="가구 유형"
    >
      {HOUSEHOLD_KINDS.map((kind) => {
        const rule = HOUSEHOLD_KIND_RULES[kind];
        const isSelected = kind === value;

        return (
          <label
            key={kind}
            className={cn(styles.kindpicker__option, { [styles['kindpicker__option--selected']]: isSelected })}
          >
            <input
              type="radio"
              name="household-kind"
              className={styles.kindpicker__radio}
              value={kind}
              checked={isSelected}
              onChange={() => onChange(kind)}
            />
            <span className={styles.kindpicker__label}>{rule.label}</span>
            <span className={styles.kindpicker__description}>{rule.description}</span>
          </label>
        );
      })}
    </div>
  );
}
