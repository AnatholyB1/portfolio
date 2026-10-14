import { describe, expect, it } from 'vitest';
import { isPageOutOfRange } from './Pager';

describe('isPageOutOfRange', () => {
  it('recognises the PostgREST range error beyond page 1', () => {
    expect(isPageOutOfRange({ code: 'PGRST103', message: 'Requested range not satisfiable' }, 999)).toBe(true);
    expect(isPageOutOfRange({ message: 'Requested range not satisfiable' }, 2)).toBe(true);
  });
  it('never treats a first-page error as out of range', () => {
    expect(isPageOutOfRange({ code: 'PGRST103' }, 1)).toBe(false);
  });
  it('keeps other errors as real failures', () => {
    expect(isPageOutOfRange({ code: '42P01', message: 'relation does not exist' }, 3)).toBe(false);
    expect(isPageOutOfRange(null, 3)).toBe(false);
  });
});
