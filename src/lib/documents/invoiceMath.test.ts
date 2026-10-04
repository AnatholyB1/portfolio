import { describe, expect, it } from "vitest";
import {
  billingSummary,
  creditNoteMax,
  depositInvoiceAmounts,
  finalInvoiceAmounts,
  linesTotal,
  mulMilli,
  parseDaysToMilli,
  periodInvoiceAmounts,
} from "./invoiceMath";

const NB = " ";

describe("mulMilli", () => {
  it("multiplie des millièmes par des centimes avec arrondi demi supérieur", () => {
    expect(mulMilli(1500, 45000)).toBe(67500);
    expect(mulMilli(500, 333)).toBe(167);
  });
  it("rejette les entrées non entières", () => {
    expect(() => mulMilli(1.5, 100)).toThrow("invalid_amount");
    expect(() => mulMilli(1000, 10.5)).toThrow("invalid_amount");
    expect(() => mulMilli(Number.MAX_SAFE_INTEGER, 2)).toThrow("invalid_amount");
  });
});

describe("parseDaysToMilli", () => {
  it("accepte les pas de 0,5 jour", () => {
    expect(parseDaysToMilli("1,5")).toBe(1500);
    expect(parseDaysToMilli("0,5")).toBe(500);
    expect(parseDaysToMilli("2")).toBe(2000);
    expect(parseDaysToMilli("1.5")).toBe(1500);
  });
  it("refuse le reste", () => {
    expect(parseDaysToMilli("0,25")).toBeNull();
    expect(parseDaysToMilli("0")).toBeNull();
    expect(parseDaysToMilli("abc")).toBeNull();
    expect(parseDaysToMilli("-1")).toBeNull();
  });
});

describe("linesTotal", () => {
  it("somme les totaux de ligne", () => {
    expect(linesTotal([{ totalCents: 100 }, { totalCents: 250 }])).toBe(350);
  });
});

describe("depositInvoiceAmounts", () => {
  it("facture l'acompte figé du devis", () => {
    const r = depositInvoiceAmounts({
      reference: "DEV-2026-ABCD1234-1",
      depositPercent: 30,
      depositCents: 360000,
    });
    expect(r.lines).toEqual([
      {
        designation: `Acompte de 30${NB}% sur le devis DEV-2026-ABCD1234-1`,
        quantityMilli: 1000,
        unitCode: "C62",
        unitPriceCents: 360000,
        totalCents: 360000,
      },
    ]);
    expect(r.totalExclTaxCents).toBe(360000);
    expect(r.prepaidCents).toBe(0);
    expect(r.netToPayCents).toBe(360000);
    expect(r.deductions).toEqual([]);
  });
  it("refuse un acompte nul", () => {
    expect(() =>
      depositInvoiceAmounts({ reference: "DEV-1", depositPercent: 0, depositCents: 0 }),
    ).toThrow("nothing_to_invoice");
  });
});

const deposit = {
  invoiceId: "11111111-1111-4111-8111-111111111111",
  number: "FA-2026-0001",
  date: "2026-10-15",
  amountCents: 360000,
};

