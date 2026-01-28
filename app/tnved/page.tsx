'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

type TNVEDHit = {
  code: string;
  name: string;
  section?: string;
  group?: string;
  category?: string;
  keywords?: string[];
  dutyRate?: number;
  vatRate?: number;
  notes?: string;
};

export default function TNVEDSearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<TNVEDHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    const query = q.trim();
    if (!query) {
      setError('Введите код или описание');
      return;
    }
    setError('');
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/tnved/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка поиска');
      setResults(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Поиск по ТН ВЭД</h1>
          <p className="text-blue-200">
            Введите код (например, 8517 12 000 0) или описание товара
          </p>
        </div>

        <div className="bg-white/95 rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Код ТН ВЭД или описание товара…"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
            <button
              type="button"
              onClick={search}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Поиск…' : 'Найти'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <p className="mt-6 text-gray-500 text-center">
              Ничего не найдено. Загрузите базу ТН ВЭД в{' '}
              <Link href="/admin/tnved" className="text-blue-600 hover:underline">
                админке
              </Link>
              .
            </p>
          )}

          {results.length > 0 && (
            <ul className="mt-6 space-y-4">
              {results.map((r) => (
                <li
                  key={r.code}
                  className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 hover:border-blue-200 transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <code className="font-mono font-bold text-blue-700">{r.code}</code>
                    {r.dutyRate != null && (
                      <span className="text-xs text-gray-500">
                        пошлина {r.dutyRate}%{r.vatRate != null && `, НДС ${r.vatRate}%`}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-medium text-gray-900">{r.name}</p>
                  {r.category && (
                    <p className="mt-1 text-sm text-gray-600">Категория: {r.category}</p>
                  )}
                  {r.keywords && r.keywords.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {r.keywords.slice(0, 6).join(', ')}
                    </p>
                  )}
                  <Link
                    href={`/?text=${encodeURIComponent(r.name)}`}
                    className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                  >
                    Анализировать этот товар →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-blue-200 hover:text-white text-sm transition"
          >
            ← Вернуться к анализу
          </Link>
        </div>
      </div>
    </div>
  );
}
