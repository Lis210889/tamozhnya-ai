import { NextRequest, NextResponse } from 'next/server';
import { searchByDescription, findByCode } from '../database';

/**
 * GET /api/tnved/search?q=...
 * Поиск по коду (точный) или по описанию (ключевые слова)
 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();
    if (!q) {
      return NextResponse.json(
        { error: 'Укажите параметр q (код или описание).' },
        { status: 400 }
      );
    }

    const codeOnly = /^[\d\s]+$/.test(q);
    const normalizedCode = q.replace(/\s+/g, '');
    const isFullCode = normalizedCode.length === 10;

    if (codeOnly && isFullCode) {
      const exact = findByCode(normalizedCode);
      if (exact) {
        return NextResponse.json({ results: [exact], mode: 'code' });
      }
    }

    const results = searchByDescription(q, 20);
    return NextResponse.json({ results, mode: 'description' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Ошибка поиска' },
      { status: 500 }
    );
  }
}