describe("finalInvoiceAmounts", () => {
  const quoteLines = [
    { designation: "Maquette", quantity: 1, unitPriceCents: 200000 },
    { designation: "Développement", quantity: 4, unitPriceCents: 250000 },
  ];

  it("copie les lignes du devis et déduit l'acompte", () => {
    const r = finalInvoiceAmounts({
      quoteReference: "DEV-1",
      quoteTotalCents: 1200000,
      quoteLines,
      periodInvoices: [],
      deposit,
    });
    expect(r.lines).toHaveLength(2);
    expect(r.lines[1]).toEqual({
      designation: "Développement",
      quantityMilli: 4000,
      unitCode: "C62",
      unitPriceCents: 250000,
      totalCents: 1000000,
    });
    expect(r.totalExclTaxCents).toBe(1200000);
    expect(r.deductions).toEqual([
      {
        label: "Acompte déjà versé (facture FA-2026-0001)",
        invoiceId: deposit.invoiceId,
        invoiceNumber: "FA-2026-0001",
        invoiceDate: "2026-10-15",
        amountCents: 360000,
      },
    ]);
    expect(r.prepaidCents).toBe(360000);
    expect(r.netToPayCents).toBe(840000);
  });

  it("n'affiche pas les factures de période en déduction mais réduit le reliquat", () => {
    const r = finalInvoiceAmounts({
      quoteReference: "DEV-1",
      quoteTotalCents: 1200000,
      quoteLines,
      periodInvoices: [
        { number: "FA-2026-0002", billedCents: 300000 },
        { number: "FA-2026-0003", billedCents: 200000 },
      ],
      deposit,
    });
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].designation).toBe(
      "Reliquat du devis DEV-1, hors factures de période FA-2026-0002, FA-2026-0003",
    );
    expect(r.lines[0].totalCents).toBe(700000);
    expect(r.totalExclTaxCents).toBe(700000);
    expect(r.deductions).toHaveLength(1);
    expect(r.prepaidCents).toBe(360000);
    expect(r.netToPayCents).toBe(340000);
  });

  it("refuse une sur-facturation", () => {
    expect(() =>
      finalInvoiceAmounts({
        quoteReference: "DEV-1",
        quoteTotalCents: 1200000,
        quoteLines,
        periodInvoices: [{ number: "FA-2026-0002", billedCents: 900000 }],
        deposit,
      }),
    ).toThrow("over_invoiced");
  });

  it("refuse un net nul", () => {
    expect(() =>
      finalInvoiceAmounts({
        quoteReference: "DEV-1",
        quoteTotalCents: 1200000,
        quoteLines,
        periodInvoices: [{ number: "FA-2026-0002", billedCents: 840000 }],
        deposit,
      }),
    ).toThrow("nothing_to_invoice");
  });
});

describe("periodInvoiceAmounts", () => {
  it("construit des lignes en jours", () => {
    const r = periodInvoiceAmounts([
      { designation: "Développement", quantityMilli: 1500, unitPriceCents: 45000 },
      { designation: "Recette", quantityMilli: 500, unitPriceCents: 45000 },
    ]);
    expect(r.lines.map((l) => l.unitCode)).toEqual(["DAY", "DAY"]);
    expect(r.lines.map((l) => l.totalCents)).toEqual([67500, 22500]);
    expect(r.totalExclTaxCents).toBe(90000);
    expect(r.netToPayCents).toBe(90000);
    expect(r.prepaidCents).toBe(0);
  });
  it("refuse zéro ou plus de 30 lignes", () => {
    expect(() => periodInvoiceAmounts([])).toThrow("invalid_lines");
    const many = Array.from({ length: 31 }, () => ({
      designation: "x",
      quantityMilli: 1000,
      unitPriceCents: 100,
    }));
    expect(() => periodInvoiceAmounts(many)).toThrow("invalid_lines");
  });
  it("refuse un total nul", () => {
    expect(() =>
      periodInvoiceAmounts([{ designation: "x", quantityMilli: 1000, unitPriceCents: 0 }]),
    ).toThrow("nothing_to_invoice");
  });
});

describe("creditNoteMax", () => {
  it("plafonne au total moins les avoirs précédents", () => {
    expect(creditNoteMax(360000, 100000)).toBe(260000);
    expect(creditNoteMax(360000, 360000)).toBe(0);
    expect(creditNoteMax(360000, 400000)).toBe(0);
  });
});

describe("billingSummary", () => {
  it("synthétise le facturé et l'encaissé", () => {
    const s = billingSummary(1200000, 30, [
      { netToPayCents: 360000, creditedCents: 0, status: "paid" },
      { netToPayCents: 500000, creditedCents: 100000, status: "to_pay" },
    ]);
    expect(s).toEqual({
      quoteTotalCents: 1200000,
      depositPercent: 30,
      invoicedCents: 760000,
      collectedCents: 360000,
      remainingToInvoiceCents: 440000,
    });
  });
  it("ne descend pas sous zéro", () => {
    const s = billingSummary(100, 30, [{ netToPayCents: 500, creditedCents: 0, status: "to_pay" }]);
    expect(s.remainingToInvoiceCents).toBe(0);
  });
});
