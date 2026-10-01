'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import styles from './FetchingBar.module.scss';

/** 이보다 빨리 끝나는 요청에는 막대를 띄우지 않는다. 잠깐 번쩍이면 오히려 거슬린다. */
const SHOW_DELAY_MS = 250;

/**
 * 화면 맨 위의 얇은 진행 막대 — 서버와 주고받는 중이라는 표시.
 *
 * 처음 그릴 때는 각 카드의 스켈레톤이 기다림을 알린다. 이 막대는 그 뒤의 일을 맡는다 —
 * 저장 후 숫자를 다시 받아 오는 동안, 달을 넘겨 새 달을 받는 동안처럼
 * 화면은 그대로인데 곧 바뀔 참인 순간이다. 표시가 없으면 숫자가 말없이 바뀐다.
 */
export default function FetchingBar() {
  // 화면에 걸린 쿼리만 센다. 앞뒤 달을 미리 받는 prefetch 는 아무도 기다리지 않으므로 표시하지 않는다.
  const isBusy = useIsFetching({ predicate: (query) => query.getObserversCount() > 0 }) + useIsMutating() > 0;
  const [isVisible, setIsVisible] = useState(false);

  // 켜는 것도 끄는 것도 타이머로 한다. 켤 때만 기다리고, 끌 때는 다음 틱에 바로 끈다.
  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(isBusy), isBusy ? SHOW_DELAY_MS : 0);

    return () => window.clearTimeout(timer);
  }, [isBusy]);

  return (
    <div
      className={styles.fetchingbar}
      data-visible={isBusy && isVisible}
      role="progressbar"
      aria-label="불러오는 중"
      aria-hidden={!(isBusy && isVisible)}
    >
      <span className={styles.fetchingbar__track} />
    </div>
  );
}
