const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 엑셀 호환 CSV (UTF-8 BOM) */
export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

/** CSV 파일 응답 */
export function sendCsv(res: { setHeader(k: string, v: string): unknown; send(body: string): unknown }, fileName: string, content: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(content);
}
