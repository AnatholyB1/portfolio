'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  Circle,
  FileText,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { setStatusAction, type LeadActionState } from '@/app/admin/leads/actions';
import { STATUS_LABELS, STATUS_ORDER, type LeadStatus } from '@/lib/admin/leadLabels';
import LostPanel from './LostPanel';
import './leads.css';

const ICONS: Record<LeadStatus, LucideIcon> = {
  new: Circle,
  qualified: CheckCircle2,
  rdv: CalendarCheck,
  quote_sent: FileText,
  signed: BadgeCheck,
  lost: XCircle,
};

const INITIAL: LeadActionState = { status: 'idle' };

// Pastille de statut interactive (UI-SPEC A1). Réutilisée par la page détail.
export default function StatusPill({ leadId, status }: { leadId: string; status: string }) {
  const current = (STATUS_ORDER as readonly string[]).includes(status)
    ? (status as LeadStatus)
    : 'new';
  const [lostOpen, setLostOpen] = useState(false);
  const [state, formAction, pending] = useActionState(setStatusAction, INITIAL);
  // Le menu est « ouvert » tant que l'état d'action n'a pas changé : un résultat le referme.
  const [openedAt, setOpenedAt] = useState<LeadActionState | null>(null);
  const open = openedAt === state;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(open) : v;
    setOpenedAt(next ? state : null);
  };
  const pillRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const Icon = ICONS[current];

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open]);

  function closeMenu() {
    setOpen(false);
    pillRef.current?.focus();
  }

  function onMenuKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    }
  }

  return (
    <div className="pt-lead-pill-wrap">
      <button
        ref={pillRef}
        type="button"
        className="pt-lead-pill"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
      >
        {pending ? (
          'Enregistrement...'
        ) : (
          <>
            {current === 'signed' ? <span className="pt-lead-dot" aria-hidden="true" /> : null}
            <Icon size={16} aria-hidden="true" />
            <span className={current === 'lost' ? 'pt-lead-dim' : undefined}>
              {STATUS_LABELS[current]}
            </span>
          </>
        )}
      </button>
      {open ? (
        <div ref={menuRef} className="pt-lead-pill-menu" role="menu" onKeyDown={onMenuKey}>
          {STATUS_ORDER.filter((s) => s !== current).map((s) =>
            s === 'lost' ? (
              <button
                key={s}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setLostOpen(true);
                }}
              >
                {STATUS_LABELS[s]}
              </button>
            ) : (
              <form key={s} action={formAction}>
                <input type="hidden" name="leadId" value={leadId} />
                <input type="hidden" name="status" value={s} />
                <button type="submit" role="menuitem">
                  {STATUS_LABELS[s]}
                  {s === 'quote_sent' ? <span className="pt-lead-badge">Manuel</span> : null}
                </button>
              </form>
            ),
          )}
        </div>
      ) : null}
      <div className="pt-sr-only" aria-live="polite">
        {state.status !== 'idle' ? state.message : ''}
      </div>
      {state.status === 'error' ? <p className="pt-error">{state.message}</p> : null}
      {lostOpen ? (
        <LostPanel
          leadId={leadId}
          onClose={() => {
            setLostOpen(false);
            pillRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
