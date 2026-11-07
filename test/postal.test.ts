import { describe, expect, it } from "vitest";
import {
  cityFromIsraeliPostalCode,
  ISRAELI_LOCALITIES,
  lookupIsraeliCity,
  normalizeCityQuery,
  normalizeIsraeliPostalCode,
} from "../src/lib/postal.js";

describe("normalizeIsraeliPostalCode", () => {
  it("accepts 7 continuous digits and formats XX-XXX-XX", () => {
    expect(normalizeIsraeliPostalCode("1234567")).toEqual({
      valid: true,
      digits: "1234567",
      formatted: "12-345-67",
    });
  });

  it("strips spaces and dashes", () => {
    expect(normalizeIsraeliPostalCode("12-345-67")).toMatchObject({ valid: true, digits: "1234567", formatted: "12-345-67" });
    expect(normalizeIsraeliPostalCode(" 61 000 00 ")).toMatchObject({ valid: true, digits: "6100000" });
  });

  it("rejects wrong length", () => {
    expect(normalizeIsraeliPostalCode("123456").valid).toBe(false);
    expect(normalizeIsraeliPostalCode("12345678").reason).toMatch(/got 8/);
  });

  it("rejects letters", () => {
    expect(normalizeIsraeliPostalCode("12A4567").valid).toBe(false);
  });

  it("rejects empty", () => {
    expect(normalizeIsraeliPostalCode("   ")).toMatchObject({ valid: false, reason: "Empty postal code" });
  });
});

describe("lookupIsraeliCity", () => {
  it("finds Hebrew canonical names", () => {
    expect(lookupIsraeliCity("חדרה")).toMatchObject({ found: true, he: "חדרה", en: "Hadera" });
    expect(lookupIsraeliCity("ירושלים")?.prefixes?.length).toBeGreaterThan(0);
  });

  it("resolves English aliases and punctuation", () => {
    expect(lookupIsraeliCity("Tel Aviv")).toMatchObject({ found: true, he: "תל אביב-יפו" });
    expect(lookupIsraeliCity("tel-aviv")).toMatchObject({ found: true, en: "Tel Aviv-Yafo" });
    expect(lookupIsraeliCity("Beer Sheva")).toMatchObject({ found: true, he: "באר שבע" });
    expect(lookupIsraeliCity("Modiin")).toMatchObject({ found: true, he: "מודיעין-מכבים-רעות" });
  });

  it("strips niqqud and Hebrew punctuation", () => {
    expect(normalizeCityQuery("תֵּל־אָבִיב")).toContain("תל");
    expect(lookupIsraeliCity("תל־אביב")).toMatchObject({ found: true });
  });

  it("returns not found for unknown places", () => {
    expect(lookupIsraeliCity("Atlantis")).toMatchObject({ found: false });
    expect(lookupIsraeliCity("")).toMatchObject({ found: false });
  });

  it("curated table has a solid set of major localities", () => {
    expect(ISRAELI_LOCALITIES.length).toBeGreaterThanOrEqual(40);
    const names = new Set(ISRAELI_LOCALITIES.map((l) => l.en));
    for (const must of ["Jerusalem", "Tel Aviv-Yafo", "Haifa", "Hadera", "Netanya", "Eilat"]) {
      expect(names.has(must)).toBe(true);
    }
  });
});

describe("cityFromIsraeliPostalCode", () => {
  it("maps known prefixes to cities (longest match)", () => {
    expect(cityFromIsraeliPostalCode("6100000")).toMatchObject({ valid: true, found: true, he: "תל אביב-יפו" });
    expect(cityFromIsraeliPostalCode("38-500-00")).toMatchObject({ found: true, en: "Hadera" });
    expect(cityFromIsraeliPostalCode("7178000")).toMatchObject({ found: true, en: "Modi'in-Maccabim-Re'ut", matchedPrefix: "717" });
    // 117 beats broad "11" (Kiryat Shmona)
    expect(cityFromIsraeliPostalCode("1170000")).toMatchObject({ found: true, en: "Beit She'an", matchedPrefix: "117" });
  });

  it("returns valid but not found for unknown prefixes", () => {
    expect(cityFromIsraeliPostalCode("0000000")).toMatchObject({ valid: true, found: false });
  });

  it("propagates invalid postal format", () => {
    expect(cityFromIsraeliPostalCode("123")).toMatchObject({ valid: false, found: false });
  });
});
