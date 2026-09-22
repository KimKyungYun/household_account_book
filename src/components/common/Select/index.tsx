'use client';

import { forwardRef } from 'react';
import { cn } from '@/utils/ts/cn';
import styles from './Select.module.scss';
import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  /** 대분류 헤더처럼 고를 수 없는 줄. */
  isDisabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly SelectOption[];
  placeholder?: string;
  isInvalid?: boolean;
  /** 대분류로 묶어 보여줄 때. */
  groups?: readonly { label: string; options: readonly SelectOption[] }[];
}

/**
 * 네이티브 select 기반.
 * 모바일에서 OS 휠 피커가 뜨는 편이 커스텀 드롭다운보다 빠르고, 한 손으로 고르기 쉽다.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, groups, placeholder, isInvalid = false, className, ...rest },
  ref,
) {
  return (
    <span className={cn(styles.select, { [styles['select--invalid']]: isInvalid }, className)}>
      <select
        ref={ref}
        className={styles.select__field}
        aria-invalid={isInvalid || undefined}
        {...rest}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {groups
          ? groups.map((group) => (
            <optgroup
              key={group.label}
              label={group.label}
            >
              {group.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.isDisabled}
                >
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))
          : options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.isDisabled}
            >
              {option.label}
            </option>
          ))}
      </select>
    </span>
  );
});

export default Select;
