import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { VERSION } from "../src/version.js";
import { israelDate } from "../src/lib/time.js";
import { parseResourceYear, vatRatesResource } from "../src/resources.js";

// 2026-04-21T22:30Z is already 2026-04-22 01:30 in Israel (IDT) — Independence Day.
const AFTER_MIDNIGHT_IL = new Date("2026-04-21T22:30:00Z");

async function connect(now?: () => Date) {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await createServer({ now }).connect(serverT);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientT);
  return client;
}

async function readJson(client: Client, uri: string) {
  const res = await client.readResource({ uri });
  expect(res.contents[0]).toMatchObject({ uri, mimeType: "application/json" });
  return JSON.parse(String((res.contents[0] as { text: string }).text));
}

describe("israelDate", () => {
  it("uses the Israeli calendar day, not UTC", () => {
    expect(AFTER_MIDNIGHT_IL.toISOString().slice(0, 10)).toBe("2026-04-21");
    expect(israelDate(AFTER_MIDNIGHT_IL)).toBe("2026-04-22");
    // Winter (IST, UTC+2): 21:59Z is still the same day, 22:00Z is the next.
    expect(israelDate(new Date("2026-01-14T21:59:00Z"))).toBe("2026-01-14");
    expect(israelDate(new Date("2026-01-14T22:00:00Z"))).toBe("2026-01-15");
  });

  it("rejects invalid dates", () => {
    expect(() => israelDate(new Date("nope"))).toThrow(RangeError);
  });
});

describe("resource helpers", () => {
  it("turns VAT history into contiguous periods", () => {
    const vat = vatRatesResource("2026-11-20");
    expect(vat.currentRate).toBe(0.18);
    expect(vat.periods.at(-1)).toEqual({ from: "2025-01-01", until: null, rate: 0.18 });
    for (let i = 1; i < vat.periods.length; i++) expect(vat.periods[i - 1].until).toBe(vat.periods[i].from);
  });

  it("validates resource years", () => {
    expect(parseResourceYear("2026")).toBe(2026);
    expect(parseResourceYear(["2027"])).toBe(2027);
    expect(() => parseResourceYear("26")).toThrow(/YYYY/);
    expect(() => parseResourceYear("2200")).toThrow(/between/);
  });

  it("keeps src/version.ts in sync with package.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(VERSION).toBe(pkg.version);
  });
});

describe("MCP resources", () => {
  it("lists static resources and the holidays template", async () => {
    const client = await connect(() => AFTER_MIDNIGHT_IL);
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toEqual(
      expect.arrayContaining([
        "hebrew-il://today",
        "hebrew-il://vat-rates",
        "hebrew-il://banks",
        "hebrew-il://localities",
        "hebrew-il://holidays/2026",
        "hebrew-il://holidays/2027",
      ]),
    );
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate)).toContain("hebrew-il://holidays/{year}");
  });

  it("reads today in Israel with business-day status", async () => {
    const client = await connect(() => AFTER_MIDNIGHT_IL);
    const today = await readJson(client, "hebrew-il://today");
    expect(today).toMatchObject({
      date: "2026-04-22",
      timeZone: "Asia/Jerusalem",
      businessDay: false,
      holiday: { kind: "independence-day" },
      nextBusinessDay: "2026-04-23",
      vatRate: 0.18,
    });
    expect(today.hebrew.formatted).toMatch(/אייר/);
  });

  it("reads VAT, banks and localities tables", async () => {
    const client = await connect(() => AFTER_MIDNIGHT_IL);
    const vat = await readJson(client, "hebrew-il://vat-rates");
    expect(vat).toMatchObject({ currency: "ILS", today: "2026-04-22", currentRate: 0.18 });
    const banks = await readJson(client, "hebrew-il://banks");
    expect(banks.banks).toContainEqual({ code: "12", name: "Bank Hapoalim" });
    const localities = await readJson(client, "hebrew-il://localities");
    expect(localities.count).toBe(localities.localities.length);
    expect(localities.localities).toContainEqual(expect.objectContaining({ he: "חדרה", en: "Hadera", prefixes: ["38"] }));
  });

  it("reads holidays for any year and rejects bad years", async () => {
    const client = await connect(() => AFTER_MIDNIGHT_IL);
    const h = await readJson(client, "hebrew-il://holidays/2026");
    expect(h.year).toBe(2026);
    expect(h.holidays).toContainEqual(expect.objectContaining({ date: "2026-04-22", kind: "independence-day" }));
    await expect(client.readResource({ uri: "hebrew-il://holidays/abcd" })).rejects.toThrow(/Invalid year/);
    await expect(client.readResource({ uri: "hebrew-il://holidays/2500" })).rejects.toThrow(/between/);
  });

  it("completes the holidays year argument", async () => {
    const client = await connect(() => AFTER_MIDNIGHT_IL);
    const res = await client.complete({
      ref: { type: "ref/resource", uri: "hebrew-il://holidays/{year}" },
      argument: { name: "year", value: "202" },
    });
    expect(res.completion.values).toEqual(["2025", "2026", "2027", "2028"]);
  });

  it("defaults the VAT tool date to today in Israel", async () => {
    const client = await connect(() => AFTER_MIDNIGHT_IL);
    const res = await client.callTool({ name: "calculate_israeli_vat", arguments: { amount: 100, includesVat: false } });
    expect(res.structuredContent).toMatchObject({ rateDate: "2026-04-22", rate: 0.18, gross: 118 });
  });
});
