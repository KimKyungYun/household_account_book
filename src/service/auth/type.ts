export interface MeMemberDto {
  id: string;
  slot: number;
  displayName: string;
  colorHex: string;
}

export interface MeDto {
  user: { id: string; email: string };
  member: MeMemberDto | null;
  household: { id: string; name: string; currency: string; inviteCode: string } | null;
  members: MeMemberDto[];
}
