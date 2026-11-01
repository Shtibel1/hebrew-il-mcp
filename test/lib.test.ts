import { describe, expect, it } from "vitest";
import { validateIsraeliId, israeliCheckDigitOk } from "../src/lib/id.js";
import { normalizeIsraeliPhone } from "../src/lib/phone.js";
import { calculateVat, vatRateOn } from "../src/lib/vat.js";
import { gematria, stripNiqqud, toHebrewDate, toHebrewNumeral } from "../src/lib/hebrew.js";

describe("validateIsraeliId", () => {
  it("accepts a valid ID and pads short input", () => {
    const r = validateIsraeliId("12345678-2");
    expect(r).toMatchObject({ valid: true, normalized: "123456782", kind: "person" });
    expect(validateIsraeliId("1").valid).toBe(false);
  });
  it("rejects a wrong check digit", () => {
    expect(validateIsraeliId("123456789")).toMatchObject({ valid: false, reason: "Check digit mismatch" });
  });
  it("detects corporate prefixes", () => {
    const n = findValid("51000000");
    expect(validateIsraeliId(n, "corporate")).toMatchObject({ valid: true, kind: "company" });
    expect(validateIsraeliId("123456782", "corporate").valid).toBe(false);
  });
  it("rejects garbage and all zeros", () => {
    expect(validateIsraeliId("abc").valid).toBe(false);
    expect(validateIsraeliId("000000000").valid).toBe(false);
  });
});

function findValid(prefix8: string): string {
  for (let d = 0; d < 10; d++) if (israeliCheckDigitOk(prefix8 + d)) return prefix8 + d;
  throw new Error("unreachable");
}

describe("normalizeIsraeliPhone", () => {
  it.each([
    ["050-1234567", "+972501234567", "mobile", "050-1234567"],
    ["+972 (0)54 765 4321", "+972547654321", "mobile", "054-7654321"],
    ["00972-3-6123456", "+97236123456", "landline", "03-6123456"],
    ["077 555 1234", "+972775551234", "voip", "077-5551234"],
  ])("%s", (input, e164, type, national) => {
    expect(normalizeIsraeliPhone(input)).toMatchObject({ valid: true, e164, type, national });
  });
  it("handles toll-free numbers without E.164", () => {
    expect(normalizeIsraeliPhone("1-800-500-500")).toMatchObject({ valid: true, type: "toll-free", national: "1800-500-500" });
  });
  it("rejects invalid numbers", () => {
    expect(normalizeIsraeliPhone("12345").valid).toBe(false);
    expect(normalizeIsraeliPhone("050-12345").valid).toBe(false);
    expect(normalizeIsraeliPhone("phone").valid).toBe(false);
  });
});

describe("VAT", () => {
  it("uses the historical rate for a date", () => {
    expect(vatRateOn("2014-05-01")).toBe(0.18);
    expect(vatRateOn("2024-12-31")).toBe(0.17);
    expect(vatRateOn("2025-01-01")).toBe(0.18);
    expect(() => vatRateOn("2000-01-01")).toThrow(RangeError);
  });
  it("adds VAT to a net amount", () => {
    expect(calculateVat(100, false, "2026-01-01")).toEqual({ rate: 0.18, net: 100, vat: 18, gross: 118 });
  });
  it("splits a gross amount", () => {
    expect(calculateVat(117, true, "2020-06-01")).toEqual({ rate: 0.17, net: 100, vat: 17, gross: 117 });
    const r = calculateVat(99.99, true, "2026-01-01");
    expect(r.net + r.vat).toBeCloseTo(99.99, 2);
  });
  it("rejects negative amounts", () => {
    expect(() => calculateVat(-1, false)).toThrow();
  });
});

describe("Hebrew text", () => {
  it("strips niqqud", () => {
    expect(stripNiqqud("שָׁלוֹם")).toBe("שלום");
    expect(stripNiqqud("בְּרֵאשִׁ֖ית")).toBe("בראשית");
  });
  it("computes gematria", () => {
    expect(gematria("שלום")).toBe(376);
    expect(gematria("חַי")).toBe(18);
  });
  it("writes Hebrew numerals", () => {
    expect(toHebrewNumeral(15)).toBe("ט״ו");
    expect(toHebrewNumeral(16)).toBe("ט״ז");
    expect(toHebrewNumeral(1)).toBe("א׳");
    expect(toHebrewNumeral(5787)).toBe("תשפ״ז");
    expect(toHebrewNumeral(5787, { keepThousands: true })).toBe("ה׳תשפ״ז");
    expect(toHebrewNumeral(800)).toBe("ת״ת");
  });
  it("converts to a Hebrew date", () => {
    expect(toHebrewDate("2026-11-01")).toMatchObject({ day: 21, year: 5787, monthHebrew: "חשוון", formatted: "כ״א בחשוון תשפ״ז" });
    expect(toHebrewDate("2025-09-23").formatted).toBe("א׳ בתשרי תשפ״ו");
    expect(() => toHebrewDate("01/11/2026")).toThrow();
  });
});
