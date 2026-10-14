'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
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
import { isOutside, menuNavTarget } from './menuNav';
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = `${useId()}-menu`;

  const Icon = ICONS[current];

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open]);

  // Clic ou toucher hors de la pastille : le menu se ferme, le focus reste là où l'utilisateur a cliqué.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (isOutside(wrapRef.current, e.target)) setOpenedAt(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Après un choix (succès ou erreur), le focus revient à la pastille : le menu qui le portait est démonté.
  useEffect(() => {
    if (state.status !== 'idle') pillRef.current?.focus();
  }, [state]);

  function closeMenu() {
    setOpen(false);
    pillRef.current?.focus();
  }

  function onMenuKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    const target = menuNavTarget(e.key, idx, items.length);
    if (target === null) return;
    e.preventDefault();
    if (target === 'close') closeMenu();
    else items[target]?.focus();
  }

  return (
    <div className="pt-lead-pill-wrap" ref={wrapRef}>
      <button
        ref={pillRef}
        type="button"
        className="pt-lead-pill"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-disabled={pending || undefined}
        onClick={() => {
          if (!pending) setOpen((o) => !o);
        }}
      >
        {pending ? (
          'Enregistrement…'
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
        <div
          ref={menuRef}
          id={menuId}
          className="pt-lead-pill-menu"
          role="menu"
          aria-label="Changer le statut"
          onKeyDown={onMenuKey}
        >
          {STATUS_ORDER.filter((s) => s !== current).map((s) =>
            s === 'lost' ? (
              <button
                key={s}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  setOpen(false);
                  setLostOpen(true);
                }}
              >
                {STATUS_LABELS[s]}
              </button>
            ) : (
              <form key={s} action={formAction} role="none">
                <input type="hidden" name="leadId" value={leadId} />
                <input type="hidden" name="status" value={s} />
                <button type="submit" role="menuitem" tabIndex={-1}>
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
      {/* Texte visible de l'erreur ; l'annonce vocale passe par la région sr-only ci-dessus. */}
      <p className="pt-error">{state.status === 'error' ? state.message : ''}</p>
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
