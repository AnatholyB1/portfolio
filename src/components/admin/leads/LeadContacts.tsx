import { CHANNEL_LABELS } from '@/lib/admin/leadLabels';
import { EM_DASH, formatDateFr } from '@/lib/admin/format';

export interface ContactRow {
  id: string;
  channel: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  payload: unknown;
  consent: unknown;
  created_at: string;
}

type Answer = { questionId: string; value: string | string[] };

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function answers(payload: Record<string, unknown>): Answer[] {
  const raw = payload.reponsesDiagnostic;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => asRecord(a))
    .filter((a) => typeof a.questionId === 'string')
    .map((a) => ({
      questionId: a.questionId as string,
      value: Array.isArray(a.value) ? a.value.map(String) : String(a.value ?? ''),
    }));
}

function consentLine(consent: unknown): string {
  const c = asRecord(consent);
  if (c.choice !== 'accepted' && c.choice !== 'refused') {
    return 'Consentement cookies : aucun choix enregistré';
  }
  const label = c.choice === 'accepted' ? 'Accepté' : 'Refusé';
  const at = typeof c.at === 'number' ? formatDateFr(new Date(c.at).toISOString()) : EM_DASH;
  const version = typeof c.version === 'string' ? c.version : EM_DASH;
  return `Consentement cookies : ${label} le ${at} (version ${version})`;
}

// Contacts du lead, un par soumission (D-04, D-12). Rendu en texte React uniquement.
export default function LeadContacts({ contacts, erased }: { contacts: ContactRow[]; erased: boolean }) {
  return (
    <section className="pt-card" aria-labelledby="lead-contacts-title">
      <h2 id="lead-contacts-title" className="pt-heading">
        Contacts
      </h2>
      {contacts.length === 0 ? (
        <p className="pt-helper">{erased ? 'Effacé' : 'Aucun contact.'}</p>
      ) : (
        <ol className="pt-lead-list">
          {contacts.map((c) => {
            const payload = asRecord(c.payload);
            const list = answers(payload);
            const services = Array.isArray(payload.servicesRecommandes)
              ? payload.servicesRecommandes.map(String)
              : [];
            const projectType = typeof payload.projectType === 'string' ? payload.projectType : '';
            const message = typeof payload.message === 'string' ? payload.message : '';
            return (
              <li key={c.id} className="pt-lead-item">
                <p className="pt-lead-sub">
                  {formatDateFr(c.created_at)} · {CHANNEL_LABELS[c.channel] ?? c.channel}
                </p>
                <p>
                  {c.nom ? <strong>{c.nom}</strong> : null}
                  {c.nom && c.email ? ' · ' : null}
                  {c.email}
                  {c.telephone ? ` · ${c.telephone}` : null}
                </p>
                {list.length > 0 ? (
                  <ul className="pt-lead-answers">
                    {list.map((a) => (
                      <li key={a.questionId}>
                        {a.questionId} : {Array.isArray(a.value) ? a.value.join(', ') : a.value}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {services.length > 0 ? <p>Services recommandés : {services.join(', ')}</p> : null}
                {projectType ? <p>Type de projet : {projectType}</p> : null}
                {message ? <p className="pt-lead-message">{message}</p> : null}
                <p className="pt-lead-sub">{consentLine(c.consent)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
