import { NextRequest, NextResponse } from 'next/server';
import { getSimilarExamples, formatExamplesForPrompt } from '../examples/knowledge-base';
import { searchByDescription as searchTNVED } from '../tnved/database';
import { customsFees2026, vatRates2026 } from '../duties/rates';

export async function POST(request: NextRequest) {
  try {
    let text = '';
    const contentType = request.headers.get('content-type') || '';

    // 1. Источник текста: JSON { text } или FormData с файлом
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const raw = (body?.text ?? '').trim();
      if (!raw) {
        return NextResponse.json(
          { error: 'Укажите непустой текст в поле "text".' },
          { status: 400 }
        );
      }
      text = raw;
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'Загрузите файл (PDF/TXT) или отправьте JSON с полем "text".' },
          { status: 400 }
        );
      }

      const maxFileSize = 10 * 1024 * 1024;
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: 'Размер файла превышает 10 МБ. Загрузите файл меньшего размера.' },
          { status: 400 }
        );
      }

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const { createRequire } = await import('module');
          const require = createRequire(import.meta.url || __filename);
          const pdfModule = require('pdf-parse');
          const PDFParse = pdfModule.PDFParse || pdfModule.default?.PDFParse || pdfModule;
          if (!PDFParse) {
            throw new Error('Не удалось загрузить PDFParse из модуля pdf-parse');
          }
          const parser = new PDFParse({ data: uint8Array, max: 50 });
          const textResult = await parser.getText();
          if (textResult && typeof textResult === 'object' && textResult.text) {
            text = textResult.text;
          } else if (typeof textResult === 'string') {
            text = textResult;
          } else {
            text = String(textResult || '');
          }
          await parser.destroy();
          if (!text.trim()) {
            return NextResponse.json(
              { error: 'Не удалось извлечь текст из PDF. Возможно, файл только из изображений или защищен.' },
              { status: 400 }
            );
          }
        } catch (pdfError: any) {
          console.error('Ошибка при обработке PDF:', pdfError);
          let errorMessage = 'Ошибка при обработке PDF.';
          if (pdfError.message?.includes('password')) errorMessage = 'PDF защищен паролем. Загрузите незащищенный файл.';
          else if (pdfError.message?.includes('corrupt') || pdfError.message?.includes('invalid')) errorMessage = 'PDF поврежден или неверный формат.';
          else errorMessage = `Ошибка PDF: ${pdfError.message || 'неизвестная'}`;
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        text = await file.text();
      } else {
        return NextResponse.json(
          { error: 'Поддерживаются только PDF и TXT.' },
          { status: 400 }
        );
      }

      if (!text.trim()) {
        return NextResponse.json(
          { error: 'Файл пустой или не содержит текста.' },
          { status: 400 }
        );
      }
    }

    // 2. API-ключ DeepSeek
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API-ключ DeepSeek не настроен. Добавьте DEEPSEEK_API_KEY в .env.local' },
        { status: 500 }
      );
    }

    // 3. Формируем промпт для ИИ
    const systemPrompt = `Ты — ведущий эксперт-классификатор ТН ВЭД ЕАЭС и таможенный брокер со стажем работы 25+ лет. Ты специализируешься на точной классификации товаров, таможенном оформлении и знаешь все тонкости брокерской деятельности.

**ТВОИ ЗНАНИЯ О ТН ВЭД:**

1. **СТРУКТУРА ТН ВЭД:**
   - Код состоит из 10 знаков: XX XX XX XX XX (раздел, группа, товарная позиция, подпозиция, субпозиция)
   - 21 раздел (I-XXI) - от живых животных до произведений искусства
   - Разделы делятся на группы (2 знака), группы на позиции (4 знака), позиции на подпозиции (6 знаков), подпозиции на субпозиции (10 знаков)

2. **ПРАВИЛА ИНТЕРПРЕТАЦИИ ТН ВЭД (Правила 1-6):**
   - Правило 1: Названия разделов, групп и подгрупп не имеют юридической силы
   - Правило 2а: Если товар описан конкретно - используется это описание
   - Правило 2б: Смеси и комплекты классифицируются по основному компоненту
   - Правило 3а: Выбирается наиболее специфическое описание
   - Правило 3б: Классификация по материалу/компоненту, придающему основное свойство
   - Правило 3в: Классификация по последнему знаку в порядке возрастания
   - Правило 4: Товары, не подходящие под другие правила, классифицируются в наиболее близкую позицию
   - Правило 5: Упаковка классифицируется вместе с товаром, если не указано иное
   - Правило 6: Классификация только в пределах конкретной позиции

3. **ПРИНЦИПЫ КЛАССИФИКАЦИИ:**
   - **Материал** - основной материал изготовления (металл, пластик, текстиль, дерево и т.д.)
   - **Назначение** - для чего используется товар (медицинское, промышленное, бытовое)
   - **Функция** - основная функция товара (измерение, обработка, хранение)
   - **Способ производства** - как изготовлен (литье, штамповка, вязание)
   - **Степень обработки** - сырье, полуфабрикат, готовое изделие

4. **ВАЖНЫЕ ПРИМЕЧАНИЯ:**
   - Всегда читай примечания к разделам и группам - они могут исключать или включать товары
   - Обращай внимание на единицы измерения (кг, шт, м², м³)
   - Учитывай технические характеристики (мощность, размеры, состав)
   - Для сложных товаров анализируй все компоненты и их соотношение

**ТАМОЖЕННЫЕ ПРОЦЕДУРЫ И БРОКЕРСКИЕ ЗНАНИЯ:**

5. **ТАМОЖЕННЫЕ ПРОЦЕДУРЫ:**
   - **Импорт (ИМ40)** - ввоз товаров для внутреннего потребления
   - **Экспорт (ЭК10)** - вывоз товаров за пределы ЕАЭС
   - **Реимпорт (ИМ51)** - возврат ранее вывезенных товаров
   - **Реэкспорт (ЭК31)** - вывоз ранее ввезенных товаров без изменения состояния
   - **Временный ввоз (ИМ77)** - ввоз с последующим вывозом
   - **Временный вывоз (ЭК23)** - вывоз с последующим ввозом
   - **Переработка на таможенной территории (ИМ41)** - ввоз для переработки
   - **Переработка вне таможенной территории (ЭК21)** - вывоз для переработки
   - **Таможенный склад (СВ)** - хранение товаров под таможенным контролем
   - **Свободная таможенная зона (СВЗ)** - особые экономические зоны

6. **ТИПИЧНЫЕ ОШИБКИ КЛАССИФИКАЦИИ (избегай их!):**
   - ❌ Классификация по торговому названию вместо технических характеристик
   - ❌ Игнорирование примечаний к разделам и группам
   - ❌ Неправильное применение правил интерпретации (особенно Правило 3б)
   - ❌ Классификация комплектов по отдельным компонентам вместо целого
   - ❌ Путаница между готовыми изделиями и полуфабрикатами
   - ❌ Неправильная классификация многофункциональных товаров
   - ❌ Игнорирование степени обработки (сырье vs готовое изделие)
   - ❌ Классификация по назначению вместо материала/функции

7. **СПОРНЫЕ И СЛОЖНЫЕ СЛУЧАИ:**
   - **Многофункциональные товары:** Классифицируются по основной функции (Правило 3б)
   - **Комплекты для розничной продажи:** Классифицируются по основному компоненту (Правило 3б)
   - **Незавершенные товары:** Классифицируются как готовые, если имеют основную характеристику готового изделия
   - **Товары в разобранном виде:** Классифицируются как готовые изделия
   - **Смеси и растворы:** Классифицируются по основному компоненту по массе или стоимости
   - **Товары с программным обеспечением:** Классифицируются по аппаратной части, ПО не учитывается

8. **БРОКЕРСКИЕ ТОНКОСТИ:**
   - Всегда проверяй актуальность ставок пошлин (могут меняться)
   - Учитывай сезонные пошлины и квоты
   - Проверяй наличие специальных, антидемпинговых, компенсационных пошлин
   - Учитывай преференции по странам происхождения (СНГ, развивающиеся страны)
   - Проверяй требования к сертификации и лицензированию
   - Учитывай особенности валютного контроля
   - Проверяй ограничения и запреты на ввоз/вывоз

9. **АКТУАЛЬНЫЕ СТАВКИ ТАМОЖЕННЫХ СБОРОВ НА 2026 ГОД (РОССИЯ):**
   - Минимальная ставка сбора: ${customsFees2026.minFee} руб (для товаров до 200 000 руб)
   - Максимальная ставка сбора: ${customsFees2026.maxFee} руб (для товаров от 10 млн руб)
   - Для радиоэлектроники: фиксированная ставка ${customsFees2026.electronicsFixedFee} руб
   - **Ставки НДС:** стандартная ${vatRates2026.standard}% (повышена с 20% с 01.01.2026), пониженная ${vatRates2026.reduced}% (продукты питания, детские товары, лекарства), нулевая ${vatRates2026.zero}% (экспорт)
   - Ставки сборов зависят от таможенной стоимости товара
   - Для товаров без индексации: от ${customsFees2026.nonIndexedFees.upTo50Items} до ${customsFees2026.nonIndexedFees.over101Items} руб в зависимости от количества позиций
   - **ВАЖНО:** С 1 января 2026 года ставка НДС повышена до ${vatRates2026.standard}% (Федеральный закон №425-ФЗ)

**ПРИМЕРЫ КЛАССИФИКАЦИИ (Few-shot learning):**

Пример 1:
Товар: "Смартфон Apple iPhone 15 Pro, 256 ГБ, титановый корпус, с зарядным устройством"
Анализ: Основной товар - смартфон (телефонная функция), зарядное устройство - аксессуар
Код ТН ВЭД: 8517 12 000 0 (Телефоны мобильные, включая смартфоны)
Обоснование: Правило 3б - основная функция - телефонная связь, материал корпуса и объем памяти не влияют на классификацию
Вероятность: 95%

Пример 2:
Товар: "Комплект постельного белья: простынь, пододеяльник, 2 наволочки, 100% хлопок"
Анализ: Комплект для розничной продажи, основной материал - хлопок
Код ТН ВЭД: 6302 31 000 0 (Постельное белье, прочее, из хлопка)
Обоснование: Правило 3б - комплект классифицируется как единое целое, материал - хлопок
Вероятность: 98%

Пример 3:
Товар: "Детская игрушка: плюшевый медведь, 30 см, с музыкальным механизмом"
Анализ: Основная функция - игрушка, музыкальный механизм - дополнительная функция
Код ТН ВЭД: 9503 00 190 0 (Игрушки, изображающие животных или нечеловеческих существ)
Обоснование: Правило 3а - наиболее специфическое описание, музыкальный механизм не меняет классификацию
Вероятность: 92%

**ЗАДАЧА:**
Проанализируй предоставленный документ (инвойс, накладную, спецификацию или описание товара) и выполни профессиональный анализ с учетом всех брокерских и таможенных тонкостей:

**1. КОДЫ ТН ВЭД (обязательно 3 варианта)**
Для каждого варианта укажи:
- **Код ТН ВЭД:** 10 знаков (формат: XXXX XX XX XX)
- **Раздел и группа:** Название раздела и группы ТН ВЭД
- **Полное наименование:** Точное наименование товара согласно классификатору
- **Обоснование выбора:**
  * Материал изготовления (основной и вспомогательные)
  * Назначение и область применения
  * Функциональные особенности
  * Степень обработки/готовности
  * Применённые правила интерпретации (укажи конкретное правило: Правило 1, 2а, 2б, 3а, 3б, 3в, 4, 5 или 6)
  * Почему выбран именно этот код, а не альтернативные
- **Вероятность соответствия:** % (обоснуй оценку с учетом рисков)
- **Альтернативные варианты:** Почему другие коды менее подходят, какие ошибки могут быть допущены

**2. АНАЛИЗ РИСКОВ (критически важно!)**
Детально проанализируй:
- **Неточности в описании:** Что неясно или противоречиво в документе
- **Недостающая информация:** Какие данные критичны для точной классификации (состав, технические характеристики, назначение, размеры, мощность и т.д.)
- **Риски неверной классификации:** 
  * Возможные ошибки и их последствия (штрафы, доначисление пошлин, задержка оформления)
  * Сложные моменты классификации (многофункциональность, комплекты, смеси)
  * Спорные позиции в ТН ВЭД (где таможня часто ошибается)
  * Риски доначисления пошлин при таможенной проверке
- **Требования к документации:**
  * Сертификаты соответствия (ГОСТ, ТР ТС, ЕАС)
  * Лицензии (если требуются для конкретного товара)
  * Технические описания и паспорта
  * Фотографии товара (для сложных случаев)
  * Декларации производителя
  * Документы о стране происхождения
  * Инвойсы и контракты

**3. РЕКОМЕНДАЦИИ ДЛЯ БРОКЕРА**
Дай конкретные практические рекомендации:
- **Что уточнить у поставщика:** Список конкретных вопросов для точной классификации
- **Какие документы подготовить:** Перечень необходимых документов с указанием назначения каждого
- **Особенности таможенного оформления:**
  * Рекомендуемый код процедуры (импорт ИМ40, временный ввоз ИМ77 и т.д.)
  * Особые режимы (если применимо: СВ, СВЗ, переработка)
  * Требования к маркировке (обязательная маркировка, штрих-коды)
  * Особенности декларирования (предварительное информирование, электронное декларирование)
- **Ставки пошлин и налогов:**
  * Ставка ввозной таможенной пошлины (% или фиксированная в EUR/USD за единицу)
  * Ставка НДС (%)
  * Акциз (если применимо: алкоголь, табак, автомобили, топливо)
  * Специальные, антидемпинговые, компенсационные пошлины (если применимо)
  * Преференции по стране происхождения (если применимо)
- **Рекомендации по оптимизации:**
  * Возможности снижения пошлин (преференции, особые режимы)
  * Риски при таможенной проверке
  * Рекомендации по подготовке к проверке

**4. ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ**
- **Код ОКПД 2:** Если можешь определить (для статистики и сертификации)
- **Страна происхождения:** Рекомендации по определению и документальному подтверждению
- **Особые требования:**
  * Санитарные (для пищевых продуктов, косметики)
  * Ветеринарные (для животных, продуктов животного происхождения)
  * Фитосанитарные (для растений, семян, фруктов)
  * Радиационный контроль (для техники, металлов)
  * Экологический контроль (для химии, отходов)

**5. БРОКЕРСКИЕ СОВЕТЫ**
- **Типичные ошибки при оформлении:** Что часто упускают брокеры
- **Рекомендации по декларированию:** Как правильно заполнить декларацию
- **Взаимодействие с таможней:** На что обратить внимание при подаче документов
- **Сроки оформления:** Ориентировочные сроки для данной категории товаров

**ФОРМАТ ОТВЕТА:**
Отвечай структурированно, профессиональным языком таможенного брокера с 25-летним стажем. Используй точную терминологию ТН ВЭД и таможенного законодательства. Если информации недостаточно для точной классификации - честно укажи это и предложи варианты с разной степенью вероятности. Всегда указывай на риски и возможные проблемы.

**ВАЖНО:** 
- Всегда анализируй товар комплексно, учитывая все характеристики из документа
- Не делай поспешных выводов - лучше указать на недостаток информации
- Если товар может относиться к нескольким позициям - детально объясни, почему выбран именно этот код
- Учитывай практический опыт таможенного брокера - указывай на реальные проблемы, с которыми можно столкнуться
- Всегда предупреждай о рисках доначисления пошлин и штрафов`;

    // Ограничение длины текста для анализа (максимум 50000 символов)
    const maxTextLength = 50000;
    if (text.length > maxTextLength) {
      text = text.substring(0, maxTextLength) + '\n\n[Текст обрезан из-за ограничения длины]';
    }

    // Получаем похожие примеры из базы знаний для few-shot learning
    const similarExamples = getSimilarExamples(text, 3);
    const examplesPrompt = formatExamplesForPrompt(similarExamples);
    
    // Ищем релевантные коды ТН ВЭД в базе данных
    const relevantCodes = searchTNVED(text, 5);
    let tnvedPrompt = '';
    if (relevantCodes.length > 0) {
      tnvedPrompt = '\n\n**РЕЛЕВАНТНЫЕ КОДЫ ТН ВЭД ИЗ БАЗЫ ДАННЫХ:**\n';
      relevantCodes.forEach((code, index) => {
        tnvedPrompt += `${index + 1}. Код: ${code.code} - ${code.name}\n`;
        if (code.category) {
          tnvedPrompt += `   Категория: ${code.category}\n`;
        }
        if (code.keywords && code.keywords.length > 0) {
          tnvedPrompt += `   Ключевые слова: ${code.keywords.slice(0, 5).join(', ')}\n`;
        }
        tnvedPrompt += '\n';
      });
      tnvedPrompt += 'Используй эти коды как справочную информацию при классификации.\n';
    }

    // 4. Отправляем запрос к DeepSeek API (OpenAI-совместимый формат)
    // Создаем AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Таймаут 60 секунд
    
    let response: Response;
    try {
      response = await fetch(
        'https://api.deepseek.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat', // Основная модель DeepSeek
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
            {
              role: 'user',
              content: `${examplesPrompt}${tnvedPrompt}Описание товара для анализа:\n${text}`,
            },
            ],
            temperature: 0.2, // Очень низкая "творческость" для максимальной точности
            max_tokens: 4000, // Увеличенный лимит для детального анализа
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Превышено время ожидания ответа от API. Попробуйте позже или загрузите файл меньшего размера.' },
          { status: 504 }
        );
      }
      throw fetchError;
    }

    // 5. Обрабатываем ответ от DeepSeek API
    if (!response.ok) {
      let errorMessage = 'Ошибка API ИИ';
      try {
        const errorData = await response.json();
        const apiErrorMessage = errorData.error?.message || errorData.error || response.statusText;
        
        // Обработка специфичных ошибок API
        if (response.status === 401) {
          errorMessage = 'Неверный API-ключ. Проверьте настройки DEEPSEEK_API_KEY в файле .env.local';
        } else if (response.status === 402 || response.status === 403) {
          // 402 Payment Required или 403 Forbidden - обычно означает проблемы с оплатой
          if (apiErrorMessage?.toLowerCase().includes('balance') || 
              apiErrorMessage?.toLowerCase().includes('insufficient') ||
              apiErrorMessage?.toLowerCase().includes('payment')) {
            errorMessage = 'Недостаточно баланса на API-ключе DeepSeek. Пополните баланс на https://platform.deepseek.com';
          } else {
            errorMessage = 'Проблема с доступом к API. Проверьте баланс и статус аккаунта на https://platform.deepseek.com';
          }
        } else if (response.status === 429) {
          errorMessage = 'Превышен лимит запросов к API. Попробуйте позже или проверьте тарифный план.';
        } else if (response.status === 503) {
          errorMessage = 'Сервис временно недоступен. Попробуйте позже.';
        } else {
          errorMessage = apiErrorMessage || `Ошибка API (код ${response.status})`;
        }
      } catch (parseError) {
        const errorText = await response.text();
        // Проверяем текст ошибки на наличие ключевых слов о балансе
        if (errorText?.toLowerCase().includes('balance') || 
            errorText?.toLowerCase().includes('insufficient')) {
          errorMessage = 'Недостаточно баланса на API-ключе DeepSeek. Пополните баланс на https://platform.deepseek.com';
        } else {
          errorMessage = errorText || response.statusText || `Ошибка API (код ${response.status})`;
        }
      }
      
      console.error('DeepSeek API Error:', response.status, errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    // Проверяем Content-Type ответа
    const responseContentType = response.headers.get('content-type');
    if (!responseContentType || !responseContentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('API вернул не JSON ответ:', {
        status: response.status,
        contentType: responseContentType,
        body: responseText.substring(0, 500),
      });
      
      let errorMessage = 'API вернул ответ в неожиданном формате.';
      if (responseText.includes('insufficient_quota') || responseText.includes('balance')) {
        errorMessage = 'Недостаточно баланса на API-ключе DeepSeek. Пополните баланс на https://platform.deepseek.com';
      } else if (responseText.includes('rate_limit')) {
        errorMessage = 'Превышен лимит запросов. Попробуйте позже.';
      } else if (response.status === 401) {
        errorMessage = 'Неверный API-ключ. Проверьте настройки DEEPSEEK_API_KEY в файле .env.local';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 502 }
      );
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseError: any) {
      // Пытаемся прочитать текст ответа для диагностики
      const responseText = await response.text().catch(() => 'Не удалось прочитать ответ');
      console.error('Ошибка парсинга ответа API:', {
        error: parseError.message,
        status: response.status,
        contentType: responseContentType,
        responsePreview: responseText.substring(0, 500),
      });
      
      return NextResponse.json(
        { 
          error: 'Ошибка при обработке ответа от API. Проверьте логи сервера для деталей.',
          details: process.env.NODE_ENV === 'development' ? parseError.message : undefined
        },
        { status: 502 }
      );
    }

    // Проверяем структуру ответа
    if (!data || typeof data !== 'object') {
      console.error('API вернул не объект:', data);
      return NextResponse.json(
        { error: 'API вернул ответ в неожиданном формате.' },
        { status: 502 }
      );
    }

    // Проверяем наличие ошибки в ответе
    if (data.error) {
      console.error('API вернул ошибку:', data.error);
      let errorMessage = data.error.message || data.error || 'Ошибка API';
      
      if (errorMessage.includes('insufficient_quota') || errorMessage.includes('balance')) {
        errorMessage = 'Недостаточно баланса на API-ключе DeepSeek. Пополните баланс на https://platform.deepseek.com';
      } else if (errorMessage.includes('rate_limit')) {
        errorMessage = 'Превышен лимит запросов. Попробуйте позже.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 502 }
      );
    }

    const resultText = data.choices?.[0]?.message?.content;

    if (!resultText) {
      console.error('Неожиданный формат ответа API:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        firstChoice: data.choices?.[0],
        fullResponse: JSON.stringify(data).substring(0, 1000),
      });
      return NextResponse.json(
        { 
          error: 'ИИ не вернул ответ в ожидаемом формате. Попробуйте еще раз.',
          details: process.env.NODE_ENV === 'development' ? 'Ответ не содержит choices[0].message.content' : undefined
        },
        { status: 502 }
      );
    }

    // 6. Возвращаем успешный результат
    return NextResponse.json({ result: resultText });

  } catch (error: any) {
    console.error('Internal server error:', error);
    
    // Более информативные сообщения об ошибках
    let errorMessage = 'Внутренняя ошибка сервера при анализе.';
    let statusCode = 500;
    
    if (error.name === 'AbortError') {
      errorMessage = 'Превышено время ожидания. Попробуйте позже.';
      statusCode = 504;
    } else if (error.message) {
      // Не раскрываем внутренние детали ошибок в продакшене
      errorMessage = 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}