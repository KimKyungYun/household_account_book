/**
 * 금액을 원 단위 콤마 표기로 만든다. 부호는 붙이지 않는다 — Amount 컴포넌트가 붙인다.
 * 값은 항상 정수(원)다.
 */
export default function formatMoney(amount: number): string {
  return Math.abs(Math.trunc(amount)).toLocaleString('ko-KR');
}

/** 만·억 경계. 한국어는 네 자리마다 단위가 바뀐다. */
const MAN = 10_000;
const EOK = 100_000_000;

/**
 * 좁은 자리에 넣을 축약 표기. `1,234,567,890` → `12억 3,457만`.
 *
 * 차트 축의 `compactMoney` 와 다르다 — 축은 눈금이라 `12.3억` 처럼 더 짧아야 하고,
 * 이쪽은 사람이 금액으로 읽는 자리라 만 단위까지 남긴다. 둘을 한 함수로 묶으면
 * 축이 길어지거나 금액이 뭉개진다.
 *
 * **값이 깎이므로** 쓰는 쪽이 정확한 금액을 `title` 로 함께 남겨야 한다.
 */
export function formatMoneyCompact(amount: number): string {
  const abs = Math.abs(Math.trunc(amount));
  if (abs < MAN) return abs.toLocaleString('ko-KR');

  if (abs < EOK) {
    const man = Math.round(abs / MAN);
    // 반올림이 1억을 채우면 억으로 올린다 — `10,000만` 이 아니라 `1억` 이다.
    return man >= MAN ? '1억' : `${man.toLocaleString('ko-KR')}만`;
  }

  const eok = Math.floor(abs / EOK);
  const man = Math.round((abs % EOK) / MAN);
  // 반올림이 1억을 채우면 억을 올린다 — `1억 10,000만` 이 나오지 않게.
  if (man >= MAN) return `${(eok + 1).toLocaleString('ko-KR')}억`;

  return man === 0 ? `${eok.toLocaleString('ko-KR')}억` : `${eok.toLocaleString('ko-KR')}억 ${man.toLocaleString('ko-KR')}만`;
}
