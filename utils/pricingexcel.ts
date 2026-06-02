import ExcelJS from 'exceljs';

// ─────────────────────────────────────────────
// CourseData — 4-column Excel format:
//   courseName | f_price | f_p_price | p_price
// No discount columns in Pricing13.xlsx
// ─────────────────────────────────────────────
export interface CourseData {
  courseName:  string;
  f_price:     number;   // Foundation price
  f_p_price:   number;   // Foundation + Practitioner price
  p_price:     number;   // Practitioner price
}

function cellNumber(cell: ExcelJS.Cell): number {
  const v = cell.value;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'object' && 'result' in (v as any)) {
    return Number((v as any).result) || 0;
  }
  return Number(v) || 0;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'result' in (v as any)) {
    return String((v as any).result);
  }
  return String(v);
}

// ─────────────────────────────────────────────
// READ EXCEL — 4-column format
// ─────────────────────────────────────────────
export async function readExcel(filePath: string): Promise<CourseData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  const data: CourseData[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const courseName = cellText(row.getCell(1)).trim();
    if (!courseName) return;

    data.push({
      courseName,
      f_price:   cellNumber(row.getCell(2)),
      f_p_price: cellNumber(row.getCell(3)),
      p_price:   cellNumber(row.getCell(4)),
    });
  });

  console.log(`📊 Loaded ${data.length} rows from Excel`);
  return data;
}

// ─────────────────────────────────────────────
// WRITE RESULTS — includes month column
// ─────────────────────────────────────────────
export async function writeResults(filePath: string, results: any[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet('Results');

  sheet.addRow([
    'Course Name',
    'Country',
    'Month',
    'Excel F_Price',
    'Excel F+P_Price',
    'Excel P_Price',
    'Web Prices',
    'HTTP Status',
    'Status',
  ]);

  results.forEach(r => {
    sheet.addRow([
      r.courseName,
      r.country,
      r.month,
      r.excelFPrice,
      r.excelFPPrice,
      r.excelPPrice,
      Array.isArray(r.webPrices) ? r.webPrices.join(' | ') : r.webPrices,
      r.httpStatus,
      r.status,
    ]);
  });

  await workbook.xlsx.writeFile(filePath);
  console.log(`📁 Results saved: ${filePath}`);
}