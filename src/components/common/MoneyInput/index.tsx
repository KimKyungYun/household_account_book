'use client';

import { useState } from 'react';
import Input from '@/components/common/Input';
import formatMoney from '@/utils/ts/formatMoney';
import parseMoneyInput from '@/utils/ts/parseMoneyInput';

interface MoneyInputProps {
  /** 원 단위 정수. 미입력은 null 로 둔다 — '0원'과 구분해야 한다. */
  value: number | null;
  onChange: (value: number | null) => void;
  id?: string;
  placeholder?: string;
  isInvalid?: boolean;
  autoFocus?: boolean;
  ariaDescribedBy?: string;
}

/**
 * 금액 전용 입력.
 *
 * 가계부에서 가장 많이 만지는 칸이라 범용 Input 으로 뭉개지 않는다.
 *  - 치는 동안 3자리 콤마를 붙인다
 *  - inputMode="decimal" 로 모바일에서 숫자 키패드가 바로 뜬다
 *  - 값은 항상 정수(원). "1,500,000" · "15000원" 같은 입력도 받는다
 */
export function MoneyInput({
  value,
  onChange,
  id,
  placeholder = '0',
  isInvalid = false,
  autoFocus = false,
  ariaDescribedBy,
}: MoneyInputProps) {
  // 표시값을 따로 들고 있어야 "1,0" 처럼 치는 중간 상태가 튀지 않는다.
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value === null ? '' : formatMoney(value));

  return (
    <Input
      id={id}
      isNumeric
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      trailing="원"
      value={display}
      isInvalid={isInvalid}
      autoFocus={autoFocus}
      aria-describedby={ariaDescribedBy}
      onChange={(event) => {
        const next = event.target.value;
        const parsed = parseMoneyInput(next);
        setDraft(parsed === null ? next : formatMoney(parsed));
        onChange(parsed);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export default MoneyInput;
