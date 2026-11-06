import { toHebrewDate, type HebrewDate } from "./hebrew.js";

export type HolidayKind =
  | "shabbat"
  | "rosh-hashanah"
  | "yom-kippur"
  | "sukkot"
  | "shemini-atzeret"
  | "pesach"
  | "shavuot"
  | "independence-day";

export interface HolidayInfo {
  kind: HolidayKind;
  nameHe: string;
  nameEn: string;
}

export interface BusinessDayResult {
  date: string;
  businessDay: boolean;
  weekday: string;
  holiday?: HolidayInfo;
  hebrew: HebrewDate;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const HOLIDAY_NAMES: Record<HolidayKind, { nameHe: string; nameEn: string }> = {
  shabbat: { nameHe: "שבת", nameEn: "Shabbat" },
  "rosh-hashanah": { nameHe: "ראש השנה", nameEn: "Rosh Hashanah" },
  "yom-kippur": { nameHe: "יום כיפור", nameEn: "Yom Kippur" },
  sukkot: { nameHe: "סוכות", nameEn: "Sukkot" },
  "shemini-atzeret": { nameHe: "שמיני עצרת", nameEn: "Shemini Atzeret" },
  pesach: { nameHe: "פסח", nameEn: "Pesach" },
  shavuot: { nameHe: "שבועות", nameEn: "Shavuot" },
  "independence-day": { nameHe: "יום העצמאות", nameEn: "Independence Day" },
};

/** Fixed full-closure Jewish holidays keyed by normalized month + day. */
const FIXED_HOLIDAYS: Array<{ months: string[]; day: number; kind: HolidayKind }> = [
  { months: ["tishri", "tishrei"], day: 1, kind: "rosh-hashanah" },
  { months: ["tishri", "tishrei"], day: 2, kind: "rosh-hashanah" },
  { months: ["tishri", "tishrei"], day: 10, kind: "yom-kippur" },
  { months: ["tishri", "tishrei"], day: 15, kind: "sukkot" },
  { months: ["tishri", "tishrei"], day: 22, kind: "shemini-atzeret" },
  { months: ["nisan"], day: 15, kind: "pesach" },
  { months: ["nisan"], day: 21, kind: "pesach" },
  { months: ["sivan"], day: 6, kind: "shavuot" },
];

function assertIsoDate(isoDate: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new RangeError("Date must be YYYY-MM-DD");
}

function parseUtcNoon(isoDate: string): Date {
  assertIsoDate(isoDate);
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date");
  return date;
}

function weekdayName(isoDate: string): string {
  return WEEKDAYS[parseUtcNoon(isoDate).getUTCDay()];
}

function normalizeMonth(month: string): string {
  return month.toLowerCase().replace(/[^a-z]/g, "");
}

function monthMatches(actual: string, aliases: string[]): boolean {
  const n = normalizeMonth(actual);
  return aliases.some((a) => {
    const alias = normalizeMonth(a);
    return n === alias || n.startsWith(alias.slice(0, 4)) || alias.startsWith(n.slice(0, 4));
  });
}

function holidayInfo(kind: HolidayKind): HolidayInfo {
  return { kind, ...HOLIDAY_NAMES[kind] };
}

function addDays(isoDate: string, days: number): string {
  const d = parseUtcNoon(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Locate the Gregorian YYYY-MM-DD for a Hebrew month/day in a Hebrew year.
 * Iyar falls in spring ≈ Gregorian (hebrewYear - 3760).
 */
function gregorianOfHebrewDay(hebrewYear: number, monthAliases: string[], day: number): string {
  const approxYear = hebrewYear - 3760;
  for (let month = 3; month <= 5; month++) {
    for (let dom = 1; dom <= 31; dom++) {
      const iso = `${approxYear}-${String(month).padStart(2, "0")}-${String(dom).padStart(2, "0")}`;
      const date = new Date(`${iso}T12:00:00Z`);
      if (Number.isNaN(date.getTime())) continue;
      if (date.toISOString().slice(0, 10) !== iso) continue; // skip overflow dates like Apr 31
      const h = toHebrewDate(iso);
      if (h.year === hebrewYear && h.day === day && monthMatches(h.month, monthAliases)) return iso;
    }
  }
  throw new RangeError(`Could not locate Hebrew ${monthAliases[0]} ${day} ${hebrewYear}`);
}

/**
 * Civil Israel Independence Day (Yom HaAtzmaut) is based on Iyar 5, but
 * postponed/advanced so neither it nor Memorial Day (the day before) fall on
 * Friday/Saturday:
 * - Iyar 5 Friday   → observe Thursday (Iyar 4)
 * - Iyar 5 Saturday → observe Thursday (Iyar 3)
 * - Iyar 5 Monday   → observe Tuesday  (Iyar 6)  // Memorial Day would be Sunday
 * - otherwise       → observe Iyar 5
 * Verified against civil calendar: 2024→May 14 (Iyar 6), 2025→May 1 (Iyar 3),
 * 2026→Apr 22 (Iyar 5), 2022→May 5 (Iyar 4), 2021→Apr 15 (Iyar 3).
 */
function observedIndependenceIyarDay(hebrewYear: number): number {
  const iyar5 = gregorianOfHebrewDay(hebrewYear, ["iyar", "iyyar"], 5);
  const weekday = parseUtcNoon(iyar5).getUTCDay(); // 0=Sun … 5=Fri, 6=Sat
  if (weekday === 5) return 4; // Friday → Thursday Iyar 4
  if (weekday === 6) return 3; // Saturday → Thursday Iyar 3
  if (weekday === 1) return 6; // Monday → Tuesday Iyar 6
  return 5;
}

function fixedHolidayKind(hebrew: HebrewDate): HolidayKind | undefined {
  for (const h of FIXED_HOLIDAYS) {
    if (h.day === hebrew.day && monthMatches(hebrew.month, h.months)) return h.kind;
  }
  return undefined;
}

function independenceHoliday(hebrew: HebrewDate): HolidayKind | undefined {
  if (!monthMatches(hebrew.month, ["iyar", "iyyar"])) return undefined;
  if (hebrew.day === observedIndependenceIyarDay(hebrew.year)) return "independence-day";
  return undefined;
}

/** Classify a Gregorian date as an Israeli bank/clearing business day or holiday. */
export function israeliBusinessDay(isoDate: string): BusinessDayResult {
  const hebrew = toHebrewDate(isoDate);
  const weekday = weekdayName(isoDate);
  const utcDay = parseUtcNoon(isoDate).getUTCDay();

  // Prefer the named holiday when it coincides with Shabbat (still non-business).
  const kind = fixedHolidayKind(hebrew) ?? independenceHoliday(hebrew);
  if (kind) {
    return { date: isoDate, businessDay: false, weekday, holiday: holidayInfo(kind), hebrew };
  }
  if (utcDay === 6) {
    return { date: isoDate, businessDay: false, weekday, holiday: holidayInfo("shabbat"), hebrew };
  }

  return { date: isoDate, businessDay: true, weekday, hebrew };
}

/** First Israeli bank business day strictly after `isoDate`. */
export function nextIsraeliBusinessDay(isoDate: string): BusinessDayResult {
  assertIsoDate(isoDate);
  let cursor = addDays(isoDate, 1);
  for (let i = 0; i < 14; i++) {
    const result = israeliBusinessDay(cursor);
    if (result.businessDay) return result;
    cursor = addDays(cursor, 1);
  }
  throw new RangeError(`No business day found within two weeks after ${isoDate}`);
}

/** Annual Israeli bank holidays (excl. weekly Shabbat) whose Gregorian date falls in `gregorianYear`. */
export function israeliHolidaysInYear(
  gregorianYear: number,
): Array<{ date: string; kind: HolidayKind; nameHe: string; nameEn: string }> {
  if (!Number.isInteger(gregorianYear) || gregorianYear < 1900 || gregorianYear > 2100) {
    throw new RangeError("Year must be an integer between 1900 and 2100");
  }
  const out: Array<{ date: string; kind: HolidayKind; nameHe: string; nameEn: string }> = [];
  let cursor = `${gregorianYear}-01-01`;
  const end = `${gregorianYear}-12-31`;
  while (cursor <= end) {
    const result = israeliBusinessDay(cursor);
    if (result.holiday && result.holiday.kind !== "shabbat") {
      out.push({ date: cursor, kind: result.holiday.kind, nameHe: result.holiday.nameHe, nameEn: result.holiday.nameEn });
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}
