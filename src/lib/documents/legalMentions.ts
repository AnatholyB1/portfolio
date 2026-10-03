// Module pur (aucun import unpdf). Liste des mentions obligatoires vérifiées sur le texte
// extrait des PDF rendus (D-13, DOC-04). Construite depuis le snapshot : ce sont les vraies
// valeurs du vendeur qui sont contrôlées.
import { formatDateLongFr } from "./dates";
import { formatEuros } from "./money";
import { normalizeText } from "./text";
import {
  DISCOUNT_TEXT,
  RECOVERY_INDEMNITY_TEXT,
  VAT_FRANCHISE_MENTION,
  latePenaltyText,
} from "./seller";
import type { InvoiceSnapshot, QuoteSnapshot, SellerIdentity } from "./types";
import { formatAddress } from "./addressFormat";

export type Mention = {
  id: string;
  label: string;
  /** Reçoit un texte déjà normalisé. */
  test: (normalizedText: string) => boolean;
  /** Retire du texte normalisé toute occurrence du texte reconnu (test de non-vacuité). */
  strip: (normalizedText: string) => string;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternFor(needle: string): string {
  const n = normalizeText(needle);
  const compact = n.replace(/\s/g, "");
  // SIRET, SIREN : le texte imprimé est groupé par espaces.
  if (/^\d{9,}$/.test(compact)) return compact.split("").join("\\s*");
  return escapeRegExp(n).replace(/ /g, "\\s+");
}

/** Mention satisfaite quand tous les fragments sont présents (insensible à la casse). */
export function includesCi(...needles: string[]): Pick<Mention, "test" | "strip"> {
  const patterns = needles.map(patternFor);
  return {
    test: (t) => patterns.every((p) => new RegExp(p, "i").test(t)),
    strip: (t) => patterns.reduce((acc, p) => acc.replace(new RegExp(p, "gi"), ""), t),
  };
}

export function digitsIncluded(digits: string): Pick<Mention, "test" | "strip"> {
  const compact = digits.replace(/\s/g, "");
  // Valeur non numérique (placeholder « À COMPLÉTER ») : comparée telle quelle.
  return includesCi(/^\d+$/.test(compact) ? compact : digits);
}

/** Fragments dans l'ordre exact de lecture d'une ligne de tableau. */
function sequence(...parts: string[]): Pick<Mention, "test" | "strip"> {
  const p = parts.map(patternFor).join("\\s+");
  return {
    test: (t) => new RegExp(p, "i").test(t),
    strip: (t) => t.replace(new RegExp(p, "gi"), ""),
  };
}

function m(id: string, label: string, impl: Pick<Mention, "test" | "strip">): Mention {
  return { id, label, ...impl };
}

function sellerMentions(seller: SellerIdentity): Mention[] {
  const list: Mention[] = [
    m("seller_name", "Identité du vendeur", includesCi(seller.legalName)),
  ];
  if (seller.showEiMention) {
    list.push({
      id: "seller_ei",
      label: "Mention EI",
      test: (t) => /\bEI\b|entrepreneur individuel/i.test(t),
      strip: (t) => t.replace(/\bEI\b|entrepreneur individuel/gi, ""),
    });
  }
  list.push(
    m("seller_siret", "SIRET du vendeur", digitsIncluded(seller.siret)),
    m("seller_address", "Adresse du vendeur", includesCi(formatAddress(seller.address))),
    m("seller_registration", "RM / RCS", includesCi(seller.registration)),
    m("vat_293b", "TVA non applicable, art. 293 B", includesCi(VAT_FRANCHISE_MENTION)),
  );
  return list;
}

function conditionMentions(seller: SellerIdentity): Mention[] {
  return [
    m("payment_terms", "Conditions de règlement", includesCi(seller.paymentTermsText)),
    m("late_penalties", "Pénalités de retard", includesCi(latePenaltyText(seller))),
    m("recovery_40", "Indemnité de recouvrement 40 €", includesCi(RECOVERY_INDEMNITY_TEXT)),
    m("discount", "Escompte", includesCi(DISCOUNT_TEXT)),
  ];
}

function clientMentions(s: QuoteSnapshot | InvoiceSnapshot): Mention[] {
  const c = s.client;
  const list: Mention[] = [
    m("client_name", "Identité du client", includesCi(c.name)),
    m("client_siren", "SIREN du client", digitsIncluded(c.siren)),
  ];
  if (c.address) list.push(m("client_address", "Adresse du client", includesCi(formatAddress(c.address))));
  if (c.billingDiffers && c.billingAddress) {
    list.push(
      m(
        "billing_address",
        "Adresse de facturation",
        includesCi("Adresse de facturation", formatAddress(c.billingAddress)),
      ),
    );
  }
  if (c.vatStatus === "number" && c.vatNumber) {
    list.push(m("client_vat_number", "TVA intracommunautaire du client", includesCi(c.vatNumber)));
  }
  return list;
}

function lineMentions(lines: QuoteSnapshot["lines"]): Mention[] {
  const list: Mention[] = [];
  lines.forEach((l, i) => {
    list.push(
      m(`designation_${i}`, `Désignation ligne ${i + 1}`, includesCi(l.designation)),
      m(
        `quantity_${i}`,
        `Quantité ligne ${i + 1}`,
        sequence(l.designation, String(l.quantity), formatEuros(l.unitPriceCents)),
      ),
      m(`unit_price_${i}`, `Prix unitaire ligne ${i + 1}`, includesCi(formatEuros(l.unitPriceCents))),
    );
  });
  return list;
}

export function quoteMentions(s: QuoteSnapshot): Mention[] {
  return [
    ...sellerMentions(s.seller),
    m("quote_date", "Date du devis", includesCi("Date du devis", formatDateLongFr(s.issuedOn))),
    m("validity", "Durée de validité", includesCi("Valable jusqu'au", formatDateLongFr(s.validUntil))),
    ...clientMentions(s),
    ...lineMentions(s.lines),
    m("total_ht", "Total HT", includesCi("Total HT", formatEuros(s.totalCents))),
    m("total_ttc", "Total TTC", includesCi("Total TTC", formatEuros(s.totalCents))),
    m("deposit", "Acompte", includesCi("Acompte à la commande", formatEuros(s.depositCents))),
    ...conditionMentions(s.seller),
    m("lead_time", "Délai de réalisation", includesCi(s.leadTime)),
  ];
}

export function invoiceMentions(s: InvoiceSnapshot): Mention[] {
  const list: Mention[] = [
    m("invoice_number", "Numéro (PROFORMA)", includesCi("PROFORMA")),
    m("issue_date", "Date d'émission", includesCi("Date d'émission", formatDateLongFr(s.issuedOn))),
    m("service_date", "Date de la prestation", includesCi("Date de la prestation", formatDateLongFr(s.serviceDate))),
    m("due_date", "Date d'échéance", includesCi("Date d'échéance", formatDateLongFr(s.dueDate))),
    m("operation_nature", "Nature de l'opération", includesCi("Prestation de services")),
    ...sellerMentions(s.seller),
    ...clientMentions(s),
  ];
  if (s.deliveryAddress) {
    list.push(
      m(
        "delivery_address",
        "Adresse de livraison",
        includesCi("Adresse de livraison", formatAddress(s.deliveryAddress)),
      ),
    );
  }
  list.push(
    ...lineMentions(s.lines),
    m("total_ht", "Total HT", includesCi("Total HT", formatEuros(s.totalCents))),
    m("total_ttc", "Total TTC", includesCi("Total TTC", formatEuros(s.totalCents))),
    m("net_to_pay", "Net à payer", includesCi("Net à payer", formatEuros(s.netToPayCents))),
    ...conditionMentions(s.seller),
    m("seller_iban", "IBAN du vendeur", includesCi(s.seller.iban)),
  );
  return list;
}

export function findMissingMentions(text: string, mentions: Mention[]): string[] {
  const normalized = normalizeText(text);
  return mentions.filter((x) => !x.test(normalized)).map((x) => x.id);
}
