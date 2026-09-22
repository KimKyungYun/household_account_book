'use client';

import { useId } from 'react';
import { cn } from '@/utils/ts/cn';
import styles from './FormField.module.scss';
import type { ReactElement, ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  /** 입력 요소. id·aria 배선을 위해 함수로 받는다. */
  children: (ids: { id: string; describedBy?: string }) => ReactElement;
  hint?: ReactNode;
  error?: string;
  isRequired?: boolean;
  /** 라벨을 시각적으로 숨기고 스크린리더에만 남긴다. */
  isLabelHidden?: boolean;
  className?: string;
}

/**
 * label + hint + error 배선을 한곳에 모은다.
 * 폼이 일곱 화면에 흩어져 있어 이걸 두지 않으면 접근성이 폼마다 어긋난다.
 */
export function FormField({
  label,
  children,
  hint,
  error,
  isRequired = false,
  isLabelHidden = false,
  className,
}: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn(styles.formfield, className)}>
      <label
        className={cn(styles.formfield__label, { [styles['formfield__label--hidden']]: isLabelHidden })}
        htmlFor={id}
      >
        {label}
        {isRequired && (
          <span
            className={styles.formfield__required}
            aria-hidden="true"
          >
            *
          </span>
        )}
      </label>

      {children({ id, describedBy })}

      {error && (
        <p
          className={styles.formfield__error}
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && hint && (
        <p
          className={styles.formfield__hint}
          id={hintId}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export default FormField;
