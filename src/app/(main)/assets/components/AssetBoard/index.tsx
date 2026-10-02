'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import Amount from '@/components/common/Amount';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Reveal from '@/components/common/Reveal';
import CountUpAmount from '@/components/common/CountUpAmount';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import CustomEcharts from '@/components/common/CustomEcharts';
import EmptyState from '@/components/common/EmptyState';
import Icon from '@/components/common/Icon';
import ProgressBar from '@/components/common/ProgressBar';
import Skeleton, { SkeletonRows } from '@/components/common/Skeleton';
import { isApiError } from '@/interface/errorType';
import { QUERY_KEY } from '@/interface/key/queryKey';
import { quietCategoryAxis, quietValueAxis, useBaseOption } from '@/components/common/CustomEcharts/useBaseOption';
import { deleteAsset, getAssets, getAssetTrend } from '@/service/asset';
import { currentYearMonth, formatYearMonthLabel, shiftYearMonth } from '@/utils/ts/formatDate';
import type { AssetDto } from '@/service/asset/type';
import AssetFormModal from '../AssetFormModal';
import styles from './AssetBoard.module.scss';
import type { EChartsOption } from 'echarts';

const KIND_LABEL: Record<AssetDto['kind'], string> = {
  SAVINGS: '적금·예금',
  INVESTMENT: '투자',
  CASH: '현금',
  PENSION: '연금',
  OTHER: '기타',
};

const TREND_MONTHS = 11;

