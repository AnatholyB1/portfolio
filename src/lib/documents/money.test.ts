import { describe, expect, it } from "vitest";
import {
  formatEuros,
  formatPercent,
  lineTotalCents,
  quoteTotals,
  toCents,
} from "./money";

describe("toCents", () => {
  it("parse les formats français et anglais", () => {
    expect(toCents("1 234,50")).toBe(123450);
    expect(toCents("1234.5")).toBe(123450);
    expect(toCents("12")).toBe(1200);
    expect(toCents("1 234,50")).toBe(123450);
  });
  it("rejette les entrées invalides", () => {
    expect(toCents("0,005")).toBeNull();
    expect(toCents("-3")).toBeNull();
    expect(toCents("abc")).toBeNull();
  });
});

describe("lineTotalCents", () => {
  it("multiplie des entiers", () => {
    expect(lineTotalCents(3, 12550)).toBe(37650);
  });
  it("rejette les non-entiers", () => {
    expect(() => lineTotalCents(1.5, 100)).toThrow("invalid_amount");
    expect(() => lineTotalCents(1, 10.5)).toThrow("invalid_amount");
  });
});

describe("quoteTotals", () => {
  it("arrondit l'acompte une fois", () => {
    expect(quoteTotals([{ quantity: 1, unitPriceCents: 100001 }], 30)).toEqual({
      totalCents: 100001,
      depositCents: 30000,
      balanceCents: 70001,
    });
  });
  it("arrondit half-up", () => {
    const t = quoteTotals([{ quantity: 1, unitPriceCents: 5 }], 50);
    expect(t.depositCents).toBe(3);
    expect(t.balanceCents).toBe(2);
  });
  it("bornes 0 et 100", () => {
    const l = [{ quantity: 2, unitPriceCents: 1000 }];
    expect(quoteTotals(l, 0).depositCents).toBe(0);
    expect(quoteTotals(l, 100).balanceCents).toBe(0);
  });
});

describe("formatEuros", () => {
  it("formate avec U+00A0", () => {
    expect(formatEuros(123450)).toBe("1 234,50 €");
    expect(formatEuros(5)).toBe("0,05 €");
    expect(formatEuros(123456789)).toBe("1 234 567,89 €");
  });
  it("jamais de U+202F", () => {
    expect(formatEuros(123456789)).not.toContain(" ");
  });
  it("formatPercent", () => {
    expect(formatPercent(30)).toBe("30 %");
  });
});
