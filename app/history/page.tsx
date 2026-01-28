'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getHistory,
  clearHistory,
  removeFromHistory,
  type HistoryItem,
} from '../lib/history';

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => setItems(getHistory());

  useEffect(() => {
    refresh();
  }, []);

  const handleClear = () => {
    if (confirm('Очистить всю историю?')) {
      clearHistory();
      refresh();
      setExpanded(null);
    }
  };

  const handleRemove = (id: string) => {
    removeFromHistory(id);
    refresh();
    if (expanded === id) setExpanded(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">История анализов</h1>
          <p className="text-blue-200">
            Сохранённые запросы и результаты (в этом браузере)
          </p>
        </div>

        <div className="bg-white/95 rounded-2xl shadow-xl p-6 md:p-8">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-12">
              История пуста. Результаты анализов сохраняются после каждого запроса на{' '}
              <Link href="/" className="text-blue-600 hover:underline">главной</Link>.
            </p>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Очистить историю
                </button>
              </div>
              <ul className="space-y-4">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="rounded-xl border border-gray-200 bg-gray-50/80 overflow-hidden"
                  >
                    <div className="p-4 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-500 mb-1">
                          {it.mode === 'text' ? 'Текст' : 'Файл'} · {formatDate(it.ts)}
                        </p>
                        <p className="font-medium text-gray-900 truncate" title={it.preview}>
                          {it.preview || '—'}
                        </p>
                        {it.codes.length > 0 && (
                          <p className="mt-1 text-xs text-blue-600">
                            Коды: {it.codes.slice(0, 5).join(', ')}
                            {it.codes.length > 5 && ` +${it.codes.length - 5}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {it.mode === 'text' && it.text && (
                          <Link
                            href={`/?text=${encodeURIComponent(it.text)}`}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition"
                          >
                            Повторить
                          </Link>
                        )}
                        {it.mode === 'file' && (
                          <Link
                            href="/"
                            className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300 transition"
                          >
                            К анализу
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === it.id ? null : it.id)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                        >
                          {expanded === it.id ? 'Свернуть' : 'Результат'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(it.id)}
                          className="rounded-lg text-red-600 hover:bg-red-50 p-1.5 transition"
                          title="Удалить"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {expanded === it.id && (
                      <div className="border-t border-gray-200 bg-white p-4">
                        <div className="text-sm text-gray-800 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 max-h-96 overflow-y-auto">
                          {it.result}
                        </div>
                        {it.codes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {it.codes.map((c) => (
                              <code key={c} className="rounded bg-blue-50 px-2 py-1 text-blue-700 text-xs font-mono">
                                {c}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <p className="mt-6 text-center">
          <Link href="/" className="text-blue-200 hover:text-white text-sm transition">
            ← Вернуться к анализу
          </Link>
        </p>
      </div>
    </div>
  );
}
