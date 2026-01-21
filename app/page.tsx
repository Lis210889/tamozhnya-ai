export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6 md:p-10">
      {/* Заголовок и описание */}
      <div className="max-w-6xl mx-auto text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          🛃 Таможенный ИИ-ассистент
        </h1>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto">
          Загрузите описание товара, инвойс или спецификацию. ИИ проанализирует текст и предложит возможные коды ТН ВЭД,
          проверит риски и несоответствия.
        </p>
      </div>

      {/* Основной контейнер с карточкой */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Анализ документа</h2>

        {/* Область для загрузки файла */}
        <div className="border-3 border-dashed border-gray-300 rounded-xl p-8 text-center mb-8 transition-colors hover:border-blue-400">
          <p className="text-gray-600 mb-4">
            Перетащите сюда <strong>.txt</strong> или <strong>.pdf</strong> файл или
          </p>
          <label className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition shadow-md">
            <span>Выберите файл на компьютере</span>
            <input type="file" className="hidden" />
          </label>
          <p className="text-sm text-gray-500 mt-4">
            Поддерживаются текстовые файлы и PDF с текстовым слоем.
            <br />
            Максимальный размер: 10 МБ.
          </p>
        </div>

        {/* Кнопка анализа и индикатор загрузки */}
        <div className="mb-10">
          <button
            className="w-full md:w-auto min-w-[200px] px-8 py-4 bg-green-600 text-white text-xl font-semibold rounded-xl hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>🧠 Проанализировать с помощью ИИ</span>
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Анализ займет от 10 до 30 секунд.
          </p>
        </div>

        {/* Блок для вывода результатов */}
        <div className="border-t pt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Результат анализа</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 min-h-[300px]">
            <div className="text-gray-500 text-center py-10">
              <p className="text-lg">Здесь появится результат анализа...</p>
              <p className="text-sm mt-2">Коды ТН ВЭД, пояснения и возможные риски.</p>
            </div>
            {/* Сюда будет динамически подставляться результат от ИИ */}
          </div>
        </div>

        {/* Служебная информация */}
        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            <strong>Внимание:</strong> Рекомендации ИИ носят справочный характер и требуют обязательной проверки
            экспертом. Мы не несём ответственности за решения, принятые на основе данного анализа.
          </p>
        </div>
      </div>

      {/* Подвал */}
      <footer className="max-w-4xl mx-auto mt-12 text-center text-gray-600 text-sm">
        <p>Таможенный ИИ-ассистент • Версия 0.1.0 • Данные обновляются ежедневно</p>
      </footer>
    </div>
  );
}
