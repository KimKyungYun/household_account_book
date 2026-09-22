import { prisma } from '@/lib/prisma';
import { withHandler } from '@/lib/api/withHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({}, (ctx) =>
  prisma.paymentMethod.findMany({
    where: { householdId: ctx.householdId, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, kind: true, ownerMemberId: true, isActive: true },
  }));
