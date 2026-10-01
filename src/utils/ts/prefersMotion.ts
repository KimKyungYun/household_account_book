/**
 * 움직임을 보여도 되는지. OS 의 '동작 줄이기'를 켰으면 false.
 * CSS 는 `media.reduced-motion` 믹스인이 맡고, JS 로 돌리는 움직임(숫자 세기·차트)은 이것을 본다.
 */
export function prefersMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default prefersMotion;