export default function AssetBoard() {
  const [editing, setEditing] = useState<AssetDto | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetDto | null>(null);
  const queryClient = useQueryClient();
  const { colors, base } = useBaseOption();

  const { data, isPending } = useQuery({
    queryKey: QUERY_KEY.ASSET.LIST(),
    queryFn: getAssets,
  });

  const to = currentYearMonth();
  const from = shiftYearMonth(to, -TREND_MONTHS);
  const trendParams = { from, to };
  const trend = useQuery({
    queryKey: QUERY_KEY.ASSET.TREND(trendParams),
    queryFn: () => getAssetTrend(trendParams),
  });

  const total = data?.totalBalance ?? 0;

  const removal = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: ({ keptTransactionCount }) => {
      toast.success(
        keptTransactionCount > 0
          ? `지웠어요. 이미 넣은 ${keptTransactionCount}건은 거래에 그대로 남아 있어요.`
          : '지웠어요.',
      );
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ASSET.ALL });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY.TRANSACTION.ALL });
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '지우지 못했어요.'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.ASSET.ALL });
  };

  const points = trend.data ?? [];
  const trendOption: EChartsOption = {
    ...base,
    xAxis: quietCategoryAxis(colors, points.map((point) => `${Number(point.yearMonth.slice(5))}월`)),
    yAxis: quietValueAxis(colors),
    series: [
      {
        name: '모은 돈',
        type: 'line',
        data: points.map((point) => point.balance),
        smooth: 0.35,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: colors.income },
        itemStyle: { color: colors.income },
        areaStyle: { opacity: 0.12, color: colors.income },
      },
    ],
  };

  if (isPending) {
    return (
      <>
        <Card
          tone="feature"
          title="모은 돈"
          icon="🐷"
          description="적금·투자에 넣은 돈이 자산마다 차곡차곡 쌓여요"
        >
          <div
            className={styles.assetboard__total}
            role="status"
            aria-label="불러오는 중"
          >
            <Skeleton
              width={36}
              height={14}
            />
            <Skeleton
              width={220}
              height={44}
            />
          </div>
        </Card>
        <Card
          title="자산 목록"
          icon="💎"
          isFlush
        >
          <SkeletonRows count={3} />
        </Card>
      </>
    );
  }

  const assets = data?.assets ?? [];
  const active = assets.filter((asset) => asset.isActive);
  const archived = assets.filter((asset) => !asset.isActive);

  return (
    <>
      <Card
        tone="feature"
        title="모은 돈"
        icon="🐷"
        description="적금·투자에 넣은 돈이 자산마다 차곡차곡 쌓여요"
        action={
          <Button
            size="sm"
            iconLeft={<Icon
              name="plus"
              size={16}
            />}
            onClick={() => setIsCreating(true)}
          >
            자산 추가
          </Button>
        }
      >
        <Reveal className={styles.assetboard__summary}>
          <p className={styles.assetboard__total}>
            <span className={styles.assetboard__totallabel}>전체</span>
            <CountUpAmount
              value={total}
              tone="income"
              size="hero"
              isFit
            />
          </p>
          {(data?.addedThisMonth ?? 0) > 0 && (
            <p className={styles.assetboard__month}>
              {formatYearMonthLabel(to)}에 <Amount
                value={data?.addedThisMonth ?? 0}
                tone="income"
                size="small"
              /> 넣었어요.
            </p>
          )}
        </Reveal>
      </Card>

      {points.some((point) => point.balance !== 0) && (
        <Card
          title="모은 돈 추이"
          icon="📈"
          description="최근 1년 동안 이만큼 모였어요. 왼쪽 숫자는 만 원 단위예요"
        >
          <CustomEcharts
            option={trendOption}
            height={200}
            ariaLabel="최근 1년 자산 추이 꺾은선 차트"
          />
        </Card>
      )}

      <Card
        title="자산 목록"
        icon="💎"
        description="눌러서 고치거나 지울 수 있어요"
        isFlush
      >
        {active.length === 0 ? (
          <EmptyState
            title="아직 등록한 자산이 없어요"
            description="적금이나 주식처럼 돈을 모으는 통을 만들어 보세요. 거래를 적을 때 어디에 모을지 고를 수 있어요."
          />
        ) : (
          <ul className={styles.assetboard__list}>
            {active.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  className={styles.assetboard__row}
                  style={{ borderInlineStartColor: asset.colorHex ?? 'var(--member-a)' }}
                  onClick={() => setEditing(asset)}
                >
                  <span className={styles.assetboard__main}>
                    <span className={styles.assetboard__name}>
                      {asset.name}
                      <Badge tone="neutral">{KIND_LABEL[asset.kind]}</Badge>
                      {asset.owner && <Badge tone="neutral">{asset.owner.displayName}</Badge>}
                      {asset.autoDeposit && (
                        <Badge tone="primary">
                          매월 {asset.autoDeposit.dayOfMonth}일{' '}
                          {asset.autoDeposit.amount.toLocaleString('ko-KR')}원
                        </Badge>
                      )}
                    </span>
                    <span className={styles.assetboard__meta}>
                      {asset.openingBalance > 0 && `시작 ${asset.openingBalance.toLocaleString('ko-KR')}원 · `}
                      넣은 돈 {asset.addedAmount.toLocaleString('ko-KR')}원
                      {asset.transactionCount > 0 && ` (${asset.transactionCount}건)`}
                    </span>
                    {asset.targetAmount && (
                      <span className={styles.assetboard__goal}>
                        <ProgressBar
                          ratio={asset.balance / asset.targetAmount}
                          ariaLabel={`${asset.name} 목표 달성률`}
                        />
                        <span className={styles.assetboard__goaltext}>
                          목표 {asset.targetAmount.toLocaleString('ko-KR')}원 중 {Math.min(
                            Math.round((asset.balance / asset.targetAmount) * 100),
                            999,
                          )}%
                        </span>
                      </span>
                    )}
                  </span>
                  <Amount
                    value={asset.balance}
                    tone="income"
                    size="medium"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {archived.length > 0 && (
        <Card
          title="보관한 자산"
          icon="📦"
          description="목록에서 숨긴 자산이에요. 누르면 다시 꺼낼 수 있어요"
          isFlush
        >
          <ul className={styles.assetboard__list}>
            {archived.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  className={styles.assetboard__row}
                  data-archived="true"
                  onClick={() => setEditing(asset)}
                >
                  <span className={styles.assetboard__main}>
                    <span className={styles.assetboard__name}>{asset.name}</span>
                  </span>
                  <Amount
                    value={asset.balance}
                    tone="neutral"
                    size="small"
                  />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(isCreating || editing) && (
        <AssetFormModal
          key={editing ? `edit:${editing.id}` : 'create'}
          isOpen
          asset={editing}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
          onDelete={(asset) => {
            setEditing(null);
            setDeleteTarget(asset);
          }}
          onSaved={() => {
            setIsCreating(false);
            setEditing(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        urlKey="asset-delete"
        isOpen={Boolean(deleteTarget)}
        title={`'${deleteTarget?.name ?? ''}'을(를) 지울까요?`}
        description={
          (deleteTarget?.transactionCount ?? 0) > 0
            ? `이미 넣은 ${deleteTarget?.transactionCount}건은 거래에 그대로 남아요. 실제로 나간 돈이라, 지우면 지난 달 합계가 달라지거든요.`
            : '되돌릴 수 없어요.'
        }
        confirmLabel="지우기"
        isLoading={removal.isPending}
        onConfirm={() => deleteTarget && removal.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
