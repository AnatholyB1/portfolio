import { useSyncExternalStore } from 'react';

type Snapshot = { open: boolean; introDone: boolean };

let state: Snapshot = { open: false, introDone: false };
const SERVER: Snapshot = { open: false, introDone: false };
const listeners = new Set<() => void>();

function set(patch: Partial<Snapshot>) {
  const next = { ...state, ...patch };
  if (next.open === state.open && next.introDone === state.introDone) return;
  state = next;
  listeners.forEach((l) => l());
}

export function openConsent(): void {
  set({ open: true });
}
export function closeConsent(): void {
  set({ open: false });
}
export function markIntroDone(): void {
  set({ introDone: true });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useConsentStore(): Snapshot {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}
