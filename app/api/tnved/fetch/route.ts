import { NextRequest, NextResponse } from 'next/server';
import { loadTNVEDDatabase, TNVEDCode } from '../database';

/**
 * API для автоматической загрузки базы ТН ВЭД из открытых источников
 * Использует TWS.by и другие публичные источники
 */
export async function POST(request: NextRequest) {
  try {
    // Попытка загрузить данные из TWS.by (бесплатный источник)
    // Примечание: в реальности нужно скачать Excel и конвертировать в JSON
    // Здесь мы создаем структуру для будущей интеграции
    
    const response = await NextResponse.json({
      success: false,
      message: 'Автоматическая загрузка требует настройки. Используйте ручную загрузку через /admin/tnved',
      instructions: [
        '1. Перейдите на https://tws.by/tws/tnved/download',
        '2. Скачайте Excel файл с кодами ТН ВЭД',
        '3. Конвертируйте в JSON формат',
        '4. Загрузите через /admin/tnved или /api/tnved/load',
      ],
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: `Ошибка: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Получить информацию об источниках данных
 */
export async function GET() {
  return NextResponse.json({
    sources: [
      {
        name: 'TWS.by',
        url: 'https://tws.by/tws/tnved/download',
        type: 'Excel',
        free: true,
        description: 'Бесплатная ежедневно обновляемая база ТН ВЭД ЕАЭС',
      },
      {
        name: 'Евразийская экономическая комиссия',
        url: 'https://portal.eaeunion.org',
        type: 'API',
        free: false,
        description: 'Официальный источник, требует регистрации',
      },
      {
        name: 'TKS.ru API',
        url: 'https://www.tks.ru/tnvedapi/',
        type: 'API',
        free: false,
        cost: 'от 3000 руб/месяц',
        description: 'Коммерческий API с полной информацией по кодам',
      },
    ],
    instructions: {
      step1: 'Скачайте Excel файл с TWS.by',
      step2: 'Конвертируйте в JSON используя скрипт или онлайн-конвертер',
      step3: 'Загрузите через /admin/tnved',
    },
  });
}
