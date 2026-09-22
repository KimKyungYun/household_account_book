/** 서버가 만들어 준 파일을 브라우저에 저장시킨다. 관례대로 프론트는 생성에 관여하지 않는다. */
export default function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
