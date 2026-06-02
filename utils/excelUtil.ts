import ExcelJS from 'exceljs';

export interface CourseData {
  courseName: string;
  price: number;
  discountPrice: number;
}

// ✅ READ EXCEL
export async function readExcel(filePath: string): Promise<CourseData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  const data: CourseData[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    data.push({
      courseName: row.getCell(1).text,
      price: Number(row.getCell(2).text),
      discountPrice: Number(row.getCell(3).text)
    });
  });

  console.log(`📊 Loaded ${data.length} rows from Excel`);

  return data;
}

// ✅ WRITE RESULT
export async function writeResults(filePath: string, results: any[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Results');

  sheet.addRow([
    'Course Name',
    'Country',
    'Excel Price',
    'Excel Discount',
    'Web Prices',
    'First Available Price',
    'HTTP Status',
    'Result Code',
    'Status'
  ]);

  results.forEach(r => {
    sheet.addRow([
      r.courseName,
      r.country,
      r.excelPrice,
      r.excelDiscount,
      r.webPrices.join(', '),
      r.firstAvailablePrice,
      r.httpStatus,
      r.resultCode,
      r.status
    ]);
  });

  await workbook.xlsx.writeFile(filePath);

  console.log(`📁 Results saved: ${filePath}`);
}