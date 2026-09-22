import type { PaymentMethodKind } from '@/generated/prisma/enums';

export interface PaymentMethodDto {
  id: string;
  name: string;
  kind: PaymentMethodKind;
  ownerMemberId: string | null;
  isActive: boolean;
}
