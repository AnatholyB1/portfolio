import { describe, it } from 'vitest';
// Wave 0 scaffold, filled by plan 11-14. Helpers are imported lazily by the real tests.
import './helpers';

describe('LEAD-09 consent log', () => {
  it.todo('consent entry is written with the lead and is immutable');
  it.todo('withdrawal appends a new entry, never edits');
});

describe('LEAD-08 funnel view', () => {
  it.todo('funnel view aggregates leads by source for admins only');
  it.todo('funnel view exposes no personal data');
});

describe('LEAD-06 backfill and purge', () => {
  it.todo('backfill attaches legacy leads without altering source');
  it.todo('purge removes only leads past retention on last_contact_at');
});
