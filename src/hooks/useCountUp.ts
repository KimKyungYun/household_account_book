'use client';

import { useEffect, useState } from 'react';

/** 감속 곡선. 끝에서 천천히 멎어야 숫자가 '멈췄다'고 느껴진다. */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefersMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 숫자가 0 에서 목표까지 올라간다.
 *
 * **처음 보여줄 때만 센다.** 값이 바뀔 때마다 다시 세면 거래를 한 건 등록할 때마다
 * 합계가 0 에서 다시 올라가 성가시다. 그 뒤로는 새 값을 곧바로 보여준다.
 *
 * 세는 상태를 금액이 아니라 **진행도(0~1)** 로 들고 있는다. 그래야 값이 바뀌어도
 * 효과를 다시 걸 필요가 없고, effect 안에서 동기적으로 setState 하지 않아도 된다.
 * `prefers-reduced-motion` 이면 진행도가 1 로 시작해 목표값이 바로 보인다.
 */
export function useCountUp(target: number, duration = 800): number {
  const [progress, setProgress] = useState(() => (prefersMotion() ? 0 : 1));

  // '한 번만 센다'를 ref 로 막지 않는다. deps 가 duration 하나뿐이라 이 효과는 마운트할 때
  // 한 번만 도는데, ref 로 또 막으면 Strict Mode 가 mount→cleanup→mount 로 두 번 돌릴 때
  // 두 번째에서 rAF 를 걸지 않아 **숫자가 0 에 멈춘다.** 실제로 화면에 0원이 떴다.
  useEffect(() => {
    if (!prefersMotion()) return undefined;

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const next = Math.min((now - start) / duration, 1);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [duration]);

  if (progress >= 1) return target;

  return Math.round(target * easeOut(progress));
}

export default useCountUp;
