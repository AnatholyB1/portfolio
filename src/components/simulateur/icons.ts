// src/components/simulateur/icons.ts
//
// The ONLY file that couples the pure data in src/lib/simulateur/questions.ts
// (which imports nothing from React/lucide on purpose) to real lucide-react
// components. questions.ts references icons by string name; this table
// resolves that name at render time in Wizard.tsx. A name with no entry
// here is a no-op (no icon shown), never a crash — see icons.test.ts for
// the regression guard that keeps this table in sync with questions.ts.

import {
  Store,
  UtensilsCrossed,
  HardHat,
  Briefcase,
  HeartPulse,
  MoreHorizontal,
  PhoneMissed,
  TrendingDown,
  ImageOff,
  Wrench,
  Users,
  Repeat,
  CircleCheck,
  Target,
  TrendingUp,
  Clock,
  Palette,
  Frown,
  Meh,
  Smile,
  PartyPopper,
  Coins,
  Wallet,
  CreditCard,
  Landmark,
  type LucideIcon,
} from 'lucide-react';

export const SIM_ICONS: Record<string, LucideIcon> = {
  Store,
  UtensilsCrossed,
  HardHat,
  Briefcase,
  HeartPulse,
  MoreHorizontal,
  PhoneMissed,
  TrendingDown,
  ImageOff,
  Wrench,
  Users,
  Repeat,
  CircleCheck,
  Target,
  TrendingUp,
  Clock,
  Palette,
  Frown,
  Meh,
  Smile,
  PartyPopper,
  Coins,
  Wallet,
  CreditCard,
  Landmark,
};
