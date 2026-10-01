import type { HouseholdKind, MemberRelation } from '@/generated/prisma/enums';

export interface MeMemberDto {
  id: string;
  slot: number;
  relation: MemberRelation;
  displayName: string;
  colorHex: string;
}

export interface MeDto {
  user: { id: string; email: string };
  member: MeMemberDto | null;
  household: { id: string; name: string; kind: HouseholdKind; currency: string; inviteCode: string } | null;
  members: MeMemberDto[];
}

/** 합류 전에 보여 주는 초대받은 가구 정보. */
export interface InviteDto {
  name: string;
  kind: HouseholdKind;
  memberCount: number;
  capacity: number;
  isFull: boolean;
}
