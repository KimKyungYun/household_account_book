'use client';

import { useTheme, useToggleTheme } from '@/stores/themeStore';
import styles from './ThemeToggle.module.scss';

export default function ThemeToggle() {
  const theme = useTheme();
  const toggleTheme = useToggleTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={styles.themetoggle}
      onClick={toggleTheme}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      <span
        className={styles.themetoggle__icon}
        aria-hidden="true"
      >
        {isDark ? '☾' : '☀'}
      </span>
    </button>
  );
}
