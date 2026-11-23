/** 초기화하면 지워지는 데이터 건수. */
export interface ResetCountsDto {
  transactions: number;
  assets: number;
  loans: number;
  recurringRules: number;
}

/** 초기화 확인 창에 표시할 정보. 거래 기간은 지우기 전에 엑셀로 내려받을 범위다. */
export interface ResetSummaryDto extends ResetCountsDto {
  /** 가장 이른·늦은 거래 날짜 'YYYY-MM-DD'. 거래가 없으면 null. */
  firstDate: string | null;
  lastDate: string | null;
}
