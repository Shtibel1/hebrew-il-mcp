# hebrew-il-mcp

[![CI](https://github.com/Shtibel1/hebrew-il-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Shtibel1/hebrew-il-mcp/actions/workflows/ci.yml)
![MCP](https://img.shields.io/badge/MCP-server-blue) ![License: MIT](https://img.shields.io/badge/license-MIT-green)

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents reliable, deterministic tools for Israeli and Hebrew data — the things LLMs routinely get wrong when they try to do them "in their head":

| Tool | What it does |
| --- | --- |
| `validate_israeli_id` | Validates Teudat Zehut / ח.פ / amuta / Osek Murshe numbers with the official check digit and detects the entity type from the registry prefix (51 company, 58 amuta, 55 partnership, …). |
| `normalize_israeli_phone` | Parses `050-1234567`, `+972 (0)54 765 4321`, `00972-3-…`, `1-800-…` into E.164 plus a national display format and line type (mobile / landline / VoIP / toll-free). |
| `calculate_israeli_vat` | Adds or splits מע"מ using the rate **in force on the transaction date** (17% → 18% on 2025‑01‑01, with history back to 2012), rounded to agorot. |
| `israeli_vat_rate` | Returns the standard VAT rate for a given date. |
| `hebrew_date` | Converts a Gregorian date to the Hebrew calendar, including the traditional form (`כ״א בחשוון תשפ״ז`). |
| `hebrew_numeral` | Writes numbers as Hebrew numerals with correct ט״ו / ט״ז handling and gershayim. |
| `hebrew_text_tools` | Strips niqqud and cantillation marks and computes standard gematria. |

Every tool returns both human-readable text and `structuredContent`, and invalid input produces an MCP `isError` result instead of crashing the session.

## Why

Agents that handle Israeli invoices, CRM leads or bookkeeping keep tripping over the same things: an ID number that "looks fine" but fails the checksum, phone numbers stored in five formats, VAT computed at last year's rate, Hebrew dates hallucinated. These are pure, well-defined functions — so they belong in a tool, not in a prompt.

## Usage

### Claude Desktop / Cursor / any MCP client

```json
{
  "mcpServers": {
    "hebrew-il": {
      "command": "npx",
      "args": ["-y", "github:Shtibel1/hebrew-il-mcp"]
    }
  }
}
```

Or from a local clone:

```bash
npm install && npm run build
node dist/cli.js   # speaks MCP over stdio
```

### As a library

```ts
import { validateIsraeliId, calculateVat, toHebrewDate } from "hebrew-il-mcp";

validateIsraeliId("515555555", "corporate"); // { valid, normalized, kind: "company", ... }
calculateVat(1180, true, "2026-03-01");      // { rate: 0.18, net: 1000, vat: 180, gross: 1180 }
toHebrewDate("2026-11-01").formatted;        // "כ״א בחשוון תשפ״ז"
```

## Design

```
src/
  lib/        pure, dependency-free domain functions (id, phone, vat, hebrew)
  server.ts   MCP wiring: zod input schemas + uniform JSON / isError results
  cli.ts      stdio transport entry point
test/
  lib.test.ts     unit tests for each domain module
  server.test.ts  end-to-end tests through a real MCP client (in-memory transport)
```

- **Pure core, thin adapter.** All logic lives in `src/lib` with no MCP dependency, so it is reusable as a plain TypeScript library and trivially testable.
- **Date-aware VAT.** Rates are a dated table, not a constant, so historical invoices are computed correctly.
- **Hebrew calendar via ICU.** Conversion uses `Intl.DateTimeFormat` with `ca-hebrew` (no hand-rolled calendar math); only the letter-numeral formatting is custom.

## Development

```bash
npm test          # vitest
npm run typecheck
npm run build
```

## License

MIT
