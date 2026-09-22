export type RecurrenceFreq = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** 1 = 매월/매주/매년, 2 = 격월/격주/격년. */
  interval: number;
  /** MONTHLY·YEARLY. 31 은 '말일'을 겸한다 — 그 달 일수로 클램프한다. */
  dayOfMonth?: number | null;
  /** WEEKLY. 0(일)~6(토) */
  weekday?: number | null;
  /** YEARLY. 1~12 */
  monthOfYear?: number | null;
  /** 'YYYY-MM-DD' */
  startDate: string;
  endDate?: string | null;
}

const DAY_MS = 86_400_000;

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * 규칙이 만들어 내는 발생일을 `[from, to]` 구간에서 오름차순으로 낸다.
 *
 * 규칙 두 가지가 실제 버그의 원천이라 여기에 못 박아 둔다.
 *  1. `dayOfMonth = 31` 은 그 달 일수로 **클램프**한다 → 2월은 28/29일. '말일'을 따로 두지 않는다.
 *  2. `interval > 1` 은 **startDate 의 월(또는 주)을 기준점**으로 세어 드리프트를 막는다.
 *     매번 '이전 발생일 + interval' 로 더하면 클램프된 달을 지날 때 기준이 밀린다.
 *
 * 모든 계산은 UTC 자정 기준 'YYYY-MM-DD' 로만 한다 — 로컬 타임존이 끼면 하루가 밀린다.
 */
export function occurrencesBetween(rule: RecurrenceRule, from: string, to: string): string[] {
  if (rule.interval < 1) return [];

  const start = toUtc(rule.startDate);
  const end = rule.endDate ? toUtc(rule.endDate) : null;
  const rangeStart = toUtc(from);
  const rangeEnd = toUtc(to);

  const lower = start > rangeStart ? start : rangeStart;
  const upper = end && end < rangeEnd ? end : rangeEnd;
  if (lower > upper) return [];

  const result: string[] = [];

  if (rule.freq === 'WEEKLY') {
    const weekday = rule.weekday;
    if (weekday === null || weekday === undefined) return [];

    // startDate 이후 처음 오는 해당 요일을 기준점으로 삼는다.
    const startWeekday = start.getUTCDay();
    const offset = (weekday - startWeekday + 7) % 7;
    const anchor = new Date(start.getTime() + offset * DAY_MS);
    const stepMs = rule.interval * 7 * DAY_MS;

    for (let time = anchor.getTime(); time <= upper.getTime(); time += stepMs) {
      if (time >= lower.getTime()) result.push(toIso(new Date(time)));
    }

    return result;
  }

  const dayOfMonth = rule.dayOfMonth;
  if (dayOfMonth === null || dayOfMonth === undefined) return [];

  if (rule.freq === 'YEARLY') {
    const monthOfYear = rule.monthOfYear;
    if (monthOfYear === null || monthOfYear === undefined) return [];

    const startYear = start.getUTCFullYear();
    for (let year = lower.getUTCFullYear(); year <= upper.getUTCFullYear(); year += 1) {
      if ((year - startYear) % rule.interval !== 0) continue;

      const monthIndex = monthOfYear - 1;
      const day = Math.min(dayOfMonth, daysInMonth(year, monthIndex));
      const occurrence = new Date(Date.UTC(year, monthIndex, day));
      if (occurrence >= lower && occurrence <= upper && occurrence >= start) result.push(toIso(occurrence));
    }

    return result;
  }

  // MONTHLY — startDate 의 월을 0 으로 보고 interval 배수인 달만 고른다.
  const startMonths = start.getUTCFullYear() * 12 + start.getUTCMonth();
  const lowerMonths = lower.getUTCFullYear() * 12 + lower.getUTCMonth();
  const upperMonths = upper.getUTCFullYear() * 12 + upper.getUTCMonth();

  for (let months = lowerMonths; months <= upperMonths; months += 1) {
    if ((months - startMonths) % rule.interval !== 0) continue;

    const year = Math.floor(months / 12);
    const monthIndex = months % 12;
    const day = Math.min(dayOfMonth, daysInMonth(year, monthIndex));
    const occurrence = new Date(Date.UTC(year, monthIndex, day));

    if (occurrence >= lower && occurrence <= upper && occurrence >= start) result.push(toIso(occurrence));
  }

  return result;
}

/** 다음 발생일 하나. 목록에서 '다음 예정'을 보여줄 때 쓴다. */
export function nextOccurrence(rule: RecurrenceRule, after: string): string | null {
  const from = toIso(new Date(toUtc(after).getTime() + DAY_MS));
  // 격년까지 감당하려면 넉넉히 3년을 본다.
  const to = toIso(new Date(Date.UTC(toUtc(from).getUTCFullYear() + 3, 11, 31)));

  return occurrencesBetween(rule, from, to)[0] ?? null;
}
