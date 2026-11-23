import { withHandler } from '@/lib/api/withHandler';
import { getResetSummary, resetHouseholdData } from '@/lib/repository/household';
import { resetHouseholdSchema } from '@/service/household/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 초기화하면 지워지는 건수와 거래 기간. */
export const GET = withHandler({}, (ctx) => getResetSummary(ctx.householdId));

/** 거래·자산·대출·반복 거래를 모두 지운다. 본문의 확인 문구가 맞아야 실행한다. */
export const POST = withHandler({ body: resetHouseholdSchema }, (ctx) => resetHouseholdData(ctx.householdId));
