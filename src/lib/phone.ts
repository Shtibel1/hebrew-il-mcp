export type PhoneType = "mobile" | "landline" | "voip" | "toll-free" | "premium";

export interface PhoneResult {
  input: string;
  valid: boolean;
  e164?: string;
  national?: string;
  type?: PhoneType;
  areaOrCarrierPrefix?: string;
  reason?: string;
}

const LANDLINE = new Set(["2", "3", "4", "8", "9"]);

/** Normalize Israeli phone numbers written as 050-1234567, +972 50 123 4567, 00972..., 1-800-... */
export function normalizeIsraeliPhone(input: string): PhoneResult {
  let s = input.replace(/[\s\-().]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("00")) s = s.slice(2);
  if (!/^\d+$/.test(s)) return { input, valid: false, reason: "Contains non-digit characters" };

  if (/^1(700|800|599|801|809|900)\d{6}$/.test(s)) {
    const p = s.slice(0, 4);
    const type: PhoneType = p === "1900" || p === "1809" ? "premium" : "toll-free";
    return { input, valid: true, national: `${p}-${s.slice(4, 7)}-${s.slice(7)}`, type, areaOrCarrierPrefix: p };
  }

  let nsn: string; // national significant number, without trunk 0 / country code
  if (s.startsWith("972")) nsn = s.slice(3);
  else if (s.startsWith("0")) nsn = s.slice(1);
  else return { input, valid: false, reason: "Expected leading 0, +972 or 00972" };
  if (nsn.startsWith("0")) nsn = nsn.slice(1); // "+972 (0)50..."

  let type: PhoneType;
  let prefixLen: number;
  if (/^5\d{8}$/.test(nsn)) {
    type = "mobile";
    prefixLen = 2;
  } else if (/^7\d{8}$/.test(nsn)) {
    type = "voip";
    prefixLen = 2;
  } else if (nsn.length === 8 && LANDLINE.has(nsn[0])) {
    type = "landline";
    prefixLen = 1;
  } else {
    return { input, valid: false, reason: "Unrecognized Israeli number length or prefix" };
  }
  const prefix = "0" + nsn.slice(0, prefixLen);
  return {
    input,
    valid: true,
    e164: `+972${nsn}`,
    national: `${prefix}-${nsn.slice(prefixLen)}`,
    type,
    areaOrCarrierPrefix: prefix,
  };
}
