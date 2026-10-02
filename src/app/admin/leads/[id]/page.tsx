import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';
import AttributionCard from '@/components/admin/leads/AttributionCard';
import CorrectSourceForm from '@/components/admin/leads/CorrectSourceForm';
import EraseLeadForm from '@/components/admin/leads/EraseLeadForm';
import LeadContacts, { type ContactRow } from '@/components/admin/leads/LeadContacts';
import LeadJournal, { type EventRow, type NoteRow } from '@/components/admin/leads/LeadJournal';
import MarkReturnSeen from '@/components/admin/leads/MarkReturnSeen';
import StatusPill from '@/components/admin/leads/StatusPill';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { formatDateFr } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/server/auth/dal';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Détail du lead' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface LeadDetail {
  id: string;
  status: string;
  source_source: string | null;
  source_medium: string | null;
  source_campaign: string | null;
  first_touch: unknown;
  last_touch: unknown;
  previous_lead_id: string | null;
  unseen_return: boolean | null;
  erased_at: string | null;
  contact_nom: string | null;
  contact_email: string | null;
}

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { data: leadData } = await supabase
    .from('sv_leads_admin_v')
    .select(
      'id, status, source_source, source_medium, source_campaign, first_touch, last_touch, previous_lead_id, unseen_return, erased_at, contact_nom, contact_email',
    )
    .eq('id', id)
    .maybeSingle();
  if (!leadData) notFound();
  const lead = leadData as unknown as LeadDetail;

  const [{ data: contactData }, { data: eventData }, { data: noteData }, previous] = await Promise.all([
    supabase
      .from('sv_lead_contacts')
      .select('id, channel, nom, email, telephone, payload, consent, created_at')
      .eq('lead_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('sv_lead_events')
      .select('id, type, actor, from_status, to_status, reason_code, detail, created_at')
      .eq('lead_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('sv_lead_notes').select('event_id, body').eq('lead_id', id),
    lead.previous_lead_id
      ? supabase.from('sv_leads').select('created_at').eq('id', lead.previous_lead_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const contacts = (contactData ?? []) as unknown as ContactRow[];
  const events = (eventData ?? []) as unknown as EventRow[];
  const notes = (noteData ?? []) as unknown as NoteRow[];
  const previousAt = (previous.data as { created_at?: string } | null)?.created_at ?? null;

  const erased = Boolean(lead.erased_at);
  const erasedEvent = events.find((e) => e.type === 'erased');
  const erasedAt = lead.erased_at ?? erasedEvent?.created_at ?? null;
  const name = erased ? 'Effacé' : lead.contact_nom || lead.contact_email || 'Lead';
  const sourceLine = `Source figée : ${lead.source_source ?? ''} / ${lead.source_medium ?? ''}${
    lead.source_campaign ? ` / ${lead.source_campaign}` : ''
  }`;

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <AdminNav current="leads" />
          <Link href="/admin/leads" className="pt-btn-text">
            Retour aux leads
          </Link>
          {lead.unseen_return ? <MarkReturnSeen leadId={lead.id} /> : null}
          <header>
            <div className="pt-lead-header">
              <h1 className="pt-heading">{name}</h1>
              <StatusPill leadId={lead.id} status={lead.status} />
              {lead.unseen_return ? (
                <span className="pt-lead-badge">
                  <RotateCcw size={14} aria-hidden="true" />
                  Revenu
                </span>
              ) : null}
              {lead.previous_lead_id ? (
                <Link href={`/admin/leads/${lead.previous_lead_id}`} className="pt-lead-badge">
                  Lead précédent : {formatDateFr(previousAt)}
                </Link>
              ) : null}
            </div>
            <p className="pt-helper">{sourceLine}</p>
            {erased ? (
              <p className="pt-warn">Données personnelles effacées le {formatDateFr(erasedAt)}</p>
            ) : null}
          </header>
          <div className="pt-lead-grid">
            <div className="pt-lead-main">
              <LeadContacts contacts={contacts} erased={erased} />
              <LeadJournal events={events} notes={notes} />
            </div>
            <div className="pt-lead-side">
              <AttributionCard firstTouch={lead.first_touch} lastTouch={lead.last_touch} />
              {erased ? null : (
                <>
                  <CorrectSourceForm
                    leadId={lead.id}
                    source={lead.source_source ?? ''}
                    medium={lead.source_medium ?? ''}
                    campaign={lead.source_campaign ?? ''}
                  />
                  <EraseLeadForm
                    leadId={lead.id}
                    nom={lead.contact_nom ?? ''}
                    email={lead.contact_email ?? ''}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
