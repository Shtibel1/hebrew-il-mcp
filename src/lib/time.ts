/** IANA zone used for "today" in Israel (handles IST/IDT automatically). */
export const ISRAEL_TIME_ZONE = "Asia/Jerusalem";

/**
 * The calendar date (YYYY-MM-DD) in Israel at the given instant.
 *
 * `Date#toISOString()` is UTC, so between midnight and 02:00/03:00 Israel time it
 * still reports yesterday — wrong for VAT-rate dates, business days and Hebrew dates.
 */
export function israelDate(at: Date = new Date()): string {
  if (Number.isNaN(at.getTime())) throw new RangeError("Invalid date");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
