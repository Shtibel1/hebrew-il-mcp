# Changelog

## 0.7.0 — 2026-11-20

- MCP resources: `hebrew-il://today`, `hebrew-il://vat-rates`, `hebrew-il://banks`, `hebrew-il://localities` and the `hebrew-il://holidays/{year}` template (this year and next listed, `year` completion, validated 1900–2100).
- `israelDate()` returns the calendar date in Israel (Asia/Jerusalem). `calculate_israeli_vat` without a `date` now uses it instead of the UTC date, which was a day behind between midnight and 02:00/03:00 Israel time.
- `createServer({ now })` accepts an injectable clock.
- The version now comes from a single `src/version.ts` (MCP handshake and `GET /healthz`), with a test that keeps it in sync with `package.json`.

## 0.6.0 — 2026-11-12

- Stateless Streamable HTTP transport (`--http`, `--port`, `--host`, `--allowed-origin`) with `GET /healthz`, origin guard and 1 MB body cap.

## 0.5.0 — 2026-11-07

- `normalize_israeli_postal_code`, `lookup_israeli_city` and `israeli_city_from_postal` tools.

## 0.4.0 — 2026-11-06

- `israeli_business_day`, `next_israeli_business_day` and `israeli_holidays` (bank-holiday calendar).

## 0.3.0 — 2026-11-05

- `normalize_israeli_plate` tool for 7- and 8-digit licence plates.

## 0.2.0 — 2026-11-02

- `israeli_iban` tool: validate and build Israeli IBANs.

## 0.1.0 — 2026-11-01

- Initial release: Israeli ID / company number, phone, date-aware VAT, Hebrew date, numerals and niqqud tools.
