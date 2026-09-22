'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { isApiError } from '@/interface/errorType';
import { downloadExcel } from '@/service/export';
import downloadBlob from '@/utils/ts/downloadBlob';
import type { ExcelQuery } from '@/service/export/schema';

/** 서버가 만든 blob 을 받아 저장한다. 파일명은 응답 헤더의 것을 그대로 쓴다. */
export function useExcelDownload() {
  return useMutation({
    mutationFn: (params: { from: string; to: string; sheets?: ExcelQuery['sheets'] }) => downloadExcel(params),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename ?? 'household-book.xlsx');
      toast.success('엑셀을 내려받았습니다.');
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : '내려받지 못했습니다.'),
  });
}
