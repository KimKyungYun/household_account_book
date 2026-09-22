import { CategoryKind, PaymentMethodKind, SplitMode } from '@/generated/prisma/enums';

interface DefaultCategory {
  name: string;
  children: readonly string[];
  /**
   * 대분류의 색. 소분류는 이 색을 물려받는다.
   * 도넛 조각·거래 목록의 점·배지가 모두 이 값을 쓰므로 화면마다 색이 갈리지 않는다.
   */
  colorHex: string;
  /** 미지정이면 SHARED. 용돈·미용처럼 개인 소비가 기본인 것만 명시한다. */
  defaultSplitMode?: SplitMode;
}

interface DefaultCategoryGroup {
  kind: CategoryKind;
  categories: readonly DefaultCategory[];
}

/**
 * 기본 카테고리 트리. 시드 스크립트와 온보딩 API 가 **같은 상수**를 쓴다.
 *
 * 모든 대분류에 '기타' 소분류를 둔다 — "대분류만 고르고 싶다"는 요구를
 * 리프(소분류) 강제와 충돌 없이 흡수하기 위한 장치다.
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategoryGroup[] = [
  {
    kind: CategoryKind.EXPENSE,
    categories: [
      { name: '식비', colorHex: '#3b82f6', children: ['주식/장보기', '외식', '배달', '카페/간식', '주류', '기타'] },
      { name: '교통/차량', colorHex: '#d97706', children: ['대중교통', '택시', '유류비', '주차/통행료', '차량정비', '자동차보험/세금', '기타'] },
      { name: '주거/통신', colorHex: '#0ea5e9', children: ['월세/관리비', '전기/가스/수도', '인터넷/TV', '휴대폰', '주택대출이자', '가구/가전', '기타'] },
      { name: '의료/건강', colorHex: '#f59e0b', children: ['병원', '약국', '건강검진', '보험료', '운동/헬스', '기타'] },
      { name: '교육', colorHex: '#6366f1', children: ['학원/수업료', '도서', '온라인강의', '자녀교육', '기타'] },
      { name: '문화/여가', colorHex: '#0d9488', children: ['영화/공연', '여행/숙박', '취미', '구독서비스', '게임', '기타'] },
      {
        name: '의류/미용',
        colorHex: '#8b5cf6',
        children: ['의류', '신발/잡화', '미용실', '화장품', '세탁', '기타'],
        defaultSplitMode: SplitMode.PERSONAL,
      },
      { name: '경조사/선물', colorHex: '#65a30d', children: ['결혼/장례', '명절/용돈', '선물', '기부', '기타'] },
      { name: '생활/기타', colorHex: '#db2777', children: ['생활용품', '반려동물', '수수료/이자', '세금/공과금', '기타'] },
      {
        name: '용돈/개인',
        colorHex: '#64748b',
        children: ['남편 용돈', '와이프 용돈', '개인 기타'],
        defaultSplitMode: SplitMode.PERSONAL,
      },
    ],
  },
  {
    kind: CategoryKind.INCOME,
    categories: [
      { name: '근로소득', colorHex: '#16a34a', children: ['급여', '상여/성과급', '수당', '기타'] },
      { name: '사업/부업', colorHex: '#0891b2', children: ['사업소득', '부업', '프리랜스', '기타'] },
      { name: '금융소득', colorHex: '#0d9488', children: ['이자', '배당', '투자수익', '기타'] },
      { name: '기타수입', colorHex: '#64748b', children: ['정부지원금', '환급/환불', '중고판매', '용돈/축의금', '기타'] },
    ],
  },
  {
    // 이체는 수입도 지출도 아니다. 카드대금 납부·현금 인출·예적금을 지출로 잡으면
    // "순저축 = 수입 − 지출" 이 무너지고 지출이 두 배로 보인다.
    kind: CategoryKind.TRANSFER,
    categories: [
      { name: '계좌이동', colorHex: '#64748b', children: ['계좌간 이체', '카드대금 납부', '현금 인출', '기타'] },
      { name: '저축/투자', colorHex: '#0891b2', children: ['예적금', '투자금 입금', '대출 원금상환', '기타'] },
    ],
  },
];

export const DEFAULT_PAYMENT_METHODS: readonly { name: string; kind: PaymentMethodKind }[] = [
  { name: '현금', kind: PaymentMethodKind.CASH },
  { name: '체크카드', kind: PaymentMethodKind.DEBIT_CARD },
  { name: '신용카드', kind: PaymentMethodKind.CREDIT_CARD },
  { name: '계좌이체', kind: PaymentMethodKind.BANK_TRANSFER },
  { name: '간편결제', kind: PaymentMethodKind.EASY_PAY },
  { name: '상품권', kind: PaymentMethodKind.GIFT_CARD },
];

/** 구성원 기본값 — slot 0 이 남편, 1 이 와이프. 표시명은 온보딩에서 바꿀 수 있다. */
export const DEFAULT_MEMBERS = [
  { slot: 0, displayName: '남편', colorHex: '#1f6feb', defaultShareBp: 5000 },
  { slot: 1, displayName: '와이프', colorHex: '#d97706', defaultShareBp: 5000 },
] as const;

/** 분담률 합계는 항상 이 값이어야 한다 (basis point). */
export const TOTAL_SHARE_BP = 10_000;
