<div align="center">

<img src=".github/banner.svg" alt="hebrew-il-mcp" width="100%"/>

[![CI](https://github.com/Shtibel1/hebrew-il-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Shtibel1/hebrew-il-mcp/actions/workflows/ci.yml)
[![version](https://img.shields.io/github/package-json/v/Shtibel1/hebrew-il-mcp?color=a78bfa)](package.json)
[![license](https://img.shields.io/github/license/Shtibel1/hebrew-il-mcp?color=34d399)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
[![MCP](https://img.shields.io/badge/Model_Context_Protocol-server-8b5cf6)](https://modelcontextprotocol.io)

**Deterministic Israeli & Hebrew tools for AI agents — ת״ז, IBAN, מע״מ, מיקוד, bank days, Hebrew dates, gematria.**

</div>

<p align="center"><a href="#quick-start">Quick start</a> · <a href="#tools">Tools</a> · <a href="#resources">Resources</a> · <a href="#architecture">Architecture</a> · <a href="#roadmap">Roadmap</a></p>


A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents reliable, deterministic tools for Israeli and Hebrew data — the things LLMs routinely get wrong when they try to do them "in their head":

## Tools

| Tool | What it does |
| --- | --- |
| `validate_israeli_id` | Validates Teudat Zehut / ח.פ / amuta / Osek Murshe numbers with the official check digit and detects the entity type from the registry prefix (51 company, 58 amuta, 55 partnership, …). |
| `normalize_israeli_phone` | Parses `050-1234567`, `+972 (0)54 765 4321`, `00972-3-…`, `1-800-…` into E.164 plus a national display format and line type (mobile / landline / VoIP / toll-free). |
| `calculate_israeli_vat` | Adds or splits מע"מ using the rate **in force on the transaction date** (17% → 18% on 2025‑01‑01, with history back to 2012), rounded to agorot. |
| `israeli_iban` | Validates an Israeli IBAN (ISO 7064 MOD 97-10), splits it into bank / branch / account and names the bank, or builds the IBAN from the domestic details printed on a cheque. |
| `normalize_israeli_plate` | Validates and formats Israeli vehicle licence plates, both the 7-digit `NN-NNN-NN` and the 8-digit `NNN-NN-NNN` formats. |
| `normalize_israeli_postal_code` | Validates a 7-digit Israeli postal code (מיקוד) and formats it as `XX-XXX-XX`. |
| `lookup_israeli_city` | Resolves Hebrew/English city names (aliases, niqqud-stripped) against a curated table of ~70 major localities with representative postal prefixes. |
| `israeli_city_from_postal` | Maps a 7-digit mikud to the best-matching curated locality via longest-prefix match (approximation — not a full Israel Post dump). |
| `israeli_business_day` | Checks whether a Gregorian date is an Israeli bank/clearing business day (Shabbat + full-closure Jewish holidays + Independence Day with civil postponement rules). Friday is still a business day. |
| `next_israeli_business_day` | Returns the first Israeli bank business day strictly after a given date. |
| `israeli_holidays` | Lists Israeli bank full-closure holidays (excl. weekly Shabbat) in a Gregorian year. |
| `israeli_vat_rate` | Returns the standard VAT rate for a given date. |
| `hebrew_date` | Converts a Gregorian date to the Hebrew calendar, including the traditional form (`כ״א בחשוון תשפ״ז`). |
| `hebrew_numeral` | Writes numbers as Hebrew numerals with correct ט״ו / ט״ז handling and gershayim. |
| `hebrew_text_tools` | Strips niqqud and cantillation marks and computes standard gematria. |

Every tool returns both human-readable text and `structuredContent`, and invalid input produces an MCP `isError` result instead of crashing the session.

## Resources

Read-only reference tables an agent can load into context once instead of calling a tool in a loop. Everything is computed locally — no network.

| URI | What it contains |
| --- | --- |
| `hebrew-il://today` | Today's date **in Israel** (Asia/Jerusalem, not UTC), its Hebrew date, whether banks are open, the next bank business day and the VAT rate in force. |
| `hebrew-il://vat-rates` | Every standard VAT period since 2012 as `{ from, until, rate }` plus the current rate. |
| `hebrew-il://banks` | Bank of Israel codes and names of the main retail banks. |
| `hebrew-il://localities` | The curated city/town table with Hebrew + English names, postal prefixes and example mikud codes. |
| `hebrew-il://holidays/{year}` | Bank full-closure holidays in a Gregorian year (1900–2100). This year and next are listed; the `year` argument supports completion. |

"Today" is always the Israeli calendar day, so between midnight and 02:00/03:00 local time agents don't get yesterday's date — the same clock is now used when `calculate_israeli_vat` is called without a `date`.

## Why

Agents that handle Israeli invoices, CRM leads or bookkeeping keep tripping over the same things: an ID number that "looks fine" but fails the checksum, phone numbers stored in five formats, VAT computed at last year's rate, Hebrew dates hallucinated. These are pure, well-defined functions — so they belong in a tool, not in a prompt.

## Quick start

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

### Over HTTP (Streamable HTTP, stateless)

Run it as a hosted endpoint for remote agents, or behind a load balancer — every request gets a fresh server, so there are no sessions to pin:

```bash
node dist/cli.js --http --port 3000                      # POST http://127.0.0.1:3000/mcp, GET /healthz
node dist/cli.js --http --host 0.0.0.0 --allowed-origin https://app.example
```

`PORT`, `HOST` and `ALLOWED_ORIGINS` (comma-separated) are read when the flags are omitted. It binds to `127.0.0.1` by default, rejects browser requests from origins not on the allow-list (DNS-rebinding protection), and caps request bodies at 1 MB. Point any Streamable HTTP MCP client at `/mcp`.

### As a library

```ts
import { validateIsraeliId, calculateVat, toHebrewDate, buildIsraeliIban, israeliBusinessDay, normalizeIsraeliPostalCode, lookupIsraeliCity } from "hebrew-il-mcp";

validateIsraeliId("515555555", "corporate"); // { valid, normalized, kind: "company", ... }
calculateVat(1180, true, "2026-03-01");      // { rate: 0.18, net: 1000, vat: 180, gross: 1180 }
toHebrewDate("2026-11-01").formatted;        // "כ״א בחשוון תשפ״ז"
buildIsraeliIban(10, 800, 99999999);         // "IL620108000000099999999"
israeliBusinessDay("2026-04-22").businessDay; // false — Independence Day
normalizeIsraeliPostalCode("12-345-67");     // { valid: true, formatted: "12-345-67", ... }
lookupIsraeliCity("Hadera");                 // { found: true, he: "חדרה", ... }
```

## Architecture

```mermaid
flowchart LR
  C["MCP client<br/>(Claude Desktop, Cursor, agents)"] -- stdio --> CLI[cli.ts]
  R["Remote agent"] -- "Streamable HTTP /mcp" --> HTTP["http.ts<br/>stateless · origin guard"]
  CLI --> S
  HTTP --> S["server.ts<br/>zod schemas · isError results"]
  S --> RS["resources.ts<br/>hebrew-il:// resources"]
  S --> L
  RS --> L
  subgraph L["src/lib — pure domain core"]
    ID[id] --- PH[phone] --- VAT[vat] --- IB[iban] --- PL[plate] --- PO[postal] --- HE[hebrew] --- HO[holidays]
  end
  APP["Your TS app"] -- import --> L
```

### Layout

```
src/
  lib/        pure, dependency-free domain functions (id, phone, vat, iban, plate, postal, hebrew, holidays, time)
  server.ts   MCP wiring: zod input schemas + uniform JSON / isError results
  resources.ts read-only MCP resources (today, VAT history, banks, localities, holidays/{year})
  version.ts  single source of the version (handshake + /healthz)
  http.ts     stateless Streamable HTTP transport (/mcp, /healthz, origin guard, body cap)
  cli.ts      entry point: stdio by default, --http for the HTTP transport
test/
  lib.test.ts     unit tests for each domain module
  server.test.ts  end-to-end tests through a real MCP client (in-memory transport)
  http.test.ts    end-to-end tests through a real MCP client over HTTP
  resources.test.ts resources, completion and Israel-time "today" through a real MCP client
```

- **Pure core, thin adapter.** All logic lives in `src/lib` with no MCP dependency, so it is reusable as a plain TypeScript library and trivially testable.
- **Date-aware VAT.** Rates are a dated table, not a constant, so historical invoices are computed correctly.
- **Hebrew calendar via ICU.** Conversion uses `Intl.DateTimeFormat` with `ca-hebrew` (no hand-rolled calendar math); only the letter-numeral formatting is custom.
- **Curated postal / city table.** ~70 major localities with prefix ranges — honest approximation, not a national Israel Post dump.

## Development

```bash
npm test          # vitest
npm run typecheck
npm run build
```

## Roadmap

- [ ] Publish to npm so `npx hebrew-il-mcp` works without the GitHub shorthand
- [x] Israeli bank-holiday / business-day calendar tool
- [x] Postal code and city-name normalization
- [x] Hosted (Streamable HTTP) transport option
- [x] MCP resources (today in Israel, VAT history, banks, localities, holidays per year)

## Contributing

Issues and PRs are welcome. Every tool should stay a pure function in `src/lib` with unit tests, plus an end-to-end case in `test/server.test.ts`.

## License

[MIT](LICENSE) © Nadav Shtibel
