import ExcelJS from 'exceljs';

export interface CourseData {
  courseName: string;
  price: number;
}

export interface MonthResult {
  month: string;
  status: 'PASS' | 'FAIL';
  webPrice: string;
}

export interface ResultRow {
  courseName: string;
  country: string;
  excelPrice: string;
  overallStatus: 'PASS' | 'FAIL';
  monthResults: MonthResult[];
}

export const MONTHS = [
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export async function readExcel(filePath: string): Promise<CourseData[]> {

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];

  const data: CourseData[] = [];

  sheet.eachRow((row, rowNumber) => {

    if (rowNumber === 1) return;

    const courseName = String(row.getCell(2).value || '').trim();
    const price = Number(row.getCell(3).value || 0);

    if (!courseName) return;

    data.push({
      courseName,
      price,
    });
  });

  return data;
}

export async function writeResults(
  filePath: string,
  results: ResultRow[]
) {

  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet('Results');

  const headers = [
    'Course',
    'Country',
    'Excel Price',
    'Overall Status',
  ];

  MONTHS.forEach(month => {
    headers.push(`${month} Price`);
    headers.push(`${month} Status`);
  });

  sheet.addRow(headers);

  for (const result of results) {

    const row: any[] = [
      result.courseName,
      result.country,
      result.excelPrice,
      result.overallStatus,
    ];

    for (const month of MONTHS) {

      const monthResult =
        result.monthResults.find(m => m.month === month);

      row.push(monthResult?.webPrice || '');
      row.push(monthResult?.status || 'FAIL');
    }

    sheet.addRow(row);
  }

  await workbook.xlsx.writeFile(filePath);

  console.log(`📁 Results written → ${filePath}`);
}