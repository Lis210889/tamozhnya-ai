'use client';

import { Suspense, useState, ChangeEvent, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { extractTNVEDCodes } from './lib/tnved';

type InputMode = 'file' | 'text';

function HomeFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <p className="text-blue-200">Загрузка…</p>
    </div>
  );
}

function HomeContent() {
  const [mode, setMode] = useState<InputMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('text');
    if (t) {
      setMode('text');
      setTextInput(t);
    }
  }, [searchParams]);

  const isValidFileType = (f: File) => {
    const ok = ['text/plain', 'application/pdf'];
    const ext = ['.txt', '.pdf'];
    return ok.includes(f.type) || ext.some((e) => f.name.toLowerCase().endsWith(e));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (isValidFileType(f)) {
      setFile(f);
      setError('');
      setResult('');
    } else {
      setError('Выберите файл .txt или .pdf');
      setFile(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (isValidFileType(f)) {
      setFile(f);
      setError('');
      setResult('');
    } else {
      setError('Выберите файл .txt или .pdf');
      setFile(null);
    }
  };

  const canAnalyze = mode === 'file' ? !!file : textInput.trim().length > 0;

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      setError(mode === 'file' ? 'Выберите файл' : 'Введите описание товара');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');

    try {
      if (mode === 'text') {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textInput.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка анализа');
        setResult(data.result);
        return;
      }

      const formData = new FormData();
      formData.append('file', file!);
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка анализа');
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при анализе');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const codes = result ? extractTNVEDCodes(result, 8) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-500/20 rounded-full border border-blue-400/30">
            <p className="text-blue-300 text-sm font-medium">Powered by DeepSeek AI</p>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Таможенный ИИ-ассистент
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Анализ документов и подбор кодов ТН ВЭД. Загрузите файл или вставьте описание.
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-10 mb-6 border border-white/20">
          {/* Режим ввода */}
          <div className="flex gap-2 mb-6 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => { setMode('file'); setError(''); setResult(''); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${mode === 'file' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              📄 Файл (PDF, TXT)
            </button>
            <button
              type="button"
              onClick={() => { setMode('text'); setError(''); setResult(''); setFile(null); }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${mode === 'text' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              ✏️ Текст
            </button>
          </div>

          {mode === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${
                isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="text-6xl mb-4">{isDragging ? '⬇️' : '📄'}</div>
                <p className="text-xl font-bold text-gray-800 mb-2">
                  {isDragging ? 'Отпустите файл' : 'Перетащите или выберите файл'}
                </p>
                <p className="text-gray-600">PDF, TXT — инвойсы, накладные, спецификации</p>
              </label>
            </div>
          )}

          {mode === 'text' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Описание товара или вставка из документа
              </label>
              <textarea
                value={textInput}
                onChange={(e) => { setTextInput(e.target.value); setError(''); setResult(''); }}
                placeholder="Например: Смартфон Apple iPhone 15 Pro, 256 ГБ, титановый корпус, с зарядным устройством"
                rows={6}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
            </div>
          )}

          {mode === 'file' && file && (
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl">
                  {file.name.endsWith('.pdf') ? '📕' : '📄'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-gray-400 hover:text-red-500 transition p-1"
                title="Удалить"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <p className="font-semibold text-red-900">Ошибка</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || isLoading}
            className="mt-8 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 px-8 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Анализирую…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">🤖 Проанализировать</span>
            )}
          </button>

          {result && (
            <div className="mt-10 space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <h3 className="text-2xl font-bold text-green-900">Результат анализа</h3>
              </div>

              {codes.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6">
                  <h4 className="font-bold text-gray-900 mb-4">Найденные коды ТН ВЭД — рассчитать пошлину</h4>
                  <div className="flex flex-wrap gap-3">
                    {codes.map((code) => (
                      <DutyCalculator key={code} code={code} />
                    ))}
                  </div>
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed bg-white/60 p-5 rounded-xl border border-gray-200">
                  {result}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-xl p-6 text-sm shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-gray-900 mb-1">Важно</p>
              <p className="text-gray-700">
                Результаты носят рекомендательный характер. Окончательную классификацию и код ТН ВЭД определяет таможенный специалист.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-blue-200 text-sm">
          <p>© 2026 Таможенный ИИ-ассистент</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}

function DutyCalculator({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [qty, setQty] = useState('1');
  const [payments, setPayments] = useState<{ duty: number; vat: number; customsFee: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleCalc = async () => {
    const v = parseFloat(value?.replace(/\s/g, '').replace(',', '.') || '0');
    if (!v || v <= 0) {
      setErr('Введите таможенную стоимость');
      return;
    }
    setErr('');
    setPayments(null);
    setLoading(true);
    try {
      const res = await fetch('/api/duties/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tnvedCode: code.replace(/\s/g, ''),
          customsValue: v,
          quantity: parseInt(qty || '1', 10) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка расчёта');
      setPayments(data.breakdown || { duty: data.duty, vat: data.vat, customsFee: data.customsFee, total: data.total });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const formatRub = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 2 }).format(n) + ' ₽';

  return (
    <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <code className="font-mono font-bold text-blue-700">{code}</code>
        <button
          type="button"
          onClick={() => { setOpen(!open); setErr(''); setPayments(null); }}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {open ? 'Свернуть' : 'Рассчитать пошлину'}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Таможенная стоимость, ₽</label>
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="100 000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Количество</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleCalc}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Считаю…' : 'Рассчитать'}
          </button>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {payments && (
            <div className="text-xs space-y-1 pt-2 border-t border-gray-100">
              <p>Пошлина: <strong>{formatRub(payments.duty)}</strong></p>
              <p>НДС: <strong>{formatRub(payments.vat)}</strong></p>
              <p>Таможенный сбор: <strong>{formatRub(payments.customsFee)}</strong></p>
              <p className="text-green-700 font-bold pt-1">Итого: {formatRub(payments.total)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
