import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/stores/themeStore';

/**
 * 첫 페인트 전에 html[data-theme] 을 심는 동기 스크립트.
 *
 * 쿠키를 읽어 서버에서 렌더하는 방법도 있지만, 그러면 root layout 이 동적 렌더로
 * 내려가 앱 전체의 정적 셸을 잃는다. 이 스크립트는 React 트리 밖의 속성만 건드리므로
 * hydration mismatch 도 없다.
 *
 * 저장 키·기본값은 themeStore 의 상수를 그대로 보간해 문자열 중복을 만들지 않는다.
 */
export default function ThemeScript() {
  const script = `
(function(){
  try {
    var k = ${JSON.stringify(THEME_STORAGE_KEY)};
    var t = localStorage.getItem(k);
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : ${JSON.stringify(DEFAULT_THEME)};
    }
    document.documentElement.dataset.theme = t;
  } catch (e) {
    document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
  }
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
