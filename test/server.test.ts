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
      "israeli_vat_rate",
      "normalize_israeli_phone",
      "validate_israeli_id",
    ]);
  });

  it("calls a tool end to end", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "calculate_israeli_vat", arguments: { amount: 1180, includesVat: true, date: "2026-03-01" } });
    expect(res.structuredContent).toMatchObject({ net: 1000, vat: 180, currency: "ILS" });
  });

  it("returns isError for out-of-range input", async () => {
    const client = await connect();
    const res = await client.callTool({ name: "israeli_vat_rate", arguments: { date: "1999-01-01" } });
    expect(res.isError).toBe(true);
  });
});
