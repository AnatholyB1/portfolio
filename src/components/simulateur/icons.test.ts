import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '@/lib/simulateur/questions';
import { SIM_ICONS } from './icons';

describe('SIM_ICONS', () => {
  it('resolves every icon name referenced by any QUESTIONS option to a defined component', () => {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        if (option.icon === undefined) continue;
        expect(SIM_ICONS[option.icon], `icon "${option.icon}" on ${question.id}/${option.value}`).toBeDefined();
      }
    }
  });

  it('every SIM_ICONS value is a defined component object (not undefined)', () => {
    for (const [name, Icon] of Object.entries(SIM_ICONS)) {
      expect(typeof Icon, `SIM_ICONS.${name}`).toBe('object');
    }
  });
});
