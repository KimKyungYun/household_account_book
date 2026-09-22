import { describe, expect, it } from 'vitest';
import { nextOccurrence, occurrencesBetween } from '@/lib/domain/recurring';
import type { RecurrenceRule } from '@/lib/domain/recurring';

const monthly = (overrides: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  freq: 'MONTHLY',
  interval: 1,
  dayOfMonth: 25,
  startDate: '2026-01-01',
  ...overrides,
});

describe('occurrencesBetween — MONTHLY', () => {
  it('매월 같은 날을 낸다', () => {
    expect(occurrencesBetween(monthly(), '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-25',
      '2026-02-25',
      '2026-03-25',
      '2026-04-25',
    ]);
  });

  it('31일은 그 달 일수로 클램프된다 — 말일을 겸한다', () => {
    const result = occurrencesBetween(monthly({ dayOfMonth: 31 }), '2026-01-01', '2026-04-30');

    // 2026년은 평년이라 2월은 28일
    expect(result).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('윤년 2월은 29일로 클램프된다', () => {
    const result = occurrencesBetween(monthly({ dayOfMonth: 31, startDate: '2028-01-01' }), '2028-02-01', '2028-02-29');

    expect(result).toEqual(['2028-02-29']);
  });

  it('격월은 startDate 의 월을 기준으로 세어 드리프트가 없다', () => {
    const result = occurrencesBetween(monthly({ interval: 2, dayOfMonth: 31 }), '2026-01-01', '2026-12-31');

    // 1월 기준 → 1, 3, 5, 7, 9, 11월. 2월 클램프가 이후 기준을 밀지 않는다.
    expect(result).toEqual([
      '2026-01-31',
      '2026-03-31',
      '2026-05-31',
      '2026-07-31',
      '2026-09-30',
      '2026-11-30',
    ]);
  });

  it('startDate 이전은 만들지 않는다', () => {
    const result = occurrencesBetween(monthly({ startDate: '2026-03-10' }), '2026-01-01', '2026-04-30');

    expect(result).toEqual(['2026-03-25', '2026-04-25']);
  });

  it('endDate 를 넘기지 않는다', () => {
    const result = occurrencesBetween(monthly({ endDate: '2026-03-01' }), '2026-01-01', '2026-12-31');

    expect(result).toEqual(['2026-01-25', '2026-02-25']);
  });

  it('dayOfMonth 가 없으면 아무것도 만들지 않는다', () => {
    expect(occurrencesBetween(monthly({ dayOfMonth: null }), '2026-01-01', '2026-12-31')).toEqual([]);
  });
});

describe('occurrencesBetween — WEEKLY', () => {
  it('매주 해당 요일을 낸다', () => {
    const rule: RecurrenceRule = { freq: 'WEEKLY', interval: 1, weekday: 5, startDate: '2026-09-01' };

    // 2026-09-01 은 화요일 → 첫 금요일은 09-04
    expect(occurrencesBetween(rule, '2026-09-01', '2026-09-30')).toEqual([
      '2026-09-04',
      '2026-09-11',
      '2026-09-18',
      '2026-09-25',
    ]);
  });

  it('격주는 2주씩 건너뛴다', () => {
    const rule: RecurrenceRule = { freq: 'WEEKLY', interval: 2, weekday: 5, startDate: '2026-09-01' };

    expect(occurrencesBetween(rule, '2026-09-01', '2026-09-30')).toEqual(['2026-09-04', '2026-09-18']);
  });
});

describe('occurrencesBetween — YEARLY', () => {
  it('매년 같은 월·일을 낸다', () => {
    const rule: RecurrenceRule = {
      freq: 'YEARLY',
      interval: 1,
      monthOfYear: 2,
      dayOfMonth: 29,
      startDate: '2026-01-01',
    };

    // 평년 2월은 28일로 클램프, 윤년(2028)은 29일
    expect(occurrencesBetween(rule, '2026-01-01', '2028-12-31')).toEqual(['2026-02-28', '2027-02-28', '2028-02-29']);
  });
});

describe('nextOccurrence', () => {
  it('기준일 다음 발생일을 준다', () => {
    expect(nextOccurrence(monthly(), '2026-09-25')).toBe('2026-10-25');
  });

  it('끝난 규칙은 null 이다', () => {
    expect(nextOccurrence(monthly({ endDate: '2026-02-01' }), '2026-09-01')).toBeNull();
  });
});
