export type PlateFormat = "legacy-7" | "modern-8";

export interface PlateResult {
  valid: boolean;
  digits: string;
  formatted?: string;
  format?: PlateFormat;
  reason?: string;
}

/**
 * Normalize an Israeli vehicle licence plate.
 * Civilian plates are 7 digits (NN-NNN-NN, issued until 2017) or
 * 8 digits (NNN-NN-NNN, issued since 2017). Separators, spaces and the
 * "IL" prefix are ignored.
 */
export function normalizeIsraeliPlate(input: string): PlateResult {
  const cleaned = input.trim().toUpperCase().replace(/^IL/, "");
  if (/[^0-9\s\-.־]/.test(cleaned)) {
    return { valid: false, digits: cleaned.replace(/\D/g, ""), reason: "Plate may contain only digits and separators" };
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 7) {
    return { valid: true, digits, format: "legacy-7", formatted: `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}` };
  }
  if (digits.length === 8) {
    return { valid: true, digits, format: "modern-8", formatted: `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}` };
  }
  return { valid: false, digits, reason: `Expected 7 or 8 digits, got ${digits.length}` };
}
