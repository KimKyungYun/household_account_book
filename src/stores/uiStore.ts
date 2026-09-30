import { create } from 'zustand';

interface UiState {
  /** 모바일 전체 메뉴 드로어. */
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

/**
 * 화면 여기저기서 나눠 쓰는 UI 상태.
 *
 * 드로어를 여는 버튼이 상단바와 하단탭 **두 곳**에 있고, 정작 드로어는 세 번째 자리에서
 * 그려진다. 상태를 AppShell 이 들고 내려 주려면 셸이 클라이언트 컴포넌트가 되어야 하는데,
 * 그러면 화면 전체가 클라이언트 번들로 넘어간다. 셸을 서버에 두기 위해 스토어로 뺀다.
 */
export const useUiStore = create<UiState>((set) => ({
  isMenuOpen: false,
  openMenu: () => set({ isMenuOpen: true }),
  closeMenu: () => set({ isMenuOpen: false }),
}));
