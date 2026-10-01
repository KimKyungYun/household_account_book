import { cn } from '@/utils/ts/cn';
import styles from './Reveal.module.scss';
import type { HTMLAttributes } from 'react';

/**
 * 스켈레톤 자리에 내용이 들어올 때 살짝 떠오르며 나타나게 한다.
 *
 * 스켈레톤과 **다른 요소로** 바뀌어야 다시 마운트되어 등장이 한 번 돈다. 그래서
 * 로딩 분기의 내용 쪽만 이것으로 감싼다. 다시 받아 오는 동안에는 그대로 있어 깜빡이지 않는다.
 * 목록은 줄마다 차례로 뜨는 `motion.enter-stagger` 를 쓰고 이것으로 감싸지 않는다.
 */
export function Reveal({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(styles.reveal, className)}
    />
  );
}

export default Reveal;
