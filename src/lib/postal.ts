import { stripNiqqud } from "./hebrew.js";

/**
 * Israeli postal codes (מיקוד) have been 7 digits since the 2013 reform.
 * Formatted output uses the common XX-XXX-XX grouping.
 *
 * City ↔ postal mapping below is a curated approximation of major localities
 * (prefix / range based). It is NOT a full Israel Post dump — shipping a
 * national address DB would bloat this package. Prefer longest-prefix match.
 */

export interface PostalNormalizeResult {
  valid: boolean;
  digits: string;
  /** XX-XXX-XX when valid. */
  formatted?: string;
  reason?: string;
}

export interface Locality {
  /** Canonical Hebrew name. */
  he: string;
  /** Canonical English name. */
  en: string;
  /** Aliases (Hebrew / English / common spellings) used for lookup. */
  aliases: readonly string[];
  /**
   * Representative 7-digit postal codes (one or a few well-known examples).
   * Prefer codes that actually exist in public directories when known.
   */
  examples: readonly string[];
  /**
   * Compact prefix list (2–5 leading digits). Longer prefixes win on lookup
   * so e.g. "717" (Modi'in) beats "71" (Lod).
   */
  prefixes: readonly string[];
}

/** Major Israeli localities with realistic postal prefixes. ~70 entries. */
export const ISRAELI_LOCALITIES: readonly Locality[] = [
  { he: "ירושלים", en: "Jerusalem", aliases: ["jerusalem", "ירושלם", "ירושלים עיר"], examples: ["9103101", "9430123"], prefixes: ["91", "92", "93", "94", "95", "96"] },
  { he: "תל אביב-יפו", en: "Tel Aviv-Yafo", aliases: ["tel aviv", "tel-aviv", "telaviv", "tel aviv yafo", "yafo", "jaffa", "תל אביב", "תל-אביב", "יפו"], examples: ["6100000", "6299900"], prefixes: ["61", "62", "63", "64", "65", "66", "67", "68", "69"] },
  { he: "חיפה", en: "Haifa", aliases: ["haifa", "חיפה"], examples: ["3100000", "3300000"], prefixes: ["31", "32", "33", "34", "35"] },
  { he: "באר שבע", en: "Be'er Sheva", aliases: ["beer sheva", "beersheba", "beer-sheva", "beersheva", "באר-שבע", "בארשבע"], examples: ["8410000", "8480000"], prefixes: ["84", "85"] },
  { he: "ראשון לציון", en: "Rishon LeZion", aliases: ["rishon lezion", "rishon le zion", "rishon", "ראשלצ", "ראשון"], examples: ["7500000", "7570000"], prefixes: ["75"] },
  { he: "פתח תקווה", en: "Petah Tikva", aliases: ["petah tikva", "petach tikva", "petah-tikva", "פתח-תקווה", "פתח תקוה"], examples: ["4900000", "4950000"], prefixes: ["49"] },
  { he: "אשדוד", en: "Ashdod", aliases: ["ashdod"], examples: ["7700000", "7760000"], prefixes: ["77"] },
  { he: "נתניה", en: "Netanya", aliases: ["netanya", "netanya"], examples: ["4200000", "4250000"], prefixes: ["42"] },
  { he: "חולון", en: "Holon", aliases: ["holon"], examples: ["5800000", "5850000"], prefixes: ["58"] },
  { he: "בני ברק", en: "Bnei Brak", aliases: ["bnei brak", "bene berak", "bnei-brak", "בני-ברק"], examples: ["5100000", "5150000"], prefixes: ["51"] },
  { he: "רמת גן", en: "Ramat Gan", aliases: ["ramat gan", "ramat-gan"], examples: ["5200000", "5250000"], prefixes: ["52"] },
  { he: "רחובות", en: "Rehovot", aliases: ["rehovot", "rehovot"], examples: ["7600000", "7650000"], prefixes: ["76"] },
  { he: "בת ים", en: "Bat Yam", aliases: ["bat yam", "bat-yam"], examples: ["5900000", "5950000"], prefixes: ["59"] },
  { he: "אשקלון", en: "Ashkelon", aliases: ["ashkelon", "ashqelon"], examples: ["7800000", "7860000"], prefixes: ["78"] },
  { he: "הרצליה", en: "Herzliya", aliases: ["herzliya", "herzlia", "herzelia"], examples: ["4600000", "4670000"], prefixes: ["46"] },
  { he: "כפר סבא", en: "Kfar Saba", aliases: ["kfar saba", "kfar sava", "kefar sava", "כפר-סבא"], examples: ["4400000", "4450000"], prefixes: ["44"] },
  { he: "חדרה", en: "Hadera", aliases: ["hadera", "חדרה"], examples: ["3800000", "3850000"], prefixes: ["38"] },
  { he: "מודיעין-מכבים-רעות", en: "Modi'in-Maccabim-Re'ut", aliases: ["modiin", "modi'in", "modi in", "modiin maccabim reut", "מודיעין", "מודיעין מכבים רעות"], examples: ["7170000", "7178000"], prefixes: ["717"] },
  { he: "אילת", en: "Eilat", aliases: ["eilat", "elat"], examples: ["8800000", "8810000"], prefixes: ["88"] },
  { he: "נצרת", en: "Nazareth", aliases: ["nazareth", "nasra", "נצרת עילית"], examples: ["1600000", "1640000"], prefixes: ["16"] },
  { he: "רעננה", en: "Ra'anana", aliases: ["raanana", "ra'anana", "ranana"], examples: ["4300000", "4350000"], prefixes: ["43"] },
  { he: "גבעתיים", en: "Givatayim", aliases: ["givatayim", "givatayim", "givataim"], examples: ["5300000", "5350000"], prefixes: ["53"] },
  { he: "קריית גת", en: "Kiryat Gat", aliases: ["kiryat gat", "qiryat gat", "קרית גת"], examples: ["8200000", "8250000"], prefixes: ["82"] },
  { he: "לוד", en: "Lod", aliases: ["lod", "lydda"], examples: ["7110000", "7140000"], prefixes: ["711", "712", "713", "714", "715", "716"] },
  { he: "רמלה", en: "Ramla", aliases: ["ramla", "ramle"], examples: ["7200000", "7240000"], prefixes: ["72"] },
  { he: "נהריה", en: "Nahariya", aliases: ["nahariya", "nahariyya"], examples: ["2200000", "2240000"], prefixes: ["22"] },
  { he: "עכו", en: "Acre", aliases: ["acre", "akko", "acco"], examples: ["2400000", "2450000"], prefixes: ["24"] },
  { he: "טבריה", en: "Tiberias", aliases: ["tiberias", "tverya"], examples: ["1400000", "1420000"], prefixes: ["14"] },
  { he: "צפת", en: "Safed", aliases: ["safed", "tzfat", "zefat", "צפת"], examples: ["1300000", "1320000"], prefixes: ["13"] },
  { he: "עפולה", en: "Afula", aliases: ["afula", "afoula"], examples: ["1800000", "1830000"], prefixes: ["18"] },
  { he: "דימונה", en: "Dimona", aliases: ["dimona"], examples: ["8600000", "8610000"], prefixes: ["86"] },
  { he: "בית שמש", en: "Beit Shemesh", aliases: ["beit shemesh", "bet shemesh", "בית-שמש"], examples: ["9900000", "9950000"], prefixes: ["99"] },
  { he: "יבנה", en: "Yavne", aliases: ["yavne", "yavneh"], examples: ["8100000", "8120000"], prefixes: ["81"] },
  { he: "נס ציונה", en: "Ness Ziona", aliases: ["ness ziona", "nes ziona", "nes tziona", "נס-ציונה"], examples: ["7400000", "7410000"], prefixes: ["74"] },
  { he: "ראש העין", en: "Rosh HaAyin", aliases: ["rosh haayin", "rosh ha'ayin", "rosh ha ayin", "ראש העין"], examples: ["4800000", "4850000"], prefixes: ["48"] },
  { he: "הוד השרון", en: "Hod HaSharon", aliases: ["hod hasharon", "hod ha sharon", "הוד-השרון"], examples: ["4500000", "4530000"], prefixes: ["45"] },
  { he: "קריית מוצקין", en: "Kiryat Motzkin", aliases: ["kiryat motzkin", "qiryat motzkin", "קרית מוצקין"], examples: ["2600000", "2630000"], prefixes: ["26"] },
  { he: "קריית ביאליק", en: "Kiryat Bialik", aliases: ["kiryat bialik", "qiryat bialik", "קרית ביאליק"], examples: ["2700000", "2720000"], prefixes: ["27"] },
  { he: "קריית ים", en: "Kiryat Yam", aliases: ["kiryat yam", "qiryat yam", "קרית ים"], examples: ["2900000", "2910000"], prefixes: ["29"] },
  { he: "קריית אתא", en: "Kiryat Ata", aliases: ["kiryat ata", "qiryat ata", "קרית אתא"], examples: ["2800000", "2820000"], prefixes: ["28"] },
  { he: "כרמיאל", en: "Karmiel", aliases: ["karmiel", "carmiel"], examples: ["2100000", "2160000"], prefixes: ["216", "217", "218", "219"] },
  { he: "אור יהודה", en: "Or Yehuda", aliases: ["or yehuda", "or-yehuda"], examples: ["6000000", "6030000"], prefixes: ["603", "602"] },
  { he: "יהוד-מונוסון", en: "Yehud-Monosson", aliases: ["yehud", "yehud monosson", "יהוד"], examples: ["5600000", "5620000"], prefixes: ["56"] },
  { he: "קריית אונו", en: "Kiryat Ono", aliases: ["kiryat ono", "qiryat ono", "קרית אונו"], examples: ["5500000", "5540000"], prefixes: ["55"] },
  { he: "גבעת שמואל", en: "Givat Shmuel", aliases: ["givat shmuel", "givat shmuel"], examples: ["5400000", "5410000"], prefixes: ["54"] },
  { he: "פרדס חנה-כרכור", en: "Pardes Hanna-Karkur", aliases: ["pardes hanna", "pardes hanah", "pardes hanna karkur", "פרדס חנה", "כרכור"], examples: ["3700000", "3710000"], prefixes: ["37"] },
  { he: "זכרון יעקב", en: "Zikhron Ya'akov", aliases: ["zikhron yaakov", "zichron yaakov", "zichron ya'akov", "זכרון-יעקב"], examples: ["3090000", "3095000"], prefixes: ["309"] },
  { he: "קיסריה", en: "Caesarea", aliases: ["caesarea", "kesarya", "qesarya"], examples: ["3080000", "3088900"], prefixes: ["308"] },
  { he: "ערד", en: "Arad", aliases: ["arad"], examples: ["8900000", "8910000"], prefixes: ["89"] },
  { he: "שדרות", en: "Sderot", aliases: ["sderot", "sederot"], examples: ["8000000", "8710000"], prefixes: ["871"] },
  { he: "אופקים", en: "Ofakim", aliases: ["ofakim"], examples: ["8750000", "8754000"], prefixes: ["875"] },
  { he: "נתיבות", en: "Netivot", aliases: ["netivot"], examples: ["8770000", "8771000"], prefixes: ["877"] },
  { he: "קריית שמונה", en: "Kiryat Shmona", aliases: ["kiryat shmona", "qiryat shemona", "קרית שמונה"], examples: ["1100000", "1150000"], prefixes: ["11"] },
  { he: "מעלה אדומים", en: "Ma'ale Adumim", aliases: ["maale adumim", "ma'ale adumim", "maaleh adumim"], examples: ["9800000", "9840000"], prefixes: ["98"] },
  { he: "אריאל", en: "Ariel", aliases: ["ariel"], examples: ["4070000", "4076600"], prefixes: ["407"] },
  { he: "ביתר עילית", en: "Beitar Illit", aliases: ["beitar illit", "betar illit", "ביתר"], examples: ["9050000", "9055800"], prefixes: ["905"] },
  { he: "מודיעין עילית", en: "Modi'in Illit", aliases: ["modiin illit", "modi'in illit", "מודיעין-עילית"], examples: ["7190000", "7191900"], prefixes: ["719"] },
  { he: "אלעד", en: "Elad", aliases: ["elad"], examples: ["4080000", "4082000"], prefixes: ["408"] },
  { he: "שוהם", en: "Shoham", aliases: ["shoham"], examples: ["6080000", "6085000"], prefixes: ["608"] },
  { he: "מבשרת ציון", en: "Mevaseret Zion", aliases: ["mevaseret zion", "mevasseret zion", "מבשרת-ציון"], examples: ["9070000", "9080000"], prefixes: ["907", "908"] },
  { he: "נשר", en: "Nesher", aliases: ["nesher"], examples: ["3600000", "3680000"], prefixes: ["36"] },
  { he: "טירת כרמל", en: "Tirat Carmel", aliases: ["tirat carmel", "tirat karmel", "טירת-כרמל"], examples: ["3900000", "3910000"], prefixes: ["39"] },
  { he: "יקנעם עילית", en: "Yokneam Illit", aliases: ["yokneam", "yoqneam", "yokne'am", "יקנעם"], examples: ["2060000", "2069200"], prefixes: ["206"] },
  { he: "מגדל העמק", en: "Migdal HaEmek", aliases: ["migdal haemek", "migdal ha'emek", "מגדל-העמק"], examples: ["2300000", "2310000"], prefixes: ["23"] },
  { he: "בית שאן", en: "Beit She'an", aliases: ["beit shean", "bet shean", "beit she'an", "בית-שאן"], examples: ["1170000", "1171000"], prefixes: ["117"] },
  { he: "קריית מלאכי", en: "Kiryat Malakhi", aliases: ["kiryat malakhi", "kiryat malachi", "קרית מלאכי"], examples: ["8300000", "8310000"], prefixes: ["83"] },
  { he: "גדרה", en: "Gedera", aliases: ["gedera", "gederah"], examples: ["7070000", "7071000"], prefixes: ["707"] },
  { he: "גן יבנה", en: "Gan Yavne", aliases: ["gan yavne", "gan yavneh"], examples: ["7080000", "7080001"], prefixes: ["708"] },
  { he: "אור עקיבא", en: "Or Akiva", aliases: ["or akiva", "or aqiva"], examples: ["3060000", "3060001"], prefixes: ["306"] },
  { he: "בנימינה-גבעת עדה", en: "Binyamina-Giv'at Ada", aliases: ["binyamina", "binyamina givat ada", "בנימינה"], examples: ["3050000", "3050001"], prefixes: ["305"] },
  { he: "אבן יהודה", en: "Even Yehuda", aliases: ["even yehuda"], examples: ["4050000", "4051100"], prefixes: ["405"] },
  { he: "קדימה-צורן", en: "Kadima-Zoran", aliases: ["kadima", "kadima zoran", "צורן"], examples: ["6092000", "6093000"], prefixes: ["6092", "6093"] },
  { he: "מעלות-תרשיחא", en: "Ma'alot-Tarshiha", aliases: ["maalot", "ma'alot", "maalot tarshiha", "מעלות"], examples: ["2100000", "2150000"], prefixes: ["210", "211", "212", "213", "214", "215"] },
];

