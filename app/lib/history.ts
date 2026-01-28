const KEY = 'tamozhnya-history';
const MAX = 50;

export interface HistoryItem {
  id: string;
  ts: number;
  mode: 'file' | 'text';
  /** Текст запроса (режим «Текст») или имя файла */
  preview: string;
  /** Полный введённый текст (только для mode === 'text') */
  text?: string;
  result: string;
  codes: string[];
}

function load(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(items: HistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch (e) {
    console.warn('История: не удалось сохранить', e);
  }
}

export function addToHistory(item: Omit<HistoryItem, 'id' | 'ts'>): void {
  const list = load();
  const entry: HistoryItem = {
    ...item,
    id: crypto.randomUUID?.() ?? `h-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ts: Date.now(),
  };
  save([entry, ...list]);
}

export function getHistory(): HistoryItem[] {
  return load();
}

export function removeFromHistory(id: string): void {
  save(load().filter((x) => x.id !== id));
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
