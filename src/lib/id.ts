/**
 * Israeli identification numbers (Teudat Zehut, company / amuta numbers, Osek Murshe)
 * share the same 9-digit check-digit scheme: alternating weights 1,2,1,2...,
 * digits of products summed, total must be divisible by 10.
 */
export type IdKind = "person" | "company" | "amuta" | "partnership" | "unknown";

export interface IdValidation {
  input: string;
  normalized: string | null;
  valid: boolean;
  kind: IdKind;
  reason?: string;
}

const PREFIX_KIND: Record<string, IdKind> = {
  "51": "company", // חברה בע"מ
  "52": "company", // חברה ממשלתית / ציבורית
  "58": "amuta", // עמותה / חל"צ
  "55": "partnership", // שותפות
  "57": "company", // אגודה שיתופית
};

export function israeliCheckDigitOk(nineDigits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(nineDigits[i]) * ((i % 2) + 1);
    if (d > 9) d -= 9;
    sum += d;
  }
  return sum % 10 === 0;
}

export function validateIsraeliId(input: string, expect: "person" | "corporate" | "any" = "any"): IdValidation {
  const digits = input.replace(/[\s\-–]/g, "");
  if (!/^\d{1,9}$/.test(digits)) {
    return { input, normalized: null, valid: false, kind: "unknown", reason: "Must contain 1-9 digits only" };
  }
  const normalized = digits.padStart(9, "0");
  if (/^0+$/.test(normalized)) {
    return { input, normalized, valid: false, kind: "unknown", reason: "All zeros is not a valid number" };
  }
  const kind: IdKind = PREFIX_KIND[normalized.slice(0, 2)] ?? "person";
  if (!israeliCheckDigitOk(normalized)) {
    return { input, normalized, valid: false, kind, reason: "Check digit mismatch" };
  }
  if (expect === "corporate" && kind === "person") {
    return { input, normalized, valid: false, kind, reason: "Valid checksum but prefix is not a corporate registry prefix" };
  }
  return { input, normalized, valid: true, kind };
}
