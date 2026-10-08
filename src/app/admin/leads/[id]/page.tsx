import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RotateCcw, UserPlus } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';
import AttributionCard from '@/components/admin/leads/AttributionCard';
import ConversionsCard from '@/components/admin/leads/ConversionsCard';
import ConvertDialog from '@/components/admin/leads/ConvertDialog';
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
import { OFFER_SLUGS, type OfferSlug } from '@/lib/projects/offers';
import { PROJECT_COPY } from '@/lib/projects/copy';
import {
  conversionLadder,
  loadLeadConversions,
  type ConversionLadder,
} from '@/lib/server/ads/conversions';
import { requireAdmin } from '@/lib/server/auth/dal';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Détail du lead' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Statuts convertibles (D-03) ; l'autorité reste sv_convert_lead (D-04).
const CONVERTIBLE = ['qualified', 'rdv', 'quote_sent', 'signed'] as const;

// Offre pressentie : un slug du dernier contact qui correspond à une offre connue.
function offerFromPayload(payload: unknown): OfferSlug | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  for (const v of Object.values(payload as Record<string, unknown>)) {
    if (typeof v === 'string' && (OFFER_SLUGS as readonly string[]).includes(v)) return v as OfferSlug;
  }
  return undefined;
}

interface LeadDetail {
  id: string;
  status: string;
  source_source: string | null;
  source_medium: string | null;
  source_campaign: string | null;
  source_nonconformity: string[] | null;
  source_raw: unknown;
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
      'id, status, source_source, source_medium, source_campaign, source_nonconformity, source_raw, first_touch, last_touch, previous_lead_id, unseen_return, erased_at, contact_nom, contact_email',
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

  const { data: convData } = await supabase
    .from('sv_leads')
    .select('converted_client_id')
    .eq('id', id)
    .maybeSingle();
  const convertedClientId = (convData as { converted_client_id?: string | null } | null)?.converted_client_id ?? null;
  const { data: projectData } = convertedClientId
    ? await supabase.from('sv_projects').select('id').eq('lead_id', id).limit(1).maybeSingle()
    : { data: null };
  const projectId = (projectData as { id?: string } | null)?.id ?? null;

  let ladder: ConversionLadder | null = null;
  try {
    ladder = conversionLadder(await loadLeadConversions(supabase, id));
  } catch {
    ladder = null;
  }

  const contacts = (contactData ?? []) as unknown as ContactRow[];
  const events = (eventData ?? []) as unknown as EventRow[];
  const notes = (noteData ?? []) as unknown as NoteRow[];
  const previousAt = (previous.data as { created_at?: string } | null)?.created_at ?? null;

  const erased = Boolean(lead.erased_at);
  const isConverted = Boolean(convertedClientId);
  const canConvert =
    !erased && !isConverted && (CONVERTIBLE as readonly string[]).includes(lead.status);
  const latestContact = contacts[contacts.length - 1];
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
              {isConverted ? (
                <>
                  <span className="pt-lead-badge">{PROJECT_COPY.conversion.converted}</span>
                  {projectId ? (
                    <Link href={`/admin/projets/${projectId}`} className="pt-btn-text">
                      {PROJECT_COPY.conversion.viewProject}
                    </Link>
                  ) : null}
                </>
              ) : null}
              {canConvert || (isConverted && !erased) ? (
                <ConvertDialog
                  leadId={lead.id}
                  defaultName={lead.contact_nom ?? ''}
                  defaultEmail={lead.contact_email ?? ''}
                  defaultOffer={offerFromPayload(latestContact?.payload)}
                  converted={isConverted}
                />
              ) : null}
              {!erased && !isConverted && lead.status === 'new' ? (
                <>
                  <button type="button" className="pt-btn-primary" aria-disabled="true">
                    <UserPlus size={16} aria-hidden="true" />
                    {PROJECT_COPY.conversion.trigger}
                  </button>
                  <span className="pt-helper">{PROJECT_COPY.conversion.notYetConvertible}</span>
                </>
              ) : null}
              {!erased && !isConverted && lead.status === 'lost' ? (
                <>
                  <button type="button" className="pt-btn-primary" aria-disabled="true">
                    <UserPlus size={16} aria-hidden="true" />
                    {PROJECT_COPY.conversion.trigger}
                  </button>
                  <span className="pt-helper">{PROJECT_COPY.conversion.reopenFirst}</span>
                </>
              ) : null}
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
              <AttributionCard
                firstTouch={lead.first_touch}
                lastTouch={lead.last_touch}
                nonconformity={lead.source_nonconformity}
              />
              <ConversionsCard ladder={ladder} />
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
