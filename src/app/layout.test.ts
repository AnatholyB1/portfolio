import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read as source text — do NOT import layout.tsx directly. It is a Server
// Component with next/font imports that will not resolve under
// `environment: 'node'` (vitest.config.ts); the source-string read is the
// established pattern (see src/data/services.test.ts).
const layoutSource = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');

describe('global JSON-LD (PRIX-01)', () => {
  it('PRIX-01: does not declare a priceRange field anywhere in the source (D-09)', () => {
    expect(layoutSource).not.toContain('priceRange');
  });

  it('the ProfessionalService JSON-LD block survives intact otherwise', () => {
    expect(layoutSource).toContain('"ProfessionalService"');
    expect(layoutSource).toContain('areaServed');
    expect(layoutSource).toContain('openingHours');
  });
});
