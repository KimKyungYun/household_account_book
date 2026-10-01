/**
 * 분류 아이콘(이모지).
 *
 * 분류에 아이콘을 직접 정해 두었으면 그것을 쓰고, 없으면 이름으로 고른다 — 기본 분류는
 * 이름이 정해져 있어 표로 바로 찾고, 사용자가 만든 분류는 이름에 든 낱말로 짐작한다.
 * 그래도 못 고르면 돈 봉투로 둔다.
 */
const BY_NAME: Record<string, string> = {
  식비: '🍚',
  '교통/차량': '🚗',
  '주거/통신': '🏠',
  '의료/건강': '💊',
  교육: '📚',
  '문화/여가': '🎬',
  '의류/미용': '👕',
  '경조사/선물': '🎁',
  '생활/기타': '🧺',
  '용돈/개인': '👛',
  근로소득: '💼',
  '사업/부업': '🏪',
  금융소득: '📈',
  기타수입: '💰',
  계좌이동: '🔁',
  '저축/투자': '🐷',
};

const BY_KEYWORD: readonly (readonly [RegExp, string])[] = [
  [/식|밥|외식|배달|카페|간식|커피|장보기/, '🍚'],
  [/교통|차량|주유|유류|택시|버스|지하철|주차/, '🚗'],
  [/주거|월세|관리비|통신|휴대폰|인터넷|가전|가구/, '🏠'],
  [/의료|병원|약국|건강|헬스|운동|보험/, '💊'],
  [/교육|학원|도서|책|강의|수업/, '📚'],
  [/문화|여가|영화|공연|여행|숙박|취미|게임|구독/, '🎬'],
  [/의류|옷|미용|화장|신발|세탁/, '👕'],
  [/경조|선물|축의|기부|명절/, '🎁'],
  [/생활|반려|세금|공과금|수수료/, '🧺'],
  [/용돈|개인/, '👛'],
  [/급여|월급|근로|상여|수당|성과/, '💼'],
  [/사업|부업|프리/, '🏪'],
  [/금융|이자|배당|투자/, '📈'],
  [/저축|적금|예금/, '🐷'],
  [/이체|이동|카드대금|인출/, '🔁'],
];

export const FALLBACK_CATEGORY_EMOJI = '💸';

function emojiOfName(name: string): string | undefined {
  return BY_NAME[name] ?? BY_KEYWORD.find(([pattern]) => pattern.test(name))?.[1];
}

/**
 * @param parentName 소분류라면 그 상위 분류 이름. 소분류 이름으로 못 고르면 상위 분류로 고른다 —
 *   '점심'·'편의점'처럼 낱말이 표에 없어도 '식비' 아래라면 밥그릇이 맞다.
 */
export function categoryEmoji(name: string, icon?: string | null, parentName?: string | null): string {
  if (icon) return icon;

  return emojiOfName(name) ?? (parentName ? emojiOfName(parentName) : undefined) ?? FALLBACK_CATEGORY_EMOJI;
}

export default categoryEmoji;
