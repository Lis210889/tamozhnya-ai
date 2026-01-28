'use client';

import { useState } from 'react';

export default function TNVEDAdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  // Загрузка статистики
  const loadStats = async () => {
    try {
      const response = await fetch('/api/tnved/load');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Ошибка загрузки статистики:', err);
    }
  };

  // Загрузка базы данных
  const handleUpload = async () => {
    if (!file) {
      setError('Выберите файл для загрузки');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tnved/load', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке');
      }

      setResult(`✅ Успешно загружено ${data.loaded} кодов ТН ВЭД`);
      setFile(null);
      loadStats(); // Обновляем статистику
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при загрузке');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Управление базой данных ТН ВЭД
          </h1>
          <p className="text-blue-200">
            Загрузите базу данных кодов ТН ВЭД для улучшения точности классификации
          </p>
        </div>

        {/* Статистика */}
        <div className="bg-white/95 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Статистика базы данных</h2>
            <button
              onClick={loadStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Обновить
            </button>
          </div>
          {stats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Всего кодов</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalCodes || 0}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Категорий</p>
                <p className="text-2xl font-bold text-green-600">{stats.categories || 0}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Разделов</p>
                <p className="text-2xl font-bold text-purple-600">{stats.sections || 0}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Нажмите "Обновить" для загрузки статистики</p>
          )}
        </div>

        {/* Загрузка файла */}
        <div className="bg-white/95 rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Загрузка базы данных</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите JSON файл с кодами ТН ВЭД
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Выбран файл: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} КБ)
              </p>
            )}
          </div>

          {/* Формат файла */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
            <p className="text-sm font-semibold text-blue-900 mb-2">Формат файла:</p>
            <p className="text-sm text-blue-800">
              Файл должен быть в формате JSON и содержать массив объектов с полями: code, name, keywords, category и др.
            </p>
            <a
              href="/tnved-example.json"
              download
              className="text-sm text-blue-600 hover:underline mt-2 inline-block"
            >
              📥 Скачать пример файла
            </a>
          </div>

          {/* Кнопка загрузки */}
          <button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
          >
            {isLoading ? 'Загрузка...' : 'Загрузить базу данных'}
          </button>

          {/* Результат */}
          {result && (
            <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <p className="text-green-800">{result}</p>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Инструкции */}
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-xl">
          <h3 className="font-bold text-gray-900 mb-3">📚 Где взять базу данных ТН ВЭД?</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• <strong>Евразийская экономическая комиссия:</strong> https://www.eurasiancommission.org</li>
            <li>• <strong>ФТС России:</strong> https://customs.gov.ru</li>
            <li>• <strong>Коммерческие базы:</strong> КонсультантПлюс, Гарант</li>
          </ul>
          <p className="text-sm text-gray-600 mt-4">
            Подробная документация по формату файла доступна в <code className="bg-gray-200 px-2 py-1 rounded">docs/TNVED_DATABASE.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
