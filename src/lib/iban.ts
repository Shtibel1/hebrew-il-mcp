/**
 * Israeli IBAN (ISO 13616): "IL" + 2 check digits + 19 digits (BBAN), 23 chars total.
 * BBAN layout: 3-digit bank code, 3-digit branch, 13-digit account number.
 * Check digits use ISO 7064 MOD 97-10, the same as every other IBAN country.
 */
export interface IbanValidation {
  input: string;
  normalized: string | null;
  valid: boolean;
  bankCode?: string;
  bankName?: string;
  branch?: string;
  account?: string;
  /** Print format in groups of four, e.g. "IL62 0108 0000 0009 9999 999". */
  formatted?: string;
  reason?: string;
}

/** Bank of Israel bank codes for the main retail banks. Unlisted codes still validate. */
export const ISRAELI_BANKS: Readonly<Record<string, string>> = {
  "04": "Bank Yahav",
  "09": "Bank Hadoar (Postal Bank)",
  "10": "Bank Leumi",
  "11": "Israel Discount Bank",
  "12": "Bank Hapoalim",
  "14": "Bank Otsar Ha-Hayal",
  "17": "Mercantile Discount Bank",
  "20": "Mizrahi Tefahot Bank",
  "26": "UBank",
  "31": "First International Bank of Israel",
  "46": "Bank Massad",
  "52": "Bank Poalei Agudat Israel",
  "54": "Bank of Jerusalem",
};

/** ISO 7064 MOD 97-10 remainder of a numeric string, computed in chunks to stay within Number precision. */
function mod97(numeric: string): number {
  let rem = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    rem = Number(String(rem) + numeric.slice(i, i + 7)) % 97;
  }
  return rem;
}

function toNumeric(rearranged: string): string {
  return rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
}

function bankNameFor(code3: string): string | undefined {
  return code3.startsWith("0") ? ISRAELI_BANKS[code3.slice(1)] : undefined;
}

export function validateIsraeliIban(input: string): IbanValidation {
  const normalized = input.replace(/[\s\-.]/g, "").toUpperCase();
  if (!normalized.startsWith("IL")) {
    return { input, normalized: null, valid: false, reason: "Israeli IBANs start with IL" };
  }
  if (!/^IL\d{21}$/.test(normalized)) {
    return { input, normalized: null, valid: false, reason: "Expected IL followed by 21 digits (23 characters)" };
  }
  const bankCode = normalized.slice(4, 7);
  const parts = {
    bankCode,
    bankName: bankNameFor(bankCode),
    branch: normalized.slice(7, 10),
    account: normalized.slice(10),
    formatted: normalized.replace(/(.{4})/g, "$1 ").trim(),
  };
  const ok = mod97(toNumeric(normalized.slice(4) + normalized.slice(0, 4))) === 1;
  if (!ok) return { input, normalized, valid: false, ...parts, reason: "Check digits mismatch" };
  return { input, normalized, valid: true, ...parts };
}

/**
 * Build an IBAN from domestic bank details (bank, branch, account as printed on a cheque).
 * Throws on malformed input so agents get a clear error instead of a wrong IBAN.
 */
export function buildIsraeliIban(bank: string | number, branch: string | number, account: string | number): string {
  const b = String(bank).replace(/\D/g, "");
  const br = String(branch).replace(/\D/g, "");
  const acc = String(account).replace(/\D/g, "");
  if (!b || b.length > 3) throw new Error("Bank code must be 1-3 digits");
  if (!br || br.length > 3) throw new Error("Branch must be 1-3 digits");
  if (!acc || acc.length > 13) throw new Error("Account number must be 1-13 digits");
  const bban = b.padStart(3, "0") + br.padStart(3, "0") + acc.padStart(13, "0");
  const check = 98 - mod97(toNumeric(bban + "IL00"));
  return `IL${String(check).padStart(2, "0")}${bban}`;
}
