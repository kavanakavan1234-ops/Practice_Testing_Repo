import ExcelJS from 'exceljs';

// One row from Excel = one schedule event
export interface ScheduleEventRow {
  id:         number;
  courseName: string;   // "pmi-acp-certification-training/ al"
  month:      string;   // "May" | "June"
  dates:      string[]; // ["2026-05-01","2026-05-02","2026-05-03"]
  courseSlug: string;   // "pmi-acp-certification-training"
  country:    string;   // "al"
}

// Grouped: one entry per course+country+month
export interface MonthGroup {
  courseSlug: string;
  country:    string;
  month:      string;
  events:     { id: number; dates: string[] }[];  // all events for this month
}

// Grouped: one entry per course+country (contains all months)
export interface CourseGroup {
  courseSlug: string;
  country:    string;
  months:     Map<string, { id: number; dates: string[] }[]>; // month → events[]
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

// "pmi-acp-certification-training/ al" → { slug, country }
function parseCourseAndCountry(raw: string): { slug: string; country: string } {
  const trimmed  = raw.trim();
  const slashIdx = trimmed.lastIndexOf('/');
  if (slashIdx === -1) return { slug: trimmed, country: 'us' };
  return {
    slug:    trimmed.slice(0, slashIdx).trim(),
    country: trimmed.slice(slashIdx + 1).trim().toLowerCase(),
  };
}

// "2026-05-01,2026-05-02,2026-05-03" → ["2026-05-01","2026-05-02","2026-05-03"]
function parseDates(raw: string): string[] {
  return raw.split(',').map(d => d.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
}

// Normalise month name to 3-letter short: "June" → "Jun", "May" → "May"
function normaliseMonth(raw: string): string {
  const FULL_TO_SHORT: Record<string, string> = {
    january:'Jan', february:'Feb', march:'Mar',   april:'Apr',
    may:'May',     june:'Jun',     july:'Jul',     august:'Aug',
    september:'Sep', october:'Oct', november:'Nov', december:'Dec',
  };
  const t = raw.trim();
  if (t.length <= 3) return t.slice(0,1).toUpperCase() + t.slice(1).toLowerCase();
  return FULL_TO_SHORT[t.toLowerCase()] ?? t.slice(0,3);
}

// ─────────────────────────────────────────────
// READ EXCEL
// Returns rows grouped by course+country
// so the spec can process one URL at a time.
// ─────────────────────────────────────────────
export async function readScheduleExcel(filePath: string): Promise<CourseGroup[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  // Map key = "slug|country"
  const grouped = new Map<string, CourseGroup>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const id         = cellNumber(row.getCell(1));
    const courseName = cellText(row.getCell(2));
    const monthRaw   = cellText(row.getCell(3));
    const dateRaw    = cellText(row.getCell(4));

    if (!courseName || !monthRaw || !dateRaw) return;

    const { slug, country } = parseCourseAndCountry(courseName);
    const month              = normaliseMonth(monthRaw);
    const dates              = parseDates(dateRaw);

    if (dates.length === 0) return;

    const key = `${slug}|${country}`;
    if (!grouped.has(key)) {
      grouped.set(key, { courseSlug: slug, country, months: new Map() });
    }
    const group = grouped.get(key)!;

    if (!group.months.has(month)) group.months.set(month, []);
    group.months.get(month)!.push({ id, dates });
  });

  const result = Array.from(grouped.values());
  console.log(`📊 Loaded ${result.length} course-country groups from ${filePath}`);
  result.forEach(g => {
    const monthSummary = Array.from(g.months.entries())
      .map(([m, evs]) => `${m}(${evs.length} events)`).join(', ');
    console.log(`   • ${g.courseSlug}/${g.country}  →  ${monthSummary}`);
  });
  return result;
}

// ─────────────────────────────────────────────
// WRITE RESULTS
// ─────────────────────────────────────────────
export interface MonthResult {
  month:       string;
  inDropdown:  boolean;
  excelDates:  string[];   // all dates from Excel for this month
  pageDates:   string[];   // all dates found on page for this month
  matched:     string[];   // dates in both
  missing:     string[];   // in Excel but not on page
  extra:       string[];   // on page but not in Excel
  status:      'PASS' | 'FAIL';
}

export async function writeScheduleResults(
  filePath: string,
  results: {
    courseSlug:   string;
    country:      string;
    monthResults: MonthResult[];
    httpStatus:   number;
    status:       'PASS' | 'FAIL' | 'NAV_FAIL';
  }[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet    = workbook.addWorksheet('Results');

  sheet.addRow([
    'Course', 'Country', 'Month',
    'Excel Events', 'Page Events',
    'Matched', 'Missing', 'Extra',
    'HTTP', 'Month Status', 'Overall Status',
  ]);
  sheet.getRow(1).font = { bold: true };

  for (const r of results) {
    for (const mr of r.monthResults) {
      sheet.addRow([
        r.courseSlug,
        r.country,
        mr.month,
        mr.excelDates.length,
        mr.pageDates.length,
        mr.matched.length,
        mr.missing.join(', ') || '—',
        mr.extra.join(', ')   || '—',
        r.httpStatus,
        mr.status,
        r.status,
      ]);
    }
    // If NAV_FAIL with no monthResults, still write one row
    if (r.monthResults.length === 0) {
      sheet.addRow([
        r.courseSlug, r.country, '—', 0, 0, 0, '—', '—',
        r.httpStatus, '—', r.status,
      ]);
    }
  }

  sheet.columns.forEach(col => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 60);
  });

  await workbook.xlsx.writeFile(filePath);
  console.log(`📁 Results saved: ${filePath}`);
}