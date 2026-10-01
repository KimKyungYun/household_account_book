'use client';

import Card from '@/components/common/Card';
import SegmentedControl from '@/components/common/SegmentedControl';
import { useTheme } from '@/stores/themeStore';
import useThemeStore from '@/stores/themeStore';

const THEME_OPTIONS = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
] as const;

export default function ThemeSection() {
  const theme = useTheme();
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <Card
      title="테마"
      description="이 기기에만 저장돼요"
    >
      <SegmentedControl
        name="theme"
        options={THEME_OPTIONS}
        value={theme}
        onChange={(value) => setTheme(value === 'dark' ? 'dark' : 'light')}
        ariaLabel="테마"
      />
    </Card>
  );
}
