/**
 * База данных ТН ВЭД
 * Хранит все коды ТН ВЭД с описаниями для быстрого поиска
 */

export interface TNVEDCode {
  code: string; // 10-значный код ТН ВЭД (формат: XXXX XX XX XX)
  name: string; // Полное наименование товара
  section: string; // Раздел (I-XXI)
  group: string; // Группа (2 знака)
  position: string; // Позиция (4 знака)
  subsection: string; // Подпозиция (6 знаков)
  subsubsection: string; // Субпозиция (10 знаков)
  keywords: string[]; // Ключевые слова для поиска
  category: string; // Категория товара
  dutyRate?: number; // Ставка пошлины (%)
  vatRate?: number; // Ставка НДС (%)
  notes?: string; // Примечания
}

// In-memory база данных ТН ВЭД
let tnvedDatabase: TNVEDCode[] = [];

/**
 * Загрузить базу данных ТН ВЭД из массива
 */
export function loadTNVEDDatabase(codes: TNVEDCode[]): void {
  tnvedDatabase = codes;
  console.log(`Загружено ${codes.length} кодов ТН ВЭД в базу данных`);
}

/**
 * Добавить код ТН ВЭД в базу
 */
export function addTNVEDCode(code: TNVEDCode): void {
  const existing = tnvedDatabase.find(c => c.code === code.code);
  if (existing) {
    // Обновляем существующий
    Object.assign(existing, code);
  } else {
    tnvedDatabase.push(code);
  }
}

/**
 * Найти коды ТН ВЭД по описанию товара
 */
export function searchByDescription(description: string, limit: number = 10): TNVEDCode[] {
  const keywords = description.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  
  return tnvedDatabase
    .map(code => ({
      ...code,
      score: calculateRelevanceScore(code, keywords)
    }))
    .filter(code => code.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...code }) => code);
}

/**
 * Найти код ТН ВЭД по точному коду
 */
export function findByCode(code: string): TNVEDCode | undefined {
  const normalizedCode = code.replace(/\s+/g, '');
  return tnvedDatabase.find(c => c.code.replace(/\s+/g, '') === normalizedCode);
}

/**
 * Найти коды по категории
 */
export function findByCategory(category: string, limit: number = 20): TNVEDCode[] {
  return tnvedDatabase
    .filter(code => code.category.toLowerCase().includes(category.toLowerCase()))
    .slice(0, limit);
}

/**
 * Вычислить релевантность кода для описания товара
 */
function calculateRelevanceScore(code: TNVEDCode, keywords: string[]): number {
  let score = 0;
  const searchText = `${code.name} ${code.keywords.join(' ')} ${code.category}`.toLowerCase();
  
  keywords.forEach(keyword => {
    // Точное совпадение в названии - высший приоритет
    if (code.name.toLowerCase().includes(keyword)) {
      score += 10;
    }
    // Совпадение в ключевых словах
    if (code.keywords.some(k => k.toLowerCase().includes(keyword))) {
      score += 5;
    }
    // Совпадение в категории
    if (code.category.toLowerCase().includes(keyword)) {
      score += 3;
    }
    // Частичное совпадение
    if (searchText.includes(keyword)) {
      score += 1;
    }
  });
  
  return score;
}

/**
 * Получить статистику базы данных
 */
export function getDatabaseStats() {
  return {
    totalCodes: tnvedDatabase.length,
    categories: [...new Set(tnvedDatabase.map(c => c.category))].length,
    sections: [...new Set(tnvedDatabase.map(c => c.section))].length,
  };
}

/**
 * Экспортировать базу данных
 */
export function exportDatabase(): TNVEDCode[] {
  return [...tnvedDatabase];
}

/**
 * Очистить базу данных
 */
export function clearDatabase(): void {
  tnvedDatabase = [];
}
