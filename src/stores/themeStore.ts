import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

/** ThemeScript(인라인 스크립트)와 공유하는 단일 출처. */
export const THEME_STORAGE_KEY = 'hab-theme';
export const DEFAULT_THEME: ThemeMode = 'light';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

/** 선택된 테마를 html[data-theme]에 반영 (테마 토큰 전환). */
function applyTheme(theme: ThemeMode) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

/**
 * persist 의 JSON 봉투 대신 'light' | 'dark' 평문으로 저장한다.
 *
 * ThemeScript 가 첫 페인트 전에 `localStorage.getItem(KEY)` 한 줄로 값을 읽어야
 * 테마 깜빡임(FOUC)이 안 생긴다. 봉투째 저장하면 스크립트가 스토어 내부 포맷
 * (`{"state":{"theme":...}}`)에 결합되므로 여기서 끊는다.
 */
const plainThemeStorage: StateStorage = {
  getItem: (name) => {
    // 서버 렌더 중에는 저장소가 없다. null 을 주면 persist 가 기본값을 유지한다.
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(name);
    if (raw !== 'light' && raw !== 'dark') return null;

    return JSON.stringify({ state: { theme: raw }, version: 0 });
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;

    const parsed = JSON.parse(value) as { state?: { theme?: ThemeMode } };
    const theme = parsed.state?.theme;
    if (theme === 'light' || theme === 'dark') window.localStorage.setItem(name, theme);
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem(name);
  },
};

const useThemeStore = create(
  persist<ThemeState>(
    (set, get) => ({
      theme: DEFAULT_THEME,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => plainThemeStorage),
      // 복원 직후 data-theme 을 맞춘다 — 다른 탭에서 바꾼 값으로 들어온 경우 대비.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

export function useTheme(): ThemeMode {
  return useThemeStore((s) => s.theme);
}

export function useToggleTheme(): () => void {
  return useThemeStore((s) => s.toggleTheme);
}

export default useThemeStore;
