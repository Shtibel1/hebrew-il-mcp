import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VAT_HISTORY, vatRateOn } from "./lib/vat.js";
import { ISRAELI_BANKS } from "./lib/iban.js";
import { ISRAELI_LOCALITIES } from "./lib/postal.js";
import { israeliBusinessDay, israeliHolidaysInYear, nextIsraeliBusinessDay } from "./lib/holidays.js";
import { israelDate, ISRAEL_TIME_ZONE } from "./lib/time.js";

export const RESOURCE_SCHEME = "hebrew-il";
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

const jsonResource = (uri: URL, value: unknown) => ({
  contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(value, null, 2) }],
});

/** VAT history as explicit [from, to) periods, plus the rate in force on `today`. */
export function vatRatesResource(today: string) {
  return {
    currency: "ILS",
    today,
    currentRate: vatRateOn(today),
    periods: VAT_HISTORY.map((entry, i) => ({
      from: entry.from,
      until: VAT_HISTORY[i + 1]?.from ?? null,
      rate: entry.rate,
    })),
    note: "Standard rate only. `until` is exclusive; null means still in force.",
  };
}

export function banksResource() {
  return {
    note: "Bank of Israel codes of the main retail banks. Unlisted codes still validate in israeli_iban.",
    banks: Object.entries(ISRAELI_BANKS)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  };
}

export function localitiesResource() {
  return {
    note: "Curated approximation of major localities with representative postal prefixes — not a full Israel Post dump.",
    count: ISRAELI_LOCALITIES.length,
    localities: ISRAELI_LOCALITIES.map(({ he, en, prefixes, examples }) => ({ he, en, prefixes, examples })),
  };
}

/** Today's date in Israel with its Hebrew date, VAT rate and bank business-day status. */
export function todayResource(now: Date) {
  const date = israelDate(now);
  const status = israeliBusinessDay(date);
  return {
    date,
    timeZone: ISRAEL_TIME_ZONE,
    weekday: status.weekday,
    hebrew: status.hebrew,
    businessDay: status.businessDay,
    ...(status.holiday ? { holiday: status.holiday } : {}),
    nextBusinessDay: nextIsraeliBusinessDay(date).date,
    vatRate: vatRateOn(date),
  };
}

export function parseResourceYear(raw: string | string[]): number {
  const value = decodeURIComponent(String(Array.isArray(raw) ? raw[0] : raw));
  if (!/^\d{4}$/.test(value)) throw new Error(`Invalid year "${value}": expected YYYY, e.g. ${RESOURCE_SCHEME}://holidays/2026`);
  const year = Number(value);
  if (year < MIN_YEAR || year > MAX_YEAR) throw new Error(`Year must be between ${MIN_YEAR} and ${MAX_YEAR}`);
  return year;
}

/**
 * Read-only MCP resources: static reference tables an agent can load into context
 * once instead of calling a tool repeatedly. Everything is computed locally.
 */
export function registerResources(server: McpServer, now: () => Date = () => new Date()): void {
  server.registerResource(
    "today",
    `${RESOURCE_SCHEME}://today`,
    {
      title: "Today in Israel",
      description:
        "Today's date in Israel (Asia/Jerusalem), its Hebrew date, whether banks are open, the next bank business day and the VAT rate in force.",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, todayResource(now())),
  );

  server.registerResource(
    "vat-rates",
    `${RESOURCE_SCHEME}://vat-rates`,
    {
      title: "Israeli VAT (מע\"מ) rate history",
      description: "Every standard Israeli VAT rate period since 2012 and the rate in force today.",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, vatRatesResource(israelDate(now()))),
  );

  server.registerResource(
    "banks",
    `${RESOURCE_SCHEME}://banks`,
    {
      title: "Israeli bank codes",
      description: "Bank of Israel codes and names of the main retail banks (as used in IBANs and cheques).",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, banksResource()),
  );

  server.registerResource(
    "localities",
    `${RESOURCE_SCHEME}://localities`,
    {
      title: "Israeli localities and postal prefixes",
      description: "The curated table of major Israeli cities/towns (Hebrew + English names) with representative postal prefixes and example mikud codes.",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, localitiesResource()),
  );

  server.registerResource(
    "holidays",
    new ResourceTemplate(`${RESOURCE_SCHEME}://holidays/{year}`, {
      // Advertise this year and next; any year 1900–2100 can be read.
      list: async () => {
        const year = Number(israelDate(now()).slice(0, 4));
        return {
          resources: [year, year + 1].map((y) => ({
            uri: `${RESOURCE_SCHEME}://holidays/${y}`,
            name: `holidays-${y}`,
            title: `Israeli bank holidays ${y}`,
            mimeType: "application/json",
          })),
        };
      },
      complete: {
        year: (value) => {
          const year = Number(israelDate(now()).slice(0, 4));
          return [year - 1, year, year + 1, year + 2].map(String).filter((y) => y.startsWith(value));
        },
      },
    }),
    {
      title: "Israeli bank holidays in a year",
      description:
        "Israeli bank full-closure holidays (Jewish holidays and Independence Day, excluding Shabbat) in a Gregorian year, e.g. hebrew-il://holidays/2026.",
      mimeType: "application/json",
    },
    async (uri, { year }) => {
      const y = parseResourceYear(year);
      return jsonResource(uri, { year: y, holidays: israeliHolidaysInYear(y) });
    },
  );
}
