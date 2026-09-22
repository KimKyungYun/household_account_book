'use client';

import { cn } from '@/utils/ts/cn';
import styles from './Button.module.scss';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** reset 은 쓰지 않는다. 폼 제출만 구분하면 된다. */
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
  size?: ButtonSize;
  isFullWidth?: boolean;
  isLoading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isFullWidth = false,
  isLoading = false,
  iconLeft,
  iconRight,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      className={cn(
        styles.btn,
        styles[`btn--${variant}`],
        styles[`btn--${size}`],
        { [styles['btn--full']]: isFullWidth },
        { [styles['btn--loading']]: isLoading },
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {iconLeft && (
        <span
          className={styles.btn__icon}
          aria-hidden="true"
        >
          {iconLeft}
        </span>
      )}
      <span className={styles.btn__label}>{children}</span>
      {iconRight && (
        <span
          className={styles.btn__icon}
          aria-hidden="true"
        >
          {iconRight}
        </span>
      )}
    </button>
  );
}

export default Button;
