'use client';

import { forwardRef } from 'react';
import { cn } from '@/utils/ts/cn';
import styles from './Input.module.scss';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
  /** 입력칸 안 왼쪽에 붙는 고정 기호(검색 아이콘 등). HTML 전역 속성 prefix 와 겹치지 않게 이름을 바꿨다. */
  leading?: ReactNode;
  /** 입력칸 안 오른쪽에 붙는 단위(원, % 등). */
  trailing?: ReactNode;
  /** 금액처럼 자릿수를 맞춰 오른쪽으로 붙여야 하는 입력. */
  isNumeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { isInvalid = false, leading, trailing, isNumeric = false, className, ...rest },
  ref,
) {
  return (
    <span
      className={cn(
        styles.input,
        { [styles['input--invalid']]: isInvalid },
        { [styles['input--numeric']]: isNumeric },
        className,
      )}
    >
      {leading && (
        <span
          className={styles.input__affix}
          aria-hidden="true"
        >
          {leading}
        </span>
      )}
      <input
        ref={ref}
        className={styles.input__field}
        aria-invalid={isInvalid || undefined}
        {...rest}
      />
      {trailing && (
        <span
          className={styles.input__affix}
          aria-hidden="true"
        >
          {trailing}
        </span>
      )}
    </span>
  );
});

export default Input;
