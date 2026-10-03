import { Check, ExternalLink } from 'lucide-react';
import { EM_DASH, formatDateFr, formatSiret } from '@/lib/admin/format';
import { daysSince } from '@/lib/projects/blocking';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { OFFER_LABELS, type OfferSlug } from '@/lib/projects/offers';
import { ONBOARDING_BLOCKS, blockCompletion, type OnboardingBlock, type OnboardingRow } from '@/lib/projects/onboardingSchema';
import type { ClientInfo, ConsentRow, LinkRow, ProjectSummary } from '@/lib/server/projects/read';
import LinkForm from './LinkForm';
import '../leads/leads.css';

const BLOCK_LABELS: Record<OnboardingBlock, string> = {
  societe: 'Société',
  signataire: 'Signataire',
  contact: 'Contact projet',
  facturation: 'Facturation',
  projet: 'Projet',
};

function companyName(c: ClientInfo): string {
  const nom = (c.company as { nom?: unknown } | null)?.nom;
  return typeof nom === 'string' && nom.trim() ? nom : c.name || EM_DASH;
}

export function InfoCard({
  client,
  project,
  onboarding,
  lastActivityAt,
  now,
}: {
  client: ClientInfo;
  project: ProjectSummary;
  onboarding: OnboardingRow | null;
  lastActivityAt: string;
  now: Date;
}) {
  const contact =
    onboarding?.projectContactName?.trim() || onboarding?.signatoryName?.trim() || EM_DASH;
  return (
    <section className="pt-card" aria-labelledby="proj-info-title">
      <h2 id="proj-info-title" className="pt-heading">
        Informations
      </h2>
      <dl className="pt-summary">
        <dt>Client</dt>
        <dd>{companyName(client)}</dd>
        <dt>SIRET</dt>
        <dd>{formatSiret(client.siret)}</dd>
        <dt>Offre</dt>
        <dd>{OFFER_LABELS[project.offer as OfferSlug] ?? project.offer}</dd>
        <dt>Titre du projet</dt>
        <dd>{project.title}</dd>
        <dt>Début</dt>
        <dd>{formatDateFr(project.startedAt)}</dd>
        <dt>Contact</dt>
        <dd>{contact}</dd>
      </dl>
      <p className="pt-lead-sub">
        Dernière activité : {formatDateFr(lastActivityAt)} ({daysSince(lastActivityAt, now)} j)
      </p>
    </section>
  );
}

function blockValue(block: OnboardingBlock, o: OnboardingRow): string {
  switch (block) {
    case 'societe':
      return o.companyConfirmedAt ? `Confirmée le ${formatDateFr(o.companyConfirmedAt)}` : EM_DASH;
    case 'signataire':
      return [o.signatoryName, o.signatoryRole].filter(Boolean).join(', ') || EM_DASH;
    case 'contact':
      return [o.projectContactName, o.projectContactEmail, o.projectContactPhone].filter(Boolean).join(', ') || EM_DASH;
    case 'facturation': {
      const vat =
        o.vatStatus === 'number' ? `TVA ${o.vatNumber ?? ''}`.trim() : o.vatStatus === 'not_subject' ? 'Non assujetti à la TVA' : 'TVA non renseignée';
      const addr = o.billingSameAsCompany
        ? 'Adresse de la société'
        : o.billingAddress
          ? `${o.billingAddress.adresse}, ${o.billingAddress.code_postal} ${o.billingAddress.commune}`
          : 'Adresse non renseignée';
      return `${vat} · ${addr}`;
    }
    case 'projet':
      return o.projectGoal?.trim() || EM_DASH;
  }
}

export function OnboardingSummaryCard({ onboarding }: { onboarding: OnboardingRow | null }) {
  const done = onboarding ? blockCompletion(onboarding) : null;
  return (
    <section className="pt-card" aria-labelledby="proj-onb-title">
      <h2 id="proj-onb-title" className="pt-heading">
        Onboarding
      </h2>
      <ul className="pt-lead-list">
        {ONBOARDING_BLOCKS.map((b) => {
          const ok = done ? done[b] : false;
          return (
            <li key={b} className="pt-lead-item">
              <p>
                {BLOCK_LABELS[b]}{' '}
                <span className="pt-lead-badge">
                  {ok ? <Check size={14} aria-hidden="true" /> : null}
                  {ok ? PROJECT_COPY.onboarding.complete : PROJECT_COPY.onboarding.todo}
                </span>
              </p>
              <p className="pt-lead-sub">{onboarding ? blockValue(b, onboarding) : EM_DASH}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// consents : plus récent d'abord (id décroissant).
export function ConsentCard({ consents }: { consents: ConsentRow[] }) {
  const latest = consents[0];
  const line = !latest
    ? 'Aucun accord'
    : latest.granted
      ? `Accord donné le ${formatDateFr(latest.createdAt)} (version ${latest.textVersion})`
      : `Accord retiré le ${formatDateFr(latest.createdAt)}`;
  return (
    <section className="pt-card" aria-labelledby="proj-consent-title">
      <h2 id="proj-consent-title" className="pt-heading">
        Accord de présentation
      </h2>
      <p>{line}</p>
      {consents.length > 0 ? (
        <details>
          <summary>Historique</summary>
          <ol className="pt-lead-list">
            {consents.map((c) => (
              <li key={c.id} className="pt-lead-item">
                <p className="pt-lead-sub">
                  {formatDateFr(c.createdAt)} · {c.granted ? 'Accord donné' : 'Accord retiré'} · version {c.textVersion}
                </p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}

function httpsHost(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.host : null;
  } catch {
    return null;
  }
}

export function LinksCard({ projectId, links }: { projectId: string; links: LinkRow[] }) {
  return (
    <section className="pt-card" aria-labelledby="proj-links-title">
      <h2 id="proj-links-title" className="pt-heading">
        {PROJECT_COPY.links.heading}
      </h2>
      {links.length > 0 ? (
        <ul className="pt-lead-list">
          {links.map((l) => {
            const host = httpsHost(l.url);
            return (
              <li key={l.id} className="pt-lead-item">
                {host ? (
                  <>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
                      {l.title}
                      <ExternalLink size={14} aria-hidden="true" />
                      <span className="pt-sr-only">{PROJECT_COPY.links.newTab}</span>
                    </a>
                    <p style={{ fontSize: 14, color: 'var(--ink-dim)' }}>{host}</p>
                  </>
                ) : (
                  <p>{l.title}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <LinkForm projectId={projectId} />
    </section>
  );
}
