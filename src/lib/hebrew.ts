const LETTER_VALUES: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
};

/** Niqqud, cantillation marks and other Hebrew combining points (U+0591–U+05C7 except letters/punctuation). */
const POINTS = /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g;

export function stripNiqqud(text: string): string {
  return text.normalize("NFD").replace(POINTS, "").normalize("NFC");
}

/** Standard (mispar hechrechi) gematria value; final letters count like their regular forms. */
export function gematria(text: string): number {
  let sum = 0;
  for (const ch of stripNiqqud(text)) sum += LETTER_VALUES[ch] ?? 0;
  return sum;
}

const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

/**
 * Hebrew numeral (e.g. 5787 -> תשפ"ז, 15 -> ט"ו). Thousands are dropped by default,
 * as is customary for years.
 */
export function toHebrewNumeral(n: number, { keepThousands = false, punctuate = true } = {}): string {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError("Expected a positive integer");
  let out = "";
  const thousands = Math.floor(n / 1000);
  let rest = n % 1000;
  if (keepThousands && thousands > 0) out += toHebrewNumeral(thousands, { punctuate: false }) + "׳";
  while (rest >= 400) {
    out += "ת";
    rest -= 400;
  }
  out += HUNDREDS[Math.floor(rest / 100)];
  rest %= 100;
  if (rest === 15) out += "טו";
  else if (rest === 16) out += "טז";
  else out += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
  if (!punctuate || out.length === 0) return out;
  const prefix = keepThousands && thousands > 0 ? out.slice(0, out.indexOf("׳") + 1) : "";
  const body = out.slice(prefix.length);
  if (body.length === 0) return out;
  return prefix + (body.length === 1 ? body + "׳" : body.slice(0, -1) + "״" + body.slice(-1));
}

export interface HebrewDate {
  gregorian: string;
  day: number;
  month: string;
  monthHebrew: string;
  year: number;
  formatted: string;
}

/** Converts a Gregorian date (YYYY-MM-DD) to the Hebrew calendar via ICU. */
export function toHebrewDate(isoDate: string): HebrewDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new RangeError("Date must be YYYY-MM-DD");
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date");
  const part = (locale: string, type: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" })
      .formatToParts(date)
      .find((p) => p.type === type)?.value ?? "";
  const day = Number(part("en-u-ca-hebrew", "day"));
  const year = Number(part("en-u-ca-hebrew", "year"));
  const month = part("en-u-ca-hebrew", "month");
  const monthHebrew = part("he-u-ca-hebrew", "month");
  return {
    gregorian: isoDate,
    day,
    month,
    monthHebrew,
    year,
    formatted: `${toHebrewNumeral(day)} ב${monthHebrew} ${toHebrewNumeral(year)}`,
  };
}
