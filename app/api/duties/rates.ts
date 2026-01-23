/**
 * Актуальные ставки таможенных пошлин и сборов для России на 2026 год
 * Обновлено на основе официальных источников
 */

export interface DutyRate {
  code: string; // Код ТН ВЭД (может быть частичным для группы товаров)
  dutyRate?: number; // Ставка пошлины (%)
  fixedDuty?: number; // Фиксированная пошлина (руб за единицу)
  vatRate: number; // Ставка НДС (%)
  excise?: number; // Акциз (если применимо)
  notes?: string; // Примечания
}

/**
 * Ставки таможенных сборов на 2026 год (актуальные)
 */
export const customsFees2026 = {
  // Минимальные и максимальные ставки сборов
  minFee: 1231, // Минимальная ставка (для товаров до 200 000 руб)
  maxFee: 73860, // Максимальная ставка (для товаров от 10 млн руб)
  
  // Для радиоэлектроники - фиксированная ставка
  electronicsFixedFee: 73860,
  
  // Для товаров без индексации
  nonIndexedFees: {
    upTo50Items: 9054,
    from51To100Items: 18108,
    over101Items: 30180,
  },
  
  // Ставки в зависимости от таможенной стоимости
  byValue: [
    { maxValue: 200000, fee: 1231 },
    { maxValue: 450000, fee: 3500 },
    { maxValue: 1200000, fee: 7500 },
    { maxValue: 2500000, fee: 12000 },
    { maxValue: 5000000, fee: 15500 },
    { maxValue: 10000000, fee: 20000 },
    { minValue: 10000000, fee: 73860 }, // От 10 млн - фиксированная ставка
  ],
};

/**
 * Базовые ставки НДС на 2026 год
 * С 1 января 2026 года основная ставка НДС повышена с 20% до 22%
 */
export const vatRates2026 = {
  standard: 22, // Стандартная ставка НДС (повышена с 20% с 01.01.2026)
  reduced: 10, // Пониженная ставка (продукты питания, детские товары, лекарства)
  zero: 0, // Нулевая ставка (экспорт, некоторые категории)
};

/**
 * Ставки пошлин по категориям товаров (примеры)
 * В реальной системе это должно быть полное покрытие всех кодов ТН ВЭД
 */
export const dutyRatesByCategory: Record<string, DutyRate[]> = {
  // Электроника
  electronics: [
    { code: '8517', dutyRate: 0, vatRate: 22, notes: 'Телефоны, смартфоны' },
    { code: '8471', dutyRate: 0, vatRate: 22, notes: 'Компьютеры, ноутбуки' },
    { code: '8528', dutyRate: 0, vatRate: 22, notes: 'Мониторы, телевизоры' },
  ],
  
  // Текстиль
  textiles: [
    { code: '6302', dutyRate: 10, vatRate: 22, notes: 'Постельное белье' },
    { code: '6201', dutyRate: 10, vatRate: 22, notes: 'Мужская верхняя одежда' },
    { code: '6202', dutyRate: 10, vatRate: 22, notes: 'Женская верхняя одежда' },
  ],
  
  // Продукты питания
  food: [
    { code: '0901', dutyRate: 5, vatRate: 10, notes: 'Кофе' },
    { code: '0902', dutyRate: 5, vatRate: 10, notes: 'Чай' },
    { code: '2203', dutyRate: 0, vatRate: 22, notes: 'Пиво' },
  ],
  
  // Автомобили
  vehicles: [
    { code: '8703', dutyRate: 15, vatRate: 22, notes: 'Легковые автомобили' },
    { code: '8704', dutyRate: 10, vatRate: 22, notes: 'Грузовые автомобили' },
  ],
  
  // Мебель
  furniture: [
    { code: '9403', dutyRate: 15, vatRate: 22, notes: 'Мебель для офисов' },
    { code: '9401', dutyRate: 15, vatRate: 22, notes: 'Мебель для сидения' },
  ],
};

/**
 * Получить ставку пошлины для кода ТН ВЭД
 */
export function getDutyRate(tnvedCode: string): DutyRate | null {
  // Упрощенный поиск - в реальной системе нужна полная база
  const codePrefix = tnvedCode.substring(0, 4);
  
  for (const category of Object.values(dutyRatesByCategory)) {
    const match = category.find(rate => rate.code === codePrefix);
    if (match) {
      return match;
    }
  }
  
  return null;
}

/**
 * Рассчитать таможенные платежи
 */
export function calculateCustomsPayments(
  tnvedCode: string,
  customsValue: number, // Таможенная стоимость в рублях
  quantity: number = 1
): {
  duty: number;
  vat: number;
  customsFee: number;
  total: number;
} {
  const rate = getDutyRate(tnvedCode);
  const vatRate = rate?.vatRate || vatRates2026.standard;
  const dutyRate = rate?.dutyRate || 0;
  
  // Расчет пошлины
  let duty = 0;
  if (rate?.fixedDuty) {
    duty = rate.fixedDuty * quantity;
  } else {
    duty = (customsValue * dutyRate) / 100;
  }
  
  // Расчет НДС (с учетом пошлины)
  const vatBase = customsValue + duty;
  const vat = (vatBase * vatRate) / 100;
  
  // Расчет таможенного сбора
  let customsFee = customsFees2026.minFee;
  for (const feeTier of customsFees2026.byValue) {
    if ('maxValue' in feeTier && customsValue <= feeTier.maxValue) {
      customsFee = feeTier.fee;
      break;
    }
    if ('minValue' in feeTier && customsValue >= feeTier.minValue) {
      customsFee = feeTier.fee;
      break;
    }
  }
  
  // Для радиоэлектроники - фиксированная ставка
  const electronicsCodes = ['8517', '8471', '8528', '8517'];
  if (electronicsCodes.some(code => tnvedCode.startsWith(code))) {
    customsFee = customsFees2026.electronicsFixedFee;
  }
  
  const total = duty + vat + customsFee;
  
  return {
    duty: Math.round(duty * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    customsFee: Math.round(customsFee * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
