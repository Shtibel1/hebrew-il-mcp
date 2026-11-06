import { describe, expect, it } from "vitest";
import {
  israeliBusinessDay,
  israeliHolidaysInYear,
  nextIsraeliBusinessDay,
} from "../src/lib/holidays.js";

describe("israeliBusinessDay", () => {
  it("treats Saturday as Shabbat (not a business day)", () => {
    // 2026-11-07 is a Saturday
    expect(israeliBusinessDay("2026-11-07")).toMatchObject({
      businessDay: false,
      weekday: "Saturday",
      holiday: { kind: "shabbat", nameEn: "Shabbat" },
    });
  });

  it("treats Friday as a business day when not a holiday", () => {
    // 2026-11-06 is a Friday
    expect(israeliBusinessDay("2026-11-06")).toMatchObject({
      businessDay: true,
      weekday: "Friday",
    });
    expect(israeliBusinessDay("2026-11-06").holiday).toBeUndefined();
  });

  it("flags known Jewish full-closure holidays", () => {
    expect(israeliBusinessDay("2025-09-23")).toMatchObject({
      businessDay: false,
      holiday: { kind: "rosh-hashanah" },
    });
    expect(israeliBusinessDay("2025-09-24")).toMatchObject({
      businessDay: false,
      holiday: { kind: "rosh-hashanah" },
    });
    expect(israeliBusinessDay("2025-10-02")).toMatchObject({
      businessDay: false,
      holiday: { kind: "yom-kippur" },
    });
    expect(israeliBusinessDay("2025-10-07")).toMatchObject({
      businessDay: false,
      holiday: { kind: "sukkot" },
    });
    expect(israeliBusinessDay("2025-10-14")).toMatchObject({
      businessDay: false,
      holiday: { kind: "shemini-atzeret" },
    });
    expect(israeliBusinessDay("2026-04-02")).toMatchObject({
      businessDay: false,
      holiday: { kind: "pesach" },
    });
    expect(israeliBusinessDay("2026-04-08")).toMatchObject({
      businessDay: false,
      holiday: { kind: "pesach" },
    });
    expect(israeliBusinessDay("2026-05-22")).toMatchObject({
      businessDay: false,
      holiday: { kind: "shavuot" },
    });
  });

  it("applies Independence Day postponement rules", () => {
    // 2024: Iyar 5 Monday → observe Tuesday Iyar 6 = May 14
    expect(israeliBusinessDay("2024-05-14")).toMatchObject({
      businessDay: false,
      holiday: { kind: "independence-day" },
    });
    expect(israeliBusinessDay("2024-05-13").holiday?.kind).not.toBe("independence-day");

    // 2025: Iyar 5 Saturday → observe Thursday Iyar 3 = May 1
    expect(israeliBusinessDay("2025-05-01")).toMatchObject({
      businessDay: false,
      holiday: { kind: "independence-day" },
    });
    expect(israeliBusinessDay("2025-05-03").holiday?.kind).not.toBe("independence-day");

    // 2026: Iyar 5 Wednesday → observe Iyar 5 = Apr 22
    expect(israeliBusinessDay("2026-04-22")).toMatchObject({
      businessDay: false,
      weekday: "Wednesday",
      holiday: { kind: "independence-day" },
    });

    // 2022: Iyar 5 Friday → observe Thursday Iyar 4 = May 5
    expect(israeliBusinessDay("2022-05-05")).toMatchObject({
      businessDay: false,
      holiday: { kind: "independence-day" },
    });
  });

  it("attaches the Hebrew date", () => {
    const r = israeliBusinessDay("2026-04-22");
    expect(r.hebrew).toMatchObject({ day: 5, month: "Iyar", year: 5786 });
  });

  it("rejects bad dates", () => {
    expect(() => israeliBusinessDay("01/11/2026")).toThrow(RangeError);
  });
});

describe("nextIsraeliBusinessDay", () => {
  it("skips the weekend", () => {
    // Friday 2026-11-06 → next is Sunday 2026-11-08
    expect(nextIsraeliBusinessDay("2026-11-06")).toMatchObject({
      date: "2026-11-08",
      businessDay: true,
      weekday: "Sunday",
    });
  });

  it("skips a holiday into the next open day", () => {
    // Yom Kippur 2025-10-02 (Thursday) → next is Sunday 2025-10-05
    // (Friday 3rd is open, actually — YK Thu, Fri open, Sat closed, Sun open)
    expect(nextIsraeliBusinessDay("2025-10-01")).toMatchObject({
      date: "2025-10-03",
      businessDay: true,
      weekday: "Friday",
    });
    // From YK itself, next is Friday
    expect(nextIsraeliBusinessDay("2025-10-02").date).toBe("2025-10-03");
  });

  it("skips Rosh Hashanah spanning into the weekend", () => {
    // RH 2025: Tue Sep 23 + Wed Sep 24; Thu Sep 25 is open
    expect(nextIsraeliBusinessDay("2025-09-22")).toMatchObject({
      date: "2025-09-25",
      businessDay: true,
    });
  });
});

describe("israeliHolidaysInYear", () => {
  it("returns a non-empty list for 2026 including Independence Day and Pesach", () => {
    const list = israeliHolidaysInYear(2026);
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.some((h) => h.kind === "independence-day" && h.date === "2026-04-22")).toBe(true);
    expect(list.some((h) => h.kind === "pesach" && h.date === "2026-04-02")).toBe(true);
    expect(list.some((h) => h.kind === "shavuot")).toBe(true);
    expect(list.every((h) => h.kind !== "shabbat")).toBe(true);
  });

  it("rejects out-of-range years", () => {
    expect(() => israeliHolidaysInYear(1800)).toThrow(RangeError);
  });
});
