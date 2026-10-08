import { describe, it, expect } from 'vitest';
import { v5, v4 as uuidv4, validate, version } from 'uuid';
import {
  EVENT_NAMES,
  CONVERSION_EVENTS,
  TRACKING_EVENTS,
  JOURNAL_EVENT_NAMES,
  PRE_LEAD_EVENTS,
  CONVERSION_RANKS,
  STATUS_TO_CONVERSION,
  RANK_LABELS,
  TRACKING_LABELS,
  EVENT_NAMESPACE,
  eventIdFor,
  newPreLeadEventId,
  isEventName,
} from './events';

const LEAD = '00000000-0000-4000-8000-000000000001';

describe('event taxonomy', () => {
  it('is a closed list of 9 snake_case names without duplicates', () => {
    expect(EVENT_NAMES).toHaveLength(9);
    expect(new Set(EVENT_NAMES).size).toBe(9);
    for (const n of EVENT_NAMES) expect(n).toMatch(/^[a-z]+(_[a-z]+)*$/);
  });

  it('conversion and tracking events partition EVENT_NAMES', () => {
    const union = [...CONVERSION_EVENTS, ...TRACKING_EVENTS];
    expect(union).toHaveLength(EVENT_NAMES.length);
    expect(new Set(union)).toEqual(new Set(EVENT_NAMES));
    for (const c of CONVERSION_EVENTS) {
      expect((TRACKING_EVENTS as readonly string[]).includes(c)).toBe(false);
    }
  });

  it('journal names = conversions + quote_sent + lead_lost; disjoint from pre-lead', () => {
    expect(new Set(JOURNAL_EVENT_NAMES)).toEqual(
      new Set([...CONVERSION_EVENTS, 'quote_sent', 'lead_lost']),
    );
    for (const p of PRE_LEAD_EVENTS) {
      expect((JOURNAL_EVENT_NAMES as readonly string[]).includes(p)).toBe(false);
    }
  });

  it('ranks are exactly 1..4 and status mapping is complete', () => {
    expect(Object.values(CONVERSION_RANKS).sort()).toEqual([1, 2, 3, 4]);
    expect(CONVERSION_RANKS).toEqual({
      lead_submitted: 1,
      lead_qualified: 2,
      rdv_booked: 3,
      deal_signed: 4,
    });
    expect(STATUS_TO_CONVERSION).toEqual({
      new: 'lead_submitted',
      qualified: 'lead_qualified',
      rdv: 'rdv_booked',
      signed: 'deal_signed',
    });
    expect(Object.keys(STATUS_TO_CONVERSION)).not.toContain('lost');
    expect(RANK_LABELS).toEqual({ 1: 'Lead', 2: 'Qualifié', 3: 'RDV', 4: 'Signé' });
    expect(TRACKING_LABELS).toEqual({ quote_sent: 'Devis envoyé', lead_lost: 'Perdu' });
  });

  it('isEventName guards the closed list', () => {
    expect(isEventName('lead_submitted')).toBe(true);
    expect(isEventName('Lead')).toBe(false);
    expect(isEventName(42)).toBe(false);
  });
});

describe('eventIdFor', () => {
  const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  it('library sanity (RFC) and namespace derivation', () => {
    expect(v5('www.example.com', DNS)).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
    expect(v5('events.sevalys.com', DNS)).toBe(EVENT_NAMESPACE);
    expect(EVENT_NAMESPACE).toBe('87713031-3054-582f-9073-0aa58d13d20e');
  });

  it('matches the golden vectors', () => {
    expect(eventIdFor(LEAD, 'lead_submitted')).toBe('c2906e05-76be-58a0-b812-a56ec50f0a76');
    expect(eventIdFor(LEAD, 'lead_qualified')).toBe('a6eea051-67cc-5426-a5f4-3cfe42b634c7');
    expect(eventIdFor(LEAD, 'rdv_booked')).toBe('dbc33dff-f805-5098-82ee-06071ccc0a32');
    expect(eventIdFor(LEAD, 'quote_sent')).toBe('e3cb76b7-1733-5f50-a6aa-c53abf85acf9');
    expect(eventIdFor(LEAD, 'deal_signed')).toBe('676b6c72-43dd-5ea6-bcb0-cc0ba4bdeeaa');
    expect(eventIdFor(LEAD, 'lead_lost', 42)).toBe('a11b17e6-db8d-5925-aebf-d1602f61825f');
  });

  it('is case-insensitive on the lead id and deterministic', () => {
    expect(eventIdFor(LEAD.toUpperCase(), 'lead_submitted')).toBe(
      eventIdFor(LEAD, 'lead_submitted'),
    );
    expect(eventIdFor(LEAD, 'rdv_booked')).toBe(eventIdFor(LEAD, 'rdv_booked'));
  });

  it('lead_lost requires a source event id', () => {
    expect(() => eventIdFor(LEAD, 'lead_lost')).toThrow();
  });
});

describe('newPreLeadEventId', () => {
  it('returns distinct v4 uuids', () => {
    const a = newPreLeadEventId();
    const b = newPreLeadEventId();
    expect(validate(a)).toBe(true);
    expect(version(a)).toBe(4);
    expect(a).not.toBe(b);
    expect(validate(uuidv4())).toBe(true);
  });
});
