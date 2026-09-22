import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_MEMBERS,
  DEFAULT_PAYMENT_METHODS,
} from '../src/lib/seed/defaults';

/**
 * 로컬 개발용 시드.
 *
 * 카테고리·결제수단은 `(householdId, parentId, name)` 기준 upsert 라서 몇 번 돌려도 안전하다.
 * 가구·구성원도 이메일 기준 upsert 이므로 기존 거래 데이터를 건드리지 않는다.
 *
 * 프로덕션의 초기 가구 생성은 이 스크립트가 아니라 온보딩 플로우가 담당한다.
 */
const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL 이 설정되지 않았습니다.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const HOUSEHOLD_NAME = process.env.SEED_HOUSEHOLD_NAME ?? '우리집';
/**
 * 로컬 개발용 비밀번호. 시드 계정으로 바로 로그인해 화면을 확인할 수 있게 한다.
 * 프로덕션에서는 이 스크립트를 돌리지 않는다(초기 가구는 온보딩이 만든다).
 */
const MEMBER_PASSWORD = process.env.SEED_MEMBER_PASSWORD ?? 'password1234';
const MEMBER_EMAILS = [
  process.env.SEED_MEMBER_A_EMAIL ?? 'husband@example.com',
  process.env.SEED_MEMBER_B_EMAIL ?? 'wife@example.com',
];

async function seedCategories(householdId: string) {
  let created = 0;

  for (const group of DEFAULT_CATEGORIES) {
    for (const [groupIndex, parent] of group.categories.entries()) {
      // 대분류는 parentId 가 null 이라 복합 unique 로 upsert 할 수 없다(부분 유니크 인덱스).
      // findFirst → create 로 처리한다.
      const existingParent = await prisma.category.findFirst({
        where: { householdId, parentId: null, name: parent.name },
      });

      const parentRow = existingParent ?? await prisma.category.create({
        data: {
          householdId,
          level: 1,
          kind: group.kind,
          name: parent.name,
          sortOrder: groupIndex,
          isSystem: true,
          defaultSplitMode: parent.defaultSplitMode ?? null,
        },
      });
      if (!existingParent) created += 1;

      for (const [childIndex, childName] of parent.children.entries()) {
        const existingChild = await prisma.category.findFirst({
          where: { householdId, parentId: parentRow.id, name: childName },
        });
        if (existingChild) continue;

        await prisma.category.create({
          data: {
            householdId,
            parentId: parentRow.id,
            level: 2,
            kind: group.kind,
            name: childName,
            sortOrder: childIndex,
            isSystem: true,
            defaultSplitMode: parent.defaultSplitMode ?? null,
          },
        });
        created += 1;
      }
    }
  }

  return created;
}

async function seedPaymentMethods(householdId: string) {
  const before = await prisma.paymentMethod.count({ where: { householdId } });

  for (const [index, method] of DEFAULT_PAYMENT_METHODS.entries()) {
    await prisma.paymentMethod.upsert({
      where: { householdId_name: { householdId, name: method.name } },
      update: {},
      create: { householdId, name: method.name, kind: method.kind, sortOrder: index },
    });
  }

  // upsert 는 갱신하지 않은 행도 createdAt === updatedAt 이라 그것으로 신규를 셀 수 없다.
  return await prisma.paymentMethod.count({ where: { householdId } }) - before;
}

async function main() {
  const household = await prisma.household.findFirst({ where: { name: HOUSEHOLD_NAME } })
    ?? await prisma.household.create({ data: { name: HOUSEHOLD_NAME } });

  for (const [index, member] of DEFAULT_MEMBERS.entries()) {
    const email = MEMBER_EMAILS[index];
    if (!email) continue;

    const passwordHash = await bcrypt.hash(MEMBER_PASSWORD, 12);
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, name: member.displayName, passwordHash },
    });

    await prisma.householdMember.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        householdId: household.id,
        userId: user.id,
        slot: member.slot,
        displayName: member.displayName,
        colorHex: member.colorHex,
        defaultShareBp: member.defaultShareBp,
      },
    });
  }

  const categoryCount = await seedCategories(household.id);
  const paymentMethodCount = await seedPaymentMethods(household.id);

  const totals = {
    가구: household.name,
    구성원: await prisma.householdMember.count({ where: { householdId: household.id } }),
    '카테고리(전체)': await prisma.category.count({ where: { householdId: household.id } }),
    '카테고리(신규)': categoryCount,
    '결제수단(전체)': await prisma.paymentMethod.count({ where: { householdId: household.id } }),
    '결제수단(신규)': paymentMethodCount,
  };
  // eslint-disable-next-line no-console
  console.table(totals);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
