import ExcelJS from 'exceljs';

export interface ScheduleRow {
  id:         number;
  courseName: string;   // "pmi-acp-certification-training/ al"
  months:     string[]; // ["Jan", "May", "Jun"]
  courseSlug: string;   // "pmi-acp-certification-training"
  country:    string;   // "al"
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object' && 'result' in (v as any)) return String((v as any).result).trim();
  return String(v).trim();
}

function cellNumber(cell: ExcelJS.Cell): number {
  const v = cell.value;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'object' && 'result' in (v as any)) return Number((v as any).result) || 0;
  return Number(v) || 0;
}

// ─────────────────────────────────────────────
// Parse "pmi-acp-certification-training/ al"
// → { slug: "pmi-acp-certification-training", country: "al" }
// ─────────────────────────────────────────────
function parseCourseAndCountry(raw: string): { slug: string; country: string } {
  const trimmed = raw.trim();
  const slashIdx = trimmed.lastIndexOf('/');
  if (slashIdx === -1) {
    return { slug: trimmed, country: 'us' };
  }
  const slug    = trimmed.slice(0, slashIdx).trim();
  const country = trimmed.slice(slashIdx + 1).trim().toLowerCase();
  return { slug, country };
}

// ─────────────────────────────────────────────
// Parse months string: "Jan,May,June" or "May, June"
// Normalises to 3-letter short names: ["Jan","May","Jun"]
// ─────────────────────────────────────────────
function parseMonths(raw: string): string[] {
  const FULL_TO_SHORT: Record<string, string> = {
    january:'Jan',  february:'Feb', march:'Mar',     april:'Apr',
    may:'May',      june:'Jun',     july:'Jul',       august:'Aug',
    september:'Sep',october:'Oct',  november:'Nov',   december:'Dec',
  };

  return raw
    .split(',')
    .map(m => m.trim())
    .filter(Boolean)
    .map(m => {
      const lower = m.toLowerCase();
      // Already short (3 chars)
      if (m.length === 3) return m.slice(0, 1).toUpperCase() + m.slice(1).toLowerCase();
      // Full name
      return FULL_TO_SHORT[lower] ?? m.slice(0, 3);
    });
}

// ─────────────────────────────────────────────
// READ SCHEDULE EXCEL
// Columns: id | courseName | name (months)
// ─────────────────────────────────────────────
export async function readScheduleExcel(filePath: string): Promise<ScheduleRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  const rows: ScheduleRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const id         = cellNumber(row.getCell(1));
    const courseName = cellText(row.getCell(2));
    const monthsRaw  = cellText(row.getCell(3));

    if (!courseName) return;

    const { slug, country } = parseCourseAndCountry(courseName);
    const months             = parseMonths(monthsRaw);

    rows.push({ id, courseName, months, courseSlug: slug, country });
  });

  console.log(`📊 Loaded ${rows.length} rows from ${filePath}`);
  return rows;
}

// ─────────────────────────────────────────────
// WRITE RESULTS
// ─────────────────────────────────────────────
export async function writeScheduleResults(
  filePath: string,
  results: {
    id:          number;
    courseName:  string;
    country:     string;
    months:      string[];
    monthStatus: { month: string; inDropdown: boolean; eventCount: number; status: 'PASS' | 'FAIL' }[];
    httpStatus:  number;
    status:      'PASS' | 'FAIL' | 'NAV_FAIL';
  }[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet('Results');

  sheet.addRow([
    'ID', 'Course', 'Country', 'Expected Months',
    'Month Results', 'HTTP Status', 'Overall Status',
  ]);

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font  = { bold: true };

  results.forEach(r => {
    const monthDetail = r.monthStatus
      .map(m =>
        `${m.month}:${m.status}` +
        `(dropdown:${m.inDropdown ? 'YES' : 'NO'}` +
        `,events:${m.eventCount})`
      )
      .join(' | ');

    sheet.addRow([
      r.id,
      r.courseName,
      r.country,
      r.months.join(', '),
      monthDetail,
      r.httpStatus,
      r.status,
    ]);
  });

  // Auto-width columns
  sheet.columns.forEach(col => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 80);
  });

  await workbook.xlsx.writeFile(filePath);
  console.log(`📁 Results saved: ${filePath}`);
}