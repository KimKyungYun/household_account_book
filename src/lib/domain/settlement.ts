import { TOTAL_SHARE_BP } from '@/lib/seed/defaults';

export interface SettlementMember {
  id: string;
  displayName: string;
  colorHex: string;
  /** 공동지출 기본 분담률(bp). 구성원 합 = 10000. */
  shareBp: number;
}

export interface SettlementTransaction {
  /** 실제로 결제한 구성원. */
  memberId: string;
  /** 원 단위. 음수는 환불이며 상계된다. */
  amount: number;
  /** splitMode = CUSTOM 인 거래만 채워진다. 합 = 10000. */
  splits?: readonly { memberId: string; shareBp: number }[];
}

export interface SettlementLine {
  memberId: string;
  displayName: string;
  colorHex: string;
  shareBp: number;
  /** 실제로 낸 돈. */
  paidAmount: number;
  /** 분담률대로라면 냈어야 하는 돈. */
  owedAmount: number;
  /** paid − owed. 양수면 더 냈다. */
  balanceAmount: number;
}

export interface SettlementResult {
  sharedTotal: number;
  lines: SettlementLine[];
  /** 한쪽이 다른 쪽에 보낼 금액. 0원이면 null. */
  transfer: { fromMemberId: string; toMemberId: string; amount: number } | null;
}

/**
 * 공동지출 분담 정산.
 *
 * 산식: `balance = paid − owed`, `owed_M = Σ trunc(거래금액 × shareBp_M / 10000)`
 *
 * **반올림 잔여는 그 거래의 결제자에게 귀속시킨다.** 이 규칙이 없으면 각자 몫의 합이
 * 총액과 1~2원 어긋나고, 부부가 숫자를 못 믿게 된다. trunc 를 쓰는 이유도 같다 —
 * 환불(음수)에서 floor 는 한쪽으로만 치우친다.
 *
 * 호출자는 `type=EXPENSE AND splitMode <> 'PERSONAL'` 인 거래만 넘겨야 한다.
 * 이체·수입·개인지출은 정산 대상이 아니다.
 */
export function calculateSettlement(
  members: readonly SettlementMember[],
  transactions: readonly SettlementTransaction[],
): SettlementResult {
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  for (const member of members) {
    paid.set(member.id, 0);
    owed.set(member.id, 0);
  }

  let sharedTotal = 0;

  for (const tx of transactions) {
    sharedTotal += tx.amount;
    paid.set(tx.memberId, (paid.get(tx.memberId) ?? 0) + tx.amount);

    const shares = tx.splits && tx.splits.length > 0
      ? tx.splits
      : members.map((member) => ({ memberId: member.id, shareBp: member.shareBp }));

    let assigned = 0;
    for (const share of shares) {
      const portion = Math.trunc((tx.amount * share.shareBp) / TOTAL_SHARE_BP);
      owed.set(share.memberId, (owed.get(share.memberId) ?? 0) + portion);
      assigned += portion;
    }

    // 잔여 원은 결제자에게. 이래야 Σowed 가 항상 총액과 같다.
    const remainder = tx.amount - assigned;
    if (remainder !== 0) owed.set(tx.memberId, (owed.get(tx.memberId) ?? 0) + remainder);
  }

  const lines: SettlementLine[] = members.map((member) => {
    const paidAmount = paid.get(member.id) ?? 0;
    const owedAmount = owed.get(member.id) ?? 0;

    return {
      memberId: member.id,
      displayName: member.displayName,
      colorHex: member.colorHex,
      shareBp: member.shareBp,
      paidAmount,
      owedAmount,
      balanceAmount: paidAmount - owedAmount,
    };
  });

  return { sharedTotal, lines, transfer: buildTransfer(lines) };
}

/** 더 낸 사람에게 덜 낸 사람이 보낸다. 2인 가구라 이동은 한 번이면 끝난다. */
function buildTransfer(lines: readonly SettlementLine[]): SettlementResult['transfer'] {
  const creditor = lines.reduce<SettlementLine | null>(
    (best, line) => (line.balanceAmount > (best?.balanceAmount ?? 0) ? line : best),
    null,
  );
  const debtor = lines.reduce<SettlementLine | null>(
    (worst, line) => (line.balanceAmount < (worst?.balanceAmount ?? 0) ? line : worst),
    null,
  );

  if (!creditor || !debtor || creditor.memberId === debtor.memberId) return null;

  const amount = Math.min(creditor.balanceAmount, -debtor.balanceAmount);
  if (amount <= 0) return null;

  return { fromMemberId: debtor.memberId, toMemberId: creditor.memberId, amount };
}
