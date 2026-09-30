import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { formatYearMonthLabel } from '@/utils/ts/formatDate';

export interface ExcelRange {
  from: string;
  to: string;
}

export type ExcelSheet = 'summary' | 'detail' | 'pivot';

const MONEY_FORMAT = '#,##0;[Red]-#,##0';
const DATE_FORMAT = 'yyyy-mm-dd';
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F4F7' } };

const TYPE_LABEL: Record<string, string> = { INCOME: '수입', EXPENSE: '지출', TRANSFER: '이체' };
const SPLIT_LABEL: Record<string, string> = { SHARED: '같이', PERSONAL: '개인' };

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function nextDay(value: string): Date {
  return new Date(toDateOnly(value).getTime() + 86_400_000);
}

function yearMonthsBetween(from: string, to: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const last = `${to.slice(0, 7)}`;

  while (cursor.toISOString().slice(0, 7) <= last) {
    result.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return result;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFD9DDE4' } } };
  });
}

/**
 * 가계부 엑셀을 만든다.
 *
 * 관례대로 **서버가 통째로 만들고 프론트는 blob 을 받아 저장**한다.
 * 숫자는 반드시 셀 값이 숫자여야 한다 — 문자열로 넣으면 받는 쪽에서 합계를 낼 수 없다.
 */
export async function buildWorkbook(
  householdId: string,
  range: ExcelRange,
  sheets: readonly ExcelSheet[],
): Promise<{ buffer: ArrayBuffer; householdName: string }> {
  const [household, members, transactions] = await Promise.all([
    prisma.household.findUniqueOrThrow({ where: { id: householdId }, select: { name: true } }),
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { slot: 'asc' },
      select: { id: true, displayName: true },
    }),
    prisma.transaction.findMany({
      where: { householdId, date: { gte: toDateOnly(range.from), lt: nextDay(range.to) } },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      select: {
        date: true,
        type: true,
        amount: true,
        splitMode: true,
        merchant: true,
        memo: true,
        status: true,
        member: { select: { id: true, displayName: true } },
        category: { select: { name: true, parent: { select: { name: true } } } },
        paymentMethod: { select: { name: true } },
      },
    }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '우리집 가계부';
  workbook.created = new Date();

  if (sheets.includes('summary')) addSummarySheet(workbook, range, transactions, members);
  if (sheets.includes('detail')) addDetailSheet(workbook, transactions);
  if (sheets.includes('pivot')) addPivotSheet(workbook, range, transactions);

  const buffer = await workbook.xlsx.writeBuffer();

  return { buffer, householdName: household.name };
}

interface Row {
  date: Date;
  type: string;
  amount: number;
  splitMode: string;
  merchant: string | null;
  memo: string | null;
  status: string;
  member: { id: string; displayName: string };
  category: { name: string; parent: { name: string } | null } | null;
  paymentMethod: { name: string } | null;
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  range: ExcelRange,
  rows: Row[],
  members: { id: string; displayName: string }[],
) {
  const sheet = workbook.addWorksheet('요약');
  sheet.columns = [{ width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];

  sheet.addRow(['우리집 가계부 요약']).font = { bold: true, size: 14 };
  sheet.addRow([`기간: ${range.from} ~ ${range.to}`]).font = { color: { argb: 'FF6B7380' } };
  sheet.addRow([]);

  const income = rows.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0);
  const expense = rows.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0);
  const transfer = rows.filter((row) => row.type === 'TRANSFER').reduce((sum, row) => sum + row.amount, 0);

  styleHeaderRow(sheet.addRow(['항목', '금액']));
  for (const [label, value] of [
    ['총수입', income],
    ['총지출', expense],
    ['순저축 (수입 − 지출)', income - expense],
    ['이체 합계 (집계 제외)', transfer],
  ] as const) {
    const row = sheet.addRow([label, value]);
    row.getCell(2).numFmt = MONEY_FORMAT;
  }

  sheet.addRow([]);
  styleHeaderRow(sheet.addRow(['월', '수입', '지출', '순액']));
  for (const yearMonth of yearMonthsBetween(range.from, range.to)) {
    const monthRows = rows.filter((row) => row.date.toISOString().slice(0, 7) === yearMonth);
    const monthIncome = monthRows.filter((row) => row.type === 'INCOME').reduce((sum, row) => sum + row.amount, 0);
    const monthExpense = monthRows.filter((row) => row.type === 'EXPENSE').reduce((sum, row) => sum + row.amount, 0);

    const row = sheet.addRow([formatYearMonthLabel(yearMonth), monthIncome, monthExpense, monthIncome - monthExpense]);
    for (const index of [2, 3, 4]) row.getCell(index).numFmt = MONEY_FORMAT;
  }

  sheet.addRow([]);
  styleHeaderRow(sheet.addRow(['구성원', '낸 수입', '낸 지출']));
  for (const member of members) {
    const mine = rows.filter((row) => row.member.id === member.id);
    const row = sheet.addRow([
      member.displayName,
      mine.filter((item) => item.type === 'INCOME').reduce((sum, item) => sum + item.amount, 0),
      mine.filter((item) => item.type === 'EXPENSE').reduce((sum, item) => sum + item.amount, 0),
    ]);
    for (const index of [2, 3]) row.getCell(index).numFmt = MONEY_FORMAT;
  }
}

