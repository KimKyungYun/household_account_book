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
export function FormField(props: FormFieldProps) {
  const {
    label,
    children,
    hint,
    error,
    isRequired = false,
    isLabelHidden = false,
    className,
  } = props;
  const id = useId();
  // 안내도 없고 오류를 받지도 않는 칸(목록의 거르기 칸 등)은 빈 자리를 잡지 않는다.
  // `error={...}` 를 넘긴 칸은 지금 값이 없어도 오류가 뜰 수 있는 칸이다.
  const hasMessageSlot = Boolean(hint) || 'error' in props;
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

      {/*
        안내와 오류는 같은 한 줄 자리를 나눠 쓴다. 자리는 늘 비워 두어, 오류가 뜰 때 아래 칸이
        밀려 내려가며 폼이 덜컹이지 않게 한다. 오류가 생기면 안내 자리를 대신 차지한다.
        aria-live 영역은 처음부터 있어야 바뀐 글을 화면 판독기가 읽는다.
      */}
      {hasMessageSlot && (
        <div
          className={styles.formfield__message}
          aria-live="polite"
        >
          {error ? (
            <p
              className={styles.formfield__error}
              id={errorId}
            >
              {error}
            </p>
          ) : (
            hint && (
              <p
                className={styles.formfield__hint}
                id={hintId}
              >
                {hint}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default FormField;
