/** Israeli standard VAT (מע"מ) rate history. Each entry applies from its date (inclusive). */
export const VAT_HISTORY: ReadonlyArray<{ from: string; rate: number }> = [
  { from: "2012-09-01", rate: 0.17 },
  { from: "2013-06-02", rate: 0.18 },
  { from: "2015-10-01", rate: 0.17 },
  { from: "2025-01-01", rate: 0.18 },
];

export function vatRateOn(date: string | Date = new Date()): number {
  const iso = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  if (iso < VAT_HISTORY[0].from) throw new RangeError(`No VAT data before ${VAT_HISTORY[0].from}`);
  let rate = VAT_HISTORY[0].rate;
  for (const e of VAT_HISTORY) if (iso >= e.from) rate = e.rate;
  return rate;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface VatBreakdown {
  rate: number;
  net: number;
  vat: number;
  gross: number;
}

/** amountIncludesVat=true splits a gross price; false adds VAT on top of a net price. */
export function calculateVat(amount: number, amountIncludesVat: boolean, date?: string): VatBreakdown {
  if (!Number.isFinite(amount) || amount < 0) throw new RangeError("Amount must be a non-negative number");
  const rate = vatRateOn(date ?? new Date());
  if (amountIncludesVat) {
    const net = round2(amount / (1 + rate));
    return { rate, net, vat: round2(amount - net), gross: round2(amount) };
  }
  const vat = round2(amount * rate);
  return { rate, net: round2(amount), vat, gross: round2(amount + vat) };
}
