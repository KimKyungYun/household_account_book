type ClassValue = string | false | null | undefined | Record<string, boolean | undefined>;

/**
 * 클래스명 결합 유틸. 문자열과 { 클래스: 조건 } 객체를 함께 받는다.
 * CSS Modules 특성상 `styles.foo` 가 undefined 일 수 있어 falsy 값을 걸러낸다.
 */
export function cn(...values: ClassValue[]): string {
  const result: string[] = [];

  for (const value of values) {
    if (!value) continue;

    if (typeof value === 'string') {
      result.push(value);
      continue;
    }

    for (const [key, enabled] of Object.entries(value)) {
      if (enabled && key) result.push(key);
    }
  }

  return result.join(' ');
}
