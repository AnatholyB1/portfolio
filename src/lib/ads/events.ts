// Closed event taxonomy, conversion ladder and deterministic event ids (ADS-02).
//
// - Closed list (D-06): snake_case names, journalled server-side only.
// - Nothing is sent to Meta or Google in this phase (D-07). ADS-04 will later
//   map lead_submitted -> Lead and deal_signed -> Purchase and reuse event_id
//   as Meta event_id and Google transaction_id.
// - No PII in ids (D-08): the hashed name is lead uuid + event name only.
// - Pre-lead events (page view, simulator) get random ids (D-10).
// - Pure module: runs in browser, proxy and server. Only `uuid` is imported.

import { v5 } from 'uuid';

export const EVENT_NAMES = [
  'page_view_attributed',
  'simulator_started',
  'simulator_completed',
  'lead_submitted',
  'lead_qualified',
  'rdv_booked',
  'quote_sent',
  'deal_signed',
  'lead_lost',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export const CONVERSION_EVENTS = [
  'lead_submitted',
  'lead_qualified',
  'rdv_booked',
  'deal_signed',
] as const;
export type ConversionEvent = (typeof CONVERSION_EVENTS)[number];

export const TRACKING_EVENTS = [
  'page_view_attributed',
  'simulator_started',
  'simulator_completed',
  'quote_sent',
  'lead_lost',
] as const;

export const PRE_LEAD_EVENTS = [
  'page_view_attributed',
  'simulator_started',
  'simulator_completed',
] as const;

export const JOURNAL_EVENT_NAMES = [
  'lead_submitted',
  'lead_qualified',
  'rdv_booked',
  'quote_sent',
  'deal_signed',
  'lead_lost',
] as const;
export type JournalEventName = (typeof JOURNAL_EVENT_NAMES)[number];

export const CONVERSION_RANKS: Readonly<Record<ConversionEvent, 1 | 2 | 3 | 4>> = {
  lead_submitted: 1,
  lead_qualified: 2,
  rdv_booked: 3,
  deal_signed: 4,
};

export const STATUS_TO_CONVERSION = {
  new: 'lead_submitted',
  qualified: 'lead_qualified',
  rdv: 'rdv_booked',
  signed: 'deal_signed',
} as const satisfies Readonly<Record<string, ConversionEvent>>;

export const RANK_LABELS: Readonly<Record<1 | 2 | 3 | 4, string>> = {
  1: 'Lead',
  2: 'Qualifié',
  3: 'RDV',
  4: 'Signé',
};

export const TRACKING_LABELS = {
  quote_sent: 'Devis envoyé',
  lead_lost: 'Perdu',
} as const;

// uuidv5('events.sevalys.com', DNS namespace). Frozen once used.
export const EVENT_NAMESPACE = '87713031-3054-582f-9073-0aa58d13d20e';

export function eventIdFor(
  leadId: string,
  eventName: JournalEventName,
  sourceEventId?: number | string,
): string {
  const lead = leadId.toLowerCase();
  if (eventName === 'lead_lost') {
    if (sourceEventId === undefined || sourceEventId === null || sourceEventId === '') {
      throw new Error('eventIdFor: sourceEventId is required for lead_lost');
    }
    return v5(`${lead}:lead_lost:${sourceEventId}`, EVENT_NAMESPACE);
  }
  return v5(`${lead}:${eventName}`, EVENT_NAMESPACE);
}

export function newPreLeadEventId(): string {
  return globalThis.crypto.randomUUID();
}

export function isEventName(x: unknown): x is EventName {
  return typeof x === 'string' && (EVENT_NAMES as readonly string[]).includes(x);
}
