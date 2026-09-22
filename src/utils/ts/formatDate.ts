import dayjs from 'dayjs';

/** 앱 안에서 날짜는 항상 'YYYY-MM-DD' 문자열로 다룬다. Date 객체를 돌려 쓰지 않는다. */
export type DateString = string;

export const KST_OFFSET_MINUTES = 9 * 60;

/** 'Asia/Seoul' 기준 오늘. 서버가 UTC 여도 날짜가 밀리지 않는다. */
export function todayInSeoul(): DateString {
  const now = new Date();
  const seoul = new Date(now.getTime() + (KST_OFFSET_MINUTES + now.getTimezoneOffset()) * 60_000);

  return dayjs(seoul).format('YYYY-MM-DD');
}

export function currentYearMonth(): string {
  return todayInSeoul().slice(0, 7);
}

export function formatDateLabel(date: DateString): string {
  return dayjs(date).format('M월 D일 (ddd)');
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');

  return `${year}년 ${Number(month)}월`;
}

/** 해당 월의 [첫날, 다음달 첫날) 반개구간. 기간 필터는 항상 이 형태로 넘긴다. */
/**
 * 그 달의 마지막 날짜. `monthRange` 의 `toExclusive`(다음 달 1일)와 달리 포함 경계다.
 * 반복 거래를 그 달 끝까지 미리 만들 때 상한으로 쓴다.
 */
export function monthEnd(yearMonth: string): DateString {
  return dayjs(`${yearMonth}-01`).endOf('month').format('YYYY-MM-DD');
}

export function monthRange(yearMonth: string): { from: DateString; toExclusive: DateString } {
  const start = dayjs(`${yearMonth}-01`);

  return { from: start.format('YYYY-MM-DD'), toExclusive: start.add(1, 'month').format('YYYY-MM-DD') };
}

export function shiftYearMonth(yearMonth: string, months: number): string {
  return dayjs(`${yearMonth}-01`).add(months, 'month').format('YYYY-MM');
}