export interface CityLookupResult {
  found: boolean;
  query: string;
  he?: string;
  en?: string;
  examples?: string[];
  prefixes?: string[];
  reason?: string;
}

export interface CityFromPostalResult {
  valid: boolean;
  digits: string;
  formatted?: string;
  found: boolean;
  he?: string;
  en?: string;
  matchedPrefix?: string;
  /** Honest note when the match is prefix-based approximation. */
  note?: string;
  reason?: string;
}

/** Strip niqqud, punctuation, collapse whitespace, lower-case Latin. */
export function normalizeCityQuery(query: string): string {
  let s = stripNiqqud(query).trim();
  // Latin + Hebrew punctuation (maqaf ־, gershayim ״, geresh ׳, quotes, dashes)
  s = s.replace(/[''`׳״".,\-_/\\()\u05BE\u2010-\u2015]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s.toLowerCase();
}

function localityKey(l: Locality): string {
  return normalizeCityQuery(l.he);
}

/** Build alias → locality index once. */
const ALIAS_INDEX: Map<string, Locality> = (() => {
  const map = new Map<string, Locality>();
  for (const loc of ISRAELI_LOCALITIES) {
    map.set(localityKey(loc), loc);
    map.set(normalizeCityQuery(loc.en), loc);
    for (const a of loc.aliases) {
      const k = normalizeCityQuery(a);
      if (k) map.set(k, loc);
    }
  }
  return map;
})();

/** Prefixes sorted longest-first for cityFromIsraeliPostalCode. */
const PREFIX_TABLE: { prefix: string; loc: Locality }[] = (() => {
  const rows: { prefix: string; loc: Locality }[] = [];
  for (const loc of ISRAELI_LOCALITIES) {
    for (const p of loc.prefixes) rows.push({ prefix: p, loc });
  }
  rows.sort((a, b) => b.prefix.length - a.prefix.length || a.prefix.localeCompare(b.prefix));
  return rows;
})();

/**
 * Normalize an Israeli 7-digit postal code (מיקוד).
 * Accepts digits with optional spaces/dashes; strips non-digits.
 * Formatted style: XX-XXX-XX.
 */
export function normalizeIsraeliPostalCode(input: string): PostalNormalizeResult {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, digits: "", reason: "Empty postal code" };
  if (/[^0-9\s\-.־]/.test(trimmed)) {
    return { valid: false, digits: trimmed.replace(/\D/g, ""), reason: "Postal code may contain only digits and separators" };
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 7) {
    return { valid: false, digits, reason: `Expected 7 digits (post-2013 mikud), got ${digits.length}` };
  }
  return {
    valid: true,
    digits,
    formatted: `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`,
  };
}

/** Look up a city/town by Hebrew or English name (aliases supported). */
export function lookupIsraeliCity(query: string): CityLookupResult {
  const key = normalizeCityQuery(query);
  if (!key) return { found: false, query, reason: "Empty city name" };
  const loc = ALIAS_INDEX.get(key);
  if (!loc) return { found: false, query, reason: "City not in curated locality table" };
  return {
    found: true,
    query,
    he: loc.he,
    en: loc.en,
    examples: [...loc.examples],
    prefixes: [...loc.prefixes],
  };
}

/**
 * Map a 7-digit postal code to the best-matching curated locality via
 * longest-prefix match. Approximation only — not a full Israel Post dump.
 */
export function cityFromIsraeliPostalCode(postal: string): CityFromPostalResult {
  const norm = normalizeIsraeliPostalCode(postal);
  if (!norm.valid) {
    return { valid: false, digits: norm.digits, found: false, reason: norm.reason };
  }
  const digits = norm.digits;
  for (const { prefix, loc } of PREFIX_TABLE) {
    if (digits.startsWith(prefix)) {
      return {
        valid: true,
        digits,
        formatted: norm.formatted,
        found: true,
        he: loc.he,
        en: loc.en,
        matchedPrefix: prefix,
        note: "Curated prefix match — approximate locality, not a full Israel Post address DB",
      };
    }
  }
  return {
    valid: true,
    digits,
    formatted: norm.formatted,
    found: false,
    reason: "No curated locality matches this postal prefix",
    note: "Curated table covers major cities/towns only",
  };
}