function addDetailSheet(workbook: ExcelJS.Workbook, rows: Row[]) {
  const sheet = workbook.addWorksheet('상세');
  sheet.columns = [
    { header: '날짜', width: 12 },
    { header: '구성원', width: 10 },
    { header: '유형', width: 8 },
    { header: '대분류', width: 14 },
    { header: '소분류', width: 16 },
    { header: '금액', width: 14 },
    { header: '결제수단', width: 12 },
    { header: '같이/개인', width: 11 },
    { header: '가맹점', width: 22 },
    { header: '메모', width: 28 },
  ];
  styleHeaderRow(sheet.getRow(1));
  // 머리글을 고정하고 자동 필터를 건다 — 받는 쪽이 바로 걸러 볼 수 있게.
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const row of rows) {
    const added = sheet.addRow([
      row.date,
      row.member.displayName,
      TYPE_LABEL[row.type] ?? row.type,
      row.category?.parent?.name ?? '',
      row.category?.name ?? '',
      row.amount,
      row.paymentMethod?.name ?? '',
      SPLIT_LABEL[row.splitMode] ?? row.splitMode,
      row.merchant ?? '',
      row.memo ?? '',
    ]);
    added.getCell(1).numFmt = DATE_FORMAT;
    added.getCell(6).numFmt = MONEY_FORMAT;
  }

  const lastRow = sheet.rowCount;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(lastRow, 1), column: 11 } };

  if (rows.length > 0) {
    // SUBTOTAL 이라 필터를 걸면 합계도 함께 줄어든다.
    const total = sheet.addRow(['합계', '', '', '', '', { formula: `SUBTOTAL(9,F2:F${lastRow})` }]);
    total.font = { bold: true };
    total.getCell(6).numFmt = MONEY_FORMAT;
  }
}

function addPivotSheet(workbook: ExcelJS.Workbook, range: ExcelRange, rows: Row[]) {
  const sheet = workbook.addWorksheet('카테고리피벗');
  const months = yearMonthsBetween(range.from, range.to);

  sheet.columns = [
    { width: 16 },
    { width: 16 },
    ...months.map(() => ({ width: 14 })),
    { width: 14 },
    { width: 10 },
  ];

  styleHeaderRow(sheet.addRow(['대분류', '소분류', ...months, '합계', '구성비']));

  const expenses = rows.filter((row) => row.type === 'EXPENSE');
  const grandTotal = expenses.reduce((sum, row) => sum + row.amount, 0);

  // 대분류 → 소분류 순서를 유지하기 위해 나타난 순서대로 모은다.
  const parents = new Map<string, Set<string>>();
  for (const row of expenses) {
    const parent = row.category?.parent?.name ?? '분류 없음';
    const child = row.category?.name ?? '분류 없음';
    if (!parents.has(parent)) parents.set(parent, new Set());
    parents.get(parent)?.add(child);
  }

  const sumOf = (predicate: (row: Row) => boolean) =>
    expenses.filter(predicate).reduce((sum, row) => sum + row.amount, 0);

  for (const [parent, children] of parents) {
    const parentRow = sheet.addRow([
      parent,
      '',
      ...months.map((month) =>
        sumOf((row) => (row.category?.parent?.name ?? '분류 없음') === parent && row.date.toISOString().slice(0, 7) === month)),
      sumOf((row) => (row.category?.parent?.name ?? '분류 없음') === parent),
      grandTotal === 0 ? 0 : sumOf((row) => (row.category?.parent?.name ?? '분류 없음') === parent) / grandTotal,
    ]);
    parentRow.font = { bold: true };
    for (let index = 3; index <= months.length + 3; index += 1) parentRow.getCell(index).numFmt = MONEY_FORMAT;
    // 비율은 0~1 로 저장하고 서식으로 퍼센트를 만든다. 87.3 을 넣으면 8730% 가 된다.
    parentRow.getCell(months.length + 4).numFmt = '0.0%';

    for (const child of children) {
      const childRow = sheet.addRow([
        '',
        child,
        ...months.map((month) =>
          sumOf((row) => row.category?.name === child && (row.category?.parent?.name ?? '분류 없음') === parent && row.date.toISOString().slice(0, 7) === month)),
        sumOf((row) => row.category?.name === child && (row.category?.parent?.name ?? '분류 없음') === parent),
        grandTotal === 0
          ? 0
          : sumOf((row) => row.category?.name === child && (row.category?.parent?.name ?? '분류 없음') === parent) / grandTotal,
      ]);
      for (let index = 3; index <= months.length + 3; index += 1) childRow.getCell(index).numFmt = MONEY_FORMAT;
      childRow.getCell(months.length + 4).numFmt = '0.0%';
    }
  }

  const totalRow = sheet.addRow([
    '전체',
    '',
    ...months.map((month) => sumOf((row) => row.date.toISOString().slice(0, 7) === month)),
    grandTotal,
    grandTotal === 0 ? 0 : 1,
  ]);
  totalRow.font = { bold: true };
  for (let index = 3; index <= months.length + 3; index += 1) totalRow.getCell(index).numFmt = MONEY_FORMAT;
  totalRow.getCell(months.length + 4).numFmt = '0.0%';
}
