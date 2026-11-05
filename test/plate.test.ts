import { describe, expect, it } from "vitest";
import { normalizeIsraeliPlate } from "../src/lib/plate.js";

describe("normalizeIsraeliPlate", () => {
  it("formats 7-digit legacy plates", () => {
    expect(normalizeIsraeliPlate("1234567")).toMatchObject({ valid: true, format: "legacy-7", formatted: "12-345-67" });
  });
  it("formats 8-digit modern plates and strips separators/prefix", () => {
    expect(normalizeIsraeliPlate("IL 123-45.678")).toMatchObject({ valid: true, format: "modern-8", formatted: "123-45-678" });
  });
  it("rejects wrong length", () => {
    expect(normalizeIsraeliPlate("12345").valid).toBe(false);
  });
  it("rejects letters", () => {
    expect(normalizeIsraeliPlate("12A4567").valid).toBe(false);
  });
});
