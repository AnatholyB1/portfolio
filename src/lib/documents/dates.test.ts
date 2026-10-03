import { describe, expect, it } from "vitest";
import { addDaysIso, formatDateLongFr, parisDateOf } from "./dates";
import { normalizeText } from "./text";

describe("dates", () => {
  it("parisDateOf utilise Europe/Paris", () => {
    expect(parisDateOf(new Date("2026-10-12T22:30:00Z"))).toBe("2026-10-13");
  });
  it("formatDateLongFr", () => {
    expect(formatDateLongFr("2026-10-12")).toBe("12 octobre 2026");
    expect(formatDateLongFr("2026-03-01")).toBe("1er mars 2026");
  });
  it("addDaysIso", () => {
    expect(addDaysIso("2026-10-12", 30)).toBe("2026-11-11");
  });
});

describe("normalizeText", () => {
  it("normalise les espaces", () => {
    expect(normalizeText("a b c\n\n d")).toBe("a b c d");
  });
});
