'use client';

import Amount from '@/components/common/Amount';
import { useCountUp } from '@/hooks/useCountUp';
import type { ComponentProps } from 'react';

type CountUpAmountProps = ComponentProps<typeof Amount>;

/**
 * 처음 그려질 때 0 에서 값까지 올라가는 금액.
 *
 * 데이터가 온 뒤에 마운트되는 자리에 둔다 — 스켈레톤과 자리를 바꿔 끼우면 응답이
 * 도착하는 순간부터 센다. 그 뒤로 값이 바뀌면(저장·다시 받기) 세지 않고 바로 바꾼다.
 */
export function CountUpAmount({ value, ...rest }: CountUpAmountProps) {
  const counted = useCountUp(value);

  return (
    <Amount
      {...rest}
      value={counted}
    />
  );
}

export default CountUpAmount;
