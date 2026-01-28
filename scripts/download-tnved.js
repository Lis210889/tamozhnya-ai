/**
 * Скрипт для загрузки базы данных ТН ВЭД из открытых источников
 * 
 * Инструкция:
 * 1. Скачайте Excel файл с https://tws.by/tws/tnved/download
 * 2. Установите зависимости: npm install xlsx
 * 3. Запустите: node scripts/download-tnved.js <путь_к_excel_файлу>
 */

const fs = require('fs');
const path = require('path');

// Проверяем наличие xlsx
let XLSX;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.error('❌ Ошибка: Не установлен модуль xlsx');
  console.log('Установите его командой: npm install xlsx');
  process.exit(1);
}

const excelFilePath = process.argv[2];

if (!excelFilePath) {
  console.log('📋 Использование: node scripts/download-tnved.js <путь_к_excel_файлу>');
  console.log('');
  console.log('📥 Скачайте Excel файл с кодами ТН ВЭД:');
  console.log('   https://tws.by/tws/tnved/download');
  console.log('');
  process.exit(1);
}

if (!fs.existsSync(excelFilePath)) {
  console.error(`❌ Файл не найден: ${excelFilePath}`);
  process.exit(1);
}

console.log('🔄 Чтение Excel файла...');

try {
  // Читаем Excel файл
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Конвертируем в JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`✅ Прочитано ${data.length} строк`);
  
  // Преобразуем в формат нашей базы данных
  const tnvedCodes = data.map((row, index) => {
    // Адаптируем под структуру данных (зависит от формата Excel файла)
    // Это примерная структура - может потребоваться адаптация
    
    const code = String(row['Код ТН ВЭД'] || row['Code'] || row['код'] || '').trim();
    const name = String(row['Наименование'] || row['Name'] || row['наименование'] || '').trim();
    
    // Нормализуем код (убираем пробелы, форматируем)
    const normalizedCode = code.replace(/\s+/g, '');
    if (normalizedCode.length !== 10) {
      console.warn(`⚠️  Строка ${index + 1}: неверный формат кода "${code}"`);
      return null;
    }
    
    // Форматируем код: XXXX XX XX XX
    const formattedCode = `${normalizedCode.slice(0, 4)} ${normalizedCode.slice(4, 6)} ${normalizedCode.slice(6, 8)} ${normalizedCode.slice(8, 10)}`;
    
    // Извлекаем ключевые слова из названия
    const keywords = name.toLowerCase()
      .split(/[\s,;:]+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
    
    return {
      code: formattedCode,
      name: name,
      section: normalizedCode.slice(0, 2), // Примерно
      group: normalizedCode.slice(0, 2),
      position: normalizedCode.slice(0, 4),
      subsection: normalizedCode.slice(0, 6),
      subsubsection: normalizedCode,
      keywords: keywords,
      category: row['Категория'] || row['Category'] || 'Не указана',
      dutyRate: row['Пошлина'] || row['Duty'] ? parseFloat(row['Пошлина'] || row['Duty']) : undefined,
      vatRate: row['НДС'] || row['VAT'] ? parseFloat(row['НДС'] || row['VAT']) : 20,
      notes: row['Примечания'] || row['Notes'] || undefined,
    };
  }).filter(code => code !== null);
  
  // Сохраняем в JSON
  const outputPath = path.join(process.cwd(), 'public', 'tnved-database.json');
  fs.writeFileSync(outputPath, JSON.stringify(tnvedCodes, null, 2), 'utf8');
  
  console.log(`✅ Конвертировано ${tnvedCodes.length} кодов ТН ВЭД`);
  console.log(`📁 Сохранено в: ${outputPath}`);
  console.log('');
  console.log('📤 Теперь загрузите файл через:');
  console.log('   http://localhost:3000/admin/tnved');
  console.log('');
  
} catch (error) {
  console.error('❌ Ошибка при обработке файла:', error.message);
  console.log('');
  console.log('💡 Возможные причины:');
  console.log('   - Неверный формат Excel файла');
  console.log('   - Неправильные названия колонок');
  console.log('   - Файл поврежден');
  console.log('');
  console.log('📝 Проверьте структуру Excel файла и адаптируйте скрипт под ваш формат');
  process.exit(1);
}
