import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SERVER_VERSION } from "../src/server.js";
import { parseAllowedOrigins, startHttpServer, type RunningHttpServer } from "../src/http.js";

let running: RunningHttpServer | undefined;

afterEach(async () => {
  await running?.close();
  running = undefined;
});

async function connect(url: string) {
  const client = new Client({ name: "http-test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
}

describe("Streamable HTTP transport", () => {
  it("serves tools to a real MCP client over HTTP", async () => {
    running = await startHttpServer({ port: 0 });
    expect(running.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);

    const client = await connect(running.url);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("validate_israeli_id");

    const vat = await client.callTool({
      name: "calculate_israeli_vat",
      arguments: { amount: 1180, includesVat: true, date: "2026-03-01" },
    });
    expect(vat.isError).toBeFalsy();
    expect(vat.structuredContent).toMatchObject({ net: 1000, vat: 180 });

    const iban = await client.callTool({ name: "israeli_iban", arguments: { iban: "IL620108000000099999999" } });
    expect(iban.isError).toBeFalsy();
    await client.close();
  });

  it("reports tool errors as isError results, not HTTP failures", async () => {
    running = await startHttpServer({ port: 0 });
    const client = await connect(running.url);
    const bad = await client.callTool({ name: "calculate_israeli_vat", arguments: { amount: 100, includesVat: false, date: "not-a-date" } });
    expect(bad.isError).toBe(true);
    await client.close();
  });

  it("is stateless: separate clients work independently", async () => {
    running = await startHttpServer({ port: 0 });
    const [a, b] = await Promise.all([connect(running.url), connect(running.url)]);
    const [ta, tb] = await Promise.all([a.listTools(), b.listTools()]);
    expect(ta.tools.length).toBe(tb.tools.length);
    await Promise.all([a.close(), b.close()]);
  });

  it("exposes a health check", async () => {
    running = await startHttpServer({ port: 0 });
    const res = await fetch(running.url.replace(/\/mcp$/, "/healthz"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", name: "hebrew-il-mcp", version: SERVER_VERSION });
  });

  it("returns 404 for unknown paths and 405 for GET /mcp", async () => {
    running = await startHttpServer({ port: 0 });
    expect((await fetch(running.url.replace(/\/mcp$/, "/nope"))).status).toBe(404);
    const get = await fetch(running.url);
    expect(get.status).toBe(405);
    expect(get.headers.get("allow")).toBe("POST");
  });

  it("rejects invalid JSON with 400", async () => {
    running = await startHttpServer({ port: 0 });
    const res = await fetch(running.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("blocks disallowed browser origins and allows listed ones", async () => {
    running = await startHttpServer({ port: 0, allowedOrigins: ["https://ok.example"] });
    const init = (origin: string) => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Origin: origin,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } },
      }),
    });
    expect((await fetch(running.url, init("https://evil.example"))).status).toBe(403);
    expect((await fetch(running.url, init("https://ok.example"))).status).toBe(200);
  });
});

describe("parseAllowedOrigins", () => {
  it("returns an empty list for unset or blank input", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins("  ,  ")).toEqual([]);
  });

  it("splits on commas and whitespace, drops trailing slashes and duplicates", () => {
    expect(parseAllowedOrigins("https://a.example, https://b.example/\nhttps://a.example http://localhost:5173")).toEqual([
      "https://a.example",
      "https://b.example",
      "http://localhost:5173",
    ]);
  });

  it("rejects values that are not bare http(s) origins", () => {
    expect(() => parseAllowedOrigins("not a url")).toThrow(/Invalid origin/);
    expect(() => parseAllowedOrigins("ftp://files.example")).toThrow(/Invalid origin/);
    expect(() => parseAllowedOrigins("https://a.example/path")).toThrow(/expected scheme/);
  });

  it("feeds straight into the origin guard", async () => {
    running = await startHttpServer({ port: 0, allowedOrigins: parseAllowedOrigins("https://ok.example/") });
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
    const denied = await fetch(running.url, { method: "POST", body, headers: { ...headers, Origin: "https://evil.example" } });
    expect(denied.status).toBe(403);
    const allowed = await fetch(running.url, { method: "POST", body, headers: { ...headers, Origin: "https://ok.example" } });
    expect(allowed.status).toBe(200);
  });
});
