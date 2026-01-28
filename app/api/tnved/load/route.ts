import { NextRequest, NextResponse } from 'next/server';
import { loadTNVEDDatabase, addTNVEDCode, getDatabaseStats, TNVEDCode } from '../database';

/**
 * API endpoint для загрузки базы данных ТН ВЭД
 * Поддерживает загрузку из JSON файла
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Файл не был загружен.' },
        { status: 400 }
      );
    }

    // Проверка типа файла
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Поддерживается только формат JSON.' },
        { status: 400 }
      );
    }

    // Читаем файл
    const text = await file.text();
    let data: TNVEDCode[] | TNVEDCode;
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Ошибка парсинга JSON файла.' },
        { status: 400 }
      );
    }

    // Нормализуем данные
    const codes: TNVEDCode[] = Array.isArray(data) ? data : [data];
    
    // Валидация структуры
    const validCodes: TNVEDCode[] = [];
    for (const code of codes) {
      if (code.code && code.name) {
        // Нормализуем код (убираем пробелы, добавляем форматирование)
        const normalizedCode = code.code.replace(/\s+/g, '');
        if (normalizedCode.length === 10) {
          validCodes.push({
            ...code,
            code: `${normalizedCode.slice(0, 4)} ${normalizedCode.slice(4, 6)} ${normalizedCode.slice(6, 8)} ${normalizedCode.slice(8, 10)}`,
            keywords: code.keywords || [],
            category: code.category || 'Не указана',
          });
        }
      }
    }

    if (validCodes.length === 0) {
      return NextResponse.json(
        { error: 'Не найдено валидных кодов ТН ВЭД в файле.' },
        { status: 400 }
      );
    }

    // Загружаем в базу данных
    loadTNVEDDatabase(validCodes);

    return NextResponse.json({
      success: true,
      message: `Успешно загружено ${validCodes.length} кодов ТН ВЭД`,
      loaded: validCodes.length,
      total: validCodes.length,
    });

  } catch (error: any) {
    console.error('Ошибка при загрузке базы ТН ВЭД:', error);
    return NextResponse.json(
      { error: `Ошибка при загрузке: ${error.message || 'Неизвестная ошибка'}` },
      { status: 500 }
    );
  }
}

/**
 * Получить статистику базы данных
 */
export async function GET() {
  try {
    const stats = getDatabaseStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Ошибка: ${error.message || 'Неизвестная ошибка'}` },
      { status: 500 }
    );
  }
}
