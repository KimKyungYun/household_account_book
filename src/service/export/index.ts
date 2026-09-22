import { http } from '@/service/httpClient';
import type { ExcelQuery } from '@/service/export/schema';

export function downloadExcel(params: { from: string; to: string; sheets?: ExcelQuery['sheets'] }) {
  return http.getBlob('/export/excel', {
    from: params.from,
    to: params.to,
    sheets: params.sheets,
  });
}
