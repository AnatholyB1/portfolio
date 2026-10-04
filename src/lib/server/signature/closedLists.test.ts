import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SIGNATURE_EVENTS } from '@/lib/signature/events';

describe('closed lists parity', () => {
  it('SIGNATURE_EVENTS equals the SQL event_type check list, in order', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261006000000_sv_signature.sql'), 'utf8');
    const m = sql.match(/event_type text not null check \(event_type in \(([^)]*)\)\)/);
    expect(m).not.toBeNull();
    const list = [...m![1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
    expect(list).toEqual([...SIGNATURE_EVENTS]);
  });
});
