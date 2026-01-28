'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CalculatorPage() {
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');
  const [qty, setQty] = useState('1');
  const [data, setData] = useState<{
    duty: number;
    vat: number;
    customsFee: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(value.replace(/\s/g, '').replace(',', '.') || '0');
    const trimmed = code.replace(/\s/g, '').trim();
    if (!trimmed) {
      setError('Введите код ТН ВЭД');
      return;
    }
    if (!v || v <= 0) {
      setError('Введите таможенную стоимость');
      return;
    }
    setError('');
    setData(null);
    setLoading(true);
    try {
      const res = await fetch('/api/duties/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tnvedCode: trimmed,
          customsValue: v,
          quantity: parseInt(qty || '1', 10) || 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ошибка расчёта');
      setData(json.breakdown || {
        duty: json.duty,
        vat: json.vat,
        customsFee: json.customsFee,
        total: json.total,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatRub = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }).format(n) + ' ₽';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Калькулятор пошлин</h1>
          <p className="text-blue-200">
            Рассчитайте таможенные платежи по коду ТН ВЭД и стоимости
          </p>
        </div>

        <div className="bg-white/95 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Код ТН ВЭД (10 знаков)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="8517 12 000 0"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Таможенная стоимость, ₽
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="100 000"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </div>
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 text-white py-4 font-bold text-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Считаю…' : 'Рассчитать'}
            </button>
          </form>

          {data && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Результат (2026)</h3>
              <div className="space-y-3 rounded-xl bg-blue-50 p-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ввозная пошлина</span>
                  <strong>{formatRub(data.duty)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">НДС</span>
                  <strong>{formatRub(data.vat)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Таможенный сбор</span>
                  <strong>{formatRub(data.customsFee)}</strong>
                </div>
                <div className="flex justify-between pt-3 border-t border-blue-200 text-lg text-green-700">
                  <span>Итого</span>
                  <strong>{formatRub(data.total)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center">
          <Link href="/tnved" className="text-blue-200 hover:text-white text-sm transition">
            Найти код ТН ВЭД →
          </Link>
        </p>
      </div>
    </div>
  );
}
