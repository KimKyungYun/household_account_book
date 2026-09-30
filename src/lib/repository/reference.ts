import { prisma } from '@/lib/prisma';
import { badRequest } from '@/lib/api/httpError';

/**
 * 요청이 가리킨 것이 정말 이 가구의 것인지 확인한다.
 *
 * `memberId`·`paymentMethodId` 같은 id 는 **요청 본문으로 들어온다.** 가구를 대조하지
 * 않으면 남의 가구 id 를 적어 보낼 수 있고, 그 거래를 조회할 때 응답에 딸려 나오는
 * 이름(`member.displayName`, `paymentMethod.name`)이 그대로 새어 나간다.
 * 세션에서 온 `householdId` 하고만 대조한다 — 그것이 이 앱의 유일한 테넌트 기준이다.
 */
export async function assertMemberUsable(householdId: string, memberId: string) {
  const member = await prisma.householdMember.findFirst({
    where: { id: memberId, householdId },
    select: { id: true },
  });
  if (!member) throw badRequest('구성원을 찾을 수 없습니다.', { memberId: '구성원을 찾을 수 없습니다.' });
}

export async function assertPaymentMethodUsable(householdId: string, paymentMethodId: string) {
  const method = await prisma.paymentMethod.findFirst({
    where: { id: paymentMethodId, householdId },
    select: { id: true, isActive: true },
  });
  if (!method) {
    throw badRequest('결제수단을 찾을 수 없습니다.', { paymentMethodId: '결제수단을 찾을 수 없습니다.' });
  }
  if (!method.isActive) {
    throw badRequest('보관된 결제수단입니다.', { paymentMethodId: '보관된 결제수단입니다.' });
  }
}
