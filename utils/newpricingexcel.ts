import ExcelJS from 'exceljs';

// ─────────────────────────────────────────────
// CourseData — Excel format:
//   id | courseName | price  (discount is optional)
// ─────────────────────────────────────────────
export interface CourseData {
  courseName: string;
  price:      number;
  discount?:  number;  // optional discount price
}

// ─────────────────────────────────────────────
// MonthResult — per-month verification outcome
// ─────────────────────────────────────────────
export interface MonthResult {
  month:        string;
  status:       'PASS' | 'FAIL' | 'NOT_FOUND';
  webPrices:    string[];
  matched:      string;
}

// ─────────────────────────────────────────────
// ResultRow — one row per course/country in output
// ─────────────────────────────────────────────
export interface ResultRow {
  courseName:    string;
  country:       string;
  excelPrice:    string;
  excelDiscount: string;
  httpStatus:    number;
  monthResults:  MonthResult[];
  overallStatus: 'PASS' | 'FAIL';
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
// READ EXCEL — supports both:
//   2-col: courseName | price
//   3-col: id | courseName | price
//   4-col: id | courseName | price | discount
// ─────────────────────────────────────────────
export async function readExcel(filePath: string): Promise<CourseData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  const data: CourseData[] = [];

  // Detect header row to understand column layout
  let headerRow: string[] = [];
  sheet.getRow(1).eachCell((cell, colNum) => {
    headerRow[colNum - 1] = cellText(cell).trim().toLowerCase();
  });

  console.log(`📋 Excel headers detected: ${headerRow.join(', ')}`);

  // Find column indices (1-based for ExcelJS)
  const courseNameColIdx = headerRow.findIndex(h =>
    h.includes('course') || h.includes('name') || h.includes('url') || h.includes('slug')
  ) + 1;

  const priceColIdx = headerRow.findIndex(h =>
    h === 'price' || h.includes('price')
  ) + 1;

  const discountColIdx = headerRow.findIndex(h =>
    h.includes('discount') || h.includes('disc')
  ) + 1;

  // Fallback: if no headers matched, assume col layout based on count
  const effectiveCourseCol = courseNameColIdx > 0 ? courseNameColIdx : (headerRow.length >= 3 ? 2 : 1);
  const effectivePriceCol  = priceColIdx > 0 ? priceColIdx : (headerRow.length >= 3 ? 3 : 2);
  const effectiveDiscCol   = discountColIdx > 0 ? discountColIdx : (headerRow.length >= 4 ? 4 : 0);

  console.log(`📌 Using columns → courseName:${effectiveCourseCol}, price:${effectivePriceCol}, discount:${effectiveDiscCol || 'none'}`);

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const courseName = cellText(row.getCell(effectiveCourseCol)).trim();
    if (!courseName) return;

    const price    = cellNumber(row.getCell(effectivePriceCol));
    const discount = effectiveDiscCol > 0 ? cellNumber(row.getCell(effectiveDiscCol)) : 0;

    data.push({ courseName, price, discount: discount || undefined });
  });

  console.log(`📊 Loaded ${data.length} rows from Excel`);
  return data;
}

// ─────────────────────────────────────────────
// WRITE RESULTS — one row per course,
// columns: CourseName | Country | ExcelPrice | ExcelDiscount | HTTP |
//          Overall | Jul_WebPrices | Jul_Status | ...
// ─────────────────────────────────────────────
export const MONTHS = ['July', 'August', 'September', 'October', 'November', 'December'];

export async function writeResults(filePath: string, results: ResultRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet('Results');

  // Build header
  const header = ['Course Name', 'Country', 'Excel Price', 'Excel Discount', 'HTTP Status', 'Overall'];
  for (const m of MONTHS) {
    header.push(`${m} Web Prices`);
    header.push(`${m} Status`);
  }
  const headerRow = sheet.addRow(header);

  // Style header
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
  });

  // Data rows
  results.forEach(r => {
    const row: any[] = [
      r.courseName,
      r.country,
      r.excelPrice,
      r.excelDiscount || '—',
      r.httpStatus,
      r.overallStatus,
    ];

    for (const m of MONTHS) {
      const mr = r.monthResults.find(x => x.month === m);
      if (mr) {
        row.push(mr.webPrices.join(', ') || '—');
        row.push(mr.status);
      } else {
        row.push('—');
        row.push('NOT_FOUND');
      }
    }

    const dataRow = sheet.addRow(row);

    // Colour the Overall cell (col 6)
    const overallCell = dataRow.getCell(6);
    overallCell.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: r.overallStatus === 'PASS' ? 'FF70AD47' : 'FFFF0000' },
    };
    overallCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Colour each month status cell
    MONTHS.forEach((m, i) => {
      const statusColIndex = 7 + i * 2 + 1; // 1-based: col7=Jul_WebPrices, col8=Jul_Status, etc.
      const cell = dataRow.getCell(statusColIndex);
      const mr   = r.monthResults.find(x => x.month === m);
      if (mr) {
        if (mr.status === 'PASS') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
          cell.font = { color: { argb: 'FFFFFFFF' } };
        } else if (mr.status === 'FAIL') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          cell.font = { color: { argb: 'FFFFFFFF' } };
        }
      }
    });
  });

  // Auto-fit columns
  sheet.columns.forEach(col => { col.width = 22; });
  sheet.getColumn(1).width = 55;
  sheet.getColumn(2).width = 10;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 18;

  await workbook.xlsx.writeFile(filePath);
  console.log(`📁 Results saved: ${filePath}`);
}