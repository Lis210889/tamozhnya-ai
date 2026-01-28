/**
 * Извлечение кодов ТН ВЭД из текста (формат XXXX XX XX XX или 10 цифр)
 */
const CODE_RE = /(\d{4}\s+\d{2}\s+\d{2}\s+\d{2}|\d{10})/g;

export function extractTNVEDCodes(text: string, limit = 10): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  CODE_RE.lastIndex = 0;
  while ((m = CODE_RE.exec(text)) !== null && out.length < limit) {
    const raw = m[1];
    const normalized = raw.length === 10
      ? `${raw.slice(0, 4)} ${raw.slice(4, 6)} ${raw.slice(6, 8)} ${raw.slice(8, 10)}`
      : raw.replace(/\s+/g, ' ').trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}
