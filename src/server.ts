import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateIsraeliId } from "./lib/id.js";
import { normalizeIsraeliPhone } from "./lib/phone.js";
import { calculateVat, vatRateOn } from "./lib/vat.js";
import { gematria, stripNiqqud, toHebrewDate, toHebrewNumeral } from "./lib/hebrew.js";

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  structuredContent: value as Record<string, unknown>,
});

const fail = (err: unknown) => ({
  isError: true,
  content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
});

function safe<A>(fn: (args: A) => unknown) {
  return async (args: A) => {
    try {
      return json(fn(args));
    } catch (err) {
      return fail(err);
    }
  };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "hebrew-il-mcp", version: "0.1.0" });

  server.registerTool(
    "validate_israeli_id",
    {
      title: "Validate Israeli ID / company number",
      description:
        "Validate an Israeli Teudat Zehut, company (ח.פ), amuta or Osek Murshe number using the official check digit. Returns the zero-padded number and the detected entity kind.",
      inputSchema: {
        number: z.string().describe("The number as written, e.g. '12345678-2' or '515555555'"),
        expect: z.enum(["person", "corporate", "any"]).default("any"),
      },
    },
    safe(({ number, expect }: { number: string; expect: "person" | "corporate" | "any" }) =>
      validateIsraeliId(number, expect),
    ),
  );

  server.registerTool(
    "normalize_israeli_phone",
    {
      title: "Normalize Israeli phone number",
      description:
        "Parse an Israeli phone number in any common format and return E.164 (+972...), a national display format and the line type (mobile, landline, VoIP, toll-free).",
      inputSchema: { phone: z.string() },
    },
    safe(({ phone }: { phone: string }) => normalizeIsraeliPhone(phone)),
  );

  server.registerTool(
    "calculate_israeli_vat",
    {
      title: "Calculate Israeli VAT (מע\"מ)",
      description:
        "Add VAT to a net amount or split a VAT-inclusive amount, using the Israeli VAT rate that was in force on the given date (defaults to today).",
      inputSchema: {
        amount: z.number().nonnegative(),
        includesVat: z.boolean().describe("true if the amount already includes VAT"),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Transaction date, YYYY-MM-DD"),
      },
    },
    safe(({ amount, includesVat, date }: { amount: number; includesVat: boolean; date?: string }) => ({
      ...calculateVat(amount, includesVat, date),
      currency: "ILS",
      rateDate: date ?? new Date().toISOString().slice(0, 10),
    })),
  );

  server.registerTool(
    "israeli_vat_rate",
    {
      title: "Israeli VAT rate on a date",
      description: "Return the standard Israeli VAT rate in force on a date (YYYY-MM-DD).",
      inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
    },
    safe(({ date }: { date: string }) => ({ date, rate: vatRateOn(date) })),
  );

  server.registerTool(
    "hebrew_date",
    {
      title: "Gregorian to Hebrew date",
      description: "Convert a Gregorian date (YYYY-MM-DD) to the Hebrew calendar, including the traditional letter form (e.g. כ״א בחשוון תשפ״ז).",
      inputSchema: { date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
    },
    safe(({ date }: { date: string }) => toHebrewDate(date)),
  );

  server.registerTool(
    "hebrew_text_tools",
    {
      title: "Hebrew text utilities",
      description: "Strip niqqud and cantillation from Hebrew text and compute its standard gematria value.",
      inputSchema: { text: z.string() },
    },
    safe(({ text }: { text: string }) => {
      const plain = stripNiqqud(text);
      return { plain, gematria: gematria(plain) };
    }),
  );

  server.registerTool(
    "hebrew_numeral",
    {
      title: "Number to Hebrew numeral",
      description: "Write a positive integer as a Hebrew numeral (e.g. 15 -> ט״ו, 5787 -> תשפ״ז).",
      inputSchema: { number: z.number().int().positive(), keepThousands: z.boolean().default(false) },
    },
    safe(({ number, keepThousands }: { number: number; keepThousands: boolean }) => ({
      number,
      hebrew: toHebrewNumeral(number, { keepThousands }),
    })),
  );

  return server;
}
