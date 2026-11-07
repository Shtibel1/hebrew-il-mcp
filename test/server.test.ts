import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

async function connect() {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverT);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientT);
  return client;
}

describe("MCP server", () => {
  it("lists all tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "calculate_israeli_vat",
      "hebrew_date",
      "hebrew_numeral",
      "hebrew_text_tools",
      "israeli_business_day",
      "israeli_city_from_postal",
      "israeli_holidays",
      "israeli_iban",
      "israeli_vat_rate",
      "lookup_israeli_city",
      "next_israeli_business_day",
      "normalize_israeli_phone",
      "normalize_israeli_plate",
      "normalize_israeli_postal_code",
      "validate_israeli_id",
    ]);
  });

  it("calls a tool end to end", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "calculate_israeli_vat", arguments: { amount: 1180, includesVat: true, date: "2026-03-01" } });
    expect(res.structuredContent).toMatchObject({ net: 1000, vat: 180, currency: "ILS" });
  });

  it("builds an IBAN from bank details end to end", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "israeli_iban", arguments: { bank: "10", branch: "800", account: "99999999" } });
    expect(res.structuredContent).toMatchObject({ valid: true, normalized: "IL620108000000099999999", bankName: "Bank Leumi" });
    const bad = await client.callTool({ name: "israeli_iban", arguments: {} });
    expect(bad.isError).toBe(true);
  });

  it("returns isError for out-of-range input", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "israeli_vat_rate", arguments: { date: "1999-01-01" } });
    expect(res.isError).toBe(true);
  });

  it("checks an Israeli business day end to end", async () => {
    const client = await connect();
    const closed = await client.callTool({ name: "israeli_business_day", arguments: { date: "2026-04-22" } });
    expect(closed.structuredContent).toMatchObject({
      businessDay: false,
      holiday: { kind: "independence-day" },
    });
    const next = await client.callTool({ name: "next_israeli_business_day", arguments: { date: "2026-04-22" } });
    expect(next.structuredContent).toMatchObject({ date: "2026-04-23", businessDay: true });
    const year = await client.callTool({ name: "israeli_holidays", arguments: { year: 2026 } });
    expect((year.structuredContent as { holidays: unknown[] }).holidays.length).toBeGreaterThanOrEqual(8);
  });

  it("normalizes postal codes and looks up cities end to end", async () => {
    const client = await connect();
    const norm = await client.callTool({ name: "normalize_israeli_postal_code", arguments: { postalCode: "12-345-67" } });
    expect(norm.structuredContent).toMatchObject({ valid: true, digits: "1234567", formatted: "12-345-67" });
    const city = await client.callTool({ name: "lookup_israeli_city", arguments: { query: "Hadera" } });
    expect(city.structuredContent).toMatchObject({ found: true, he: "חדרה" });
    const from = await client.callTool({ name: "israeli_city_from_postal", arguments: { postalCode: "3850000" } });
    expect(from.structuredContent).toMatchObject({ found: true, en: "Hadera" });
  });
});
