


/*import ExcelJS from 'exceljs';

export interface CourseGroup {
  courseSlug: string;
  country: string;
  months: Map<string, {
    dates: string[];
    prices: string[];
  }>;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;

  if (!v) return '';

  if (typeof v === 'object' && 'result' in (v as any)) {
    return String((v as any).result).trim();
  }

  return String(v).trim();
}

function normalizeMonth(raw: string): string {
  const map: Record<string, string> = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
  };

  const key = raw.trim().toLowerCase();
  return map[key] || raw.trim().slice(0, 3);
}

function parseCourseCountry(raw: string) {
  const [courseSlug, country] = raw.split('/').map(s => s.trim().toLowerCase());

  if (!courseSlug || !country) {
    throw new Error(`Invalid courseName format: ${raw}`);
  }

  return { courseSlug, country };
}

function parseDates(raw: string): string[] {
  return raw
    .split(',')
    .map(d => d.trim())
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
}

function cleanPrice(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

export async function readCombinedExcel(filePath: string): Promise<CourseGroup[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];

  const grouped = new Map<string, CourseGroup>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    try {
      const courseName = cellText(row.getCell(2));
      const monthRaw   = cellText(row.getCell(3));
      const dateRaw    = cellText(row.getCell(4));
      const price      = cellText(row.getCell(5));
      const discount   = cellText(row.getCell(6));

      if (!courseName || !monthRaw || !dateRaw) return;

      const { courseSlug, country } = parseCourseCountry(courseName);

      const month = normalizeMonth(monthRaw);
      const dates = parseDates(dateRaw);

      const prices = [price, discount]
        .map(cleanPrice)
        .filter(Boolean);

      const key = `${courseSlug}|${country}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          courseSlug,
          country,
          months: new Map(),
        });
      }

      const group = grouped.get(key)!;

      if (!group.months.has(month)) {
        group.months.set(month, {
          dates: [],
          prices: [],
        });
      }

      const monthData = group.months.get(month)!;

      monthData.dates.push(...dates);
      monthData.prices.push(...prices);

    } catch (err) {
      console.log(`⚠️ Skipping row ${rowNumber}`);
    }
  });

  return Array.from(grouped.values()).map(group => {
    for (const [month, data] of group.months) {
      group.months.set(month, {
        dates: [...new Set(data.dates)].sort(),
        prices: [...new Set(data.prices)],
      });
    }
    return group;
  });
}  */

  import ExcelJS from 'exceljs';

export interface MonthData {
  dates: string[];
  prices: string[];
}

export interface CourseGroup {
  courseSlug: string;
  country: string;
  months: Map<string, MonthData>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;

  if (!v) return '';

  if (typeof v === 'object' && 'result' in (v as any)) {
    return String((v as any).result).trim();
  }

  return String(v).trim();
}

function normalizeMonth(raw: string): string {
  const map: Record<string, string> = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
  };

  const key = raw.toLowerCase();
  return map[key] || raw.slice(0, 3);
}

function parseCourseCountry(value: string) {
  const parts = value.split('/');

  if (parts.length !== 2) {
    throw new Error(`Invalid courseName format: ${value}`);
  }

  return {
    courseSlug: parts[0].trim(),
    country: parts[1].trim(),
  };
}

function parseDates(value: string): string[] {
  return value
    .split(',')
    .map(d => d.trim())
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
}

// ─────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────
export async function readCombinedExcel(filePath: string): Promise<CourseGroup[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];

  const grouped = new Map<string, CourseGroup>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const courseRaw = cellText(row.getCell(2)); // B
    const monthRaw = cellText(row.getCell(3));  // C
    const dateRaw = cellText(row.getCell(4));   // D
    const price = cellText(row.getCell(5));     // E
    const discount = cellText(row.getCell(6));  // F

    if (!courseRaw || !monthRaw || !dateRaw) return;

    const { courseSlug, country } = parseCourseCountry(courseRaw);
    const month = normalizeMonth(monthRaw);

    const dates = parseDates(dateRaw);

    const prices = [price, discount]
      .map(p => p.replace(/[^\d]/g, ''))
      .filter(Boolean);

    const key = `${courseSlug}|${country}`;

    // create group
    if (!grouped.has(key)) {
      grouped.set(key, {
        courseSlug,
        country,
        months: new Map(),
      });
    }

    const group = grouped.get(key)!;

    // create month
    if (!group.months.has(month)) {
      group.months.set(month, {
        dates: [],
        prices: [],
      });
    }

    const monthData = group.months.get(month)!;

    monthData.dates.push(...dates);
    monthData.prices.push(...prices);
  });

  // remove duplicates
  return Array.from(grouped.values()).map(group => {
    for (const [month, data] of group.months) {
      group.months.set(month, {
        dates: [...new Set(data.dates)].sort(),
        prices: [...new Set(data.prices)],
      });
    }
    return group;
  });
}

