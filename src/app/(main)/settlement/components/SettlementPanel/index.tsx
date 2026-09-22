'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Amount from '@/components/common/Amount';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import Skeleton from '@/components/common/Skeleton';
import Table from '@/components/common/Table';
import SplitScale from '@/components/layout/SplitScale';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { getSettlement } from '@/service/settlement';
import { currentYearMonth, formatYearMonthLabel, shiftYearMonth } from '@/utils/ts/formatDate';
import type { Column } from '@/components/common/Table';
import type { SettlementLineDto } from '@/service/settlement/type';
import styles from './SettlementPanel.module.scss';

export default function SettlementPanel() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.SETTLEMENT.MONTH(yearMonth),
    queryFn: () => getSettlement(yearMonth),
  });

  const columns: Column<SettlementLineDto>[] = [
    {
      key: 'member',
      header: '사람',
      render: (line) => (
        <span className={styles.settlementpanel__member}>
          <span
            className={styles.settlementpanel__dot}
            style={{ backgroundColor: line.colorHex }}
            aria-hidden="true"
          />
          {line.displayName}
        </span>
      ),
    },
    {
      key: 'shareBp',
      header: '나누는 비율',
      align: 'right',
      render: (line) => `${(line.shareBp / 100).toFixed(0)}%`,
    },
    {
      key: 'owed',
      header: '내야 할 돈',
      align: 'right',
      render: (line) => (
        <Amount
          value={line.owedAmount}
          size="small"
        />
      ),
    },
    {
      key: 'paid',
      header: '실제로 낸 돈',
      align: 'right',
      render: (line) => (
        <Amount
          value={line.paidAmount}
          size="small"
        />
      ),
    },
    {
      key: 'balance',
      header: '차액',
      align: 'right',
      render: (line) => (
        <Amount
          value={line.balanceAmount}
          tone={line.balanceAmount === 0 ? 'neutral' : line.balanceAmount > 0 ? 'income' : 'expense'}
          size="small"
          signMode="value"
        />
      ),
    },
  ];

  const creditor = data?.transfer ? data.lines.find((line) => line.memberId === data.transfer?.toMemberId) : null;
  const debtor = data?.transfer ? data.lines.find((line) => line.memberId === data.transfer?.fromMemberId) : null;

  return (
    <>
      <Card>
        <div className={styles.settlementpanel__month}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setYearMonth((current) => shiftYearMonth(current, -1))}
            iconLeft={<Icon
              name="chevronLeft"
              size={16}
            />}
          >
            지난 달
          </Button>
          <span className={styles.settlementpanel__monthlabel}>{formatYearMonthLabel(yearMonth)}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setYearMonth((current) => shiftYearMonth(current, 1))}
            iconRight={<Icon
              name="chevronRight"
              size={16}
            />}
          >
            다음 달
          </Button>
        </div>
      </Card>

      {isPending ? (
        <Skeleton height={200} />
      ) : !data || data.sharedTotal === 0 ? (
        <Card>
          <EmptyState
            title="같이 쓴 돈이 없습니다"
            description="거래를 '같이 쓴 돈'으로 등록하면 여기에 표시됩니다."
          />
        </Card>
      ) : (
        <>
          <Card
            tone="feature"
            title="나누기 결과"
            description="같이 쓴 돈을 설정한 비율로 나눈 결과입니다. 각자 쓴 돈과 옮긴 돈은 제외됩니다."
          >
            <div className={styles.settlementpanel__verdict}>
              {data.transfer && debtor && creditor ? (
                <>
                  <p className={styles.settlementpanel__verdicttext}>
                    <strong>{debtor.displayName}</strong>이(가) <strong>{creditor.displayName}</strong>에게
                  </p>
                  <Amount
                    value={data.transfer.amount}
                    size="display"
                  />
                </>
              ) : (
                <p className={styles.settlementpanel__verdicttext}>분담이 맞습니다. 주고받을 돈이 없습니다.</p>
              )}
              <p className={styles.settlementpanel__note}>
                같이 쓴 돈 <Amount
                  value={data.sharedTotal}
                  size="small"
                /> 기준입니다. 각자 쓴 돈과 옮긴 돈은 제외되어 있습니다.
              </p>
            </div>
          </Card>

          <Card
            title="실제로 낸 비율"
            description="색의 길이는 각자 실제로 낸 비율이고, 점선은 설정한 비율입니다."
          >
            <SplitScale settlement={data} />
          </Card>

          <Card
            isFlush
            title="계산 내역"
            description="차액은 실제로 낸 금액에서 내야 할 금액을 뺀 값입니다."
          >
            <Table
              caption={`${formatYearMonthLabel(yearMonth)} 분담 정산 내역`}
              columns={columns}
              rows={data.lines}
              getRowKey={(line) => line.memberId}
            />
          </Card>
        </>
      )}
    </>
  );
}
