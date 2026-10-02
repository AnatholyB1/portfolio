import { describe, it } from 'vitest';
// Wave 0 scaffold, filled by plan 11-10. Helpers are imported lazily by the real tests.
import './helpers';

describe('LEAD-02 source frozen', () => {
  it.todo('source columns cannot be updated after insert (sv_source_frozen)');
  it.todo('created_at cannot be modified');
});

describe('LEAD-03 journal immutable + erase', () => {
  it.todo('sv_lead_events rejects update and delete');
  it.todo('erase tombstones the lead and scrubs personal data, journal intact');
});

describe('LEAD-04 dedupe 9 months', () => {
  it.todo('same e-mail within 9 months returns is_return=true and previous_lead_id');
  it.todo('same e-mail after 9 months creates a fresh lead');
});

describe('LEAD-07 status RPC', () => {
  it.todo('admin can change status through the RPC and an event is journaled');
  it.todo('non-admin cannot change status');
});

describe('admin read access', () => {
  it.todo('admin reads the leads view, client member and anon do not');
});
