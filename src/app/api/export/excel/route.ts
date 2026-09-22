import { withHandler } from '@/lib/api/withHandler';
import { buildWorkbook } from '@/lib/excel/buildWorkbook';
import { excelQuerySchema } from '@/service/export/schema';

// exceljs 는 node:stream/zlib 에 의존해 Edge 런타임에서 돌지 않는다.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withHandler({ query: excelQuerySchema }, async (ctx, { query }) => {
  const { buffer, householdName } = await buildWorkbook(
    ctx.householdId,
    { from: query.from, to: query.to },
    query.sheets,
  );

  const korean = `가계부_${householdName}_${query.from}_${query.to}.xlsx`.replace(/["';\\]/g, '');
  const ascii = `household-book_${query.from}_${query.to}.xlsx`;

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // 헤더 값에 raw 한글을 넣으면 undici 가 ERR_INVALID_CHAR 로 던진다.
      // ASCII 폴백 + filename*=UTF-8'' 를 함께 줘야 한글 파일명이 살아난다.
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(korean)}`,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'no-store',
    },
  });
});
