import { EM_DASH, formatDateFr, formatSiret } from '@/lib/admin/format';
import ResendButton from './ResendButton';
import './admin.css';

// Tableau des clients invités (UI-SPEC S4). Composant serveur : les données
// arrivent déjà lues via le client RLS par la page ; `status` est un libellé
// calculé côté serveur (« Invité » / « Connecté le JJ/MM/AAAA »).
export interface ClientRow {
  id: string;
  client: string;
  siret: string;
  email: string;
  invitedAt: string;
  status: string;
}

function orDash(v: string): string {
  return v && v.trim() ? v : EM_DASH;
}

export default function ClientsTable({ rows }: { rows: ClientRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="pt-empty">
        <h3 className="pt-heading">Aucun client invité</h3>
        <p className="pt-helper">
          Invitez votre premier client avec le formulaire ci-dessus : il recevra un code de
          connexion par e-mail.
        </p>
      </div>
    );
  }

  // Rôles explicites : sur mobile le CSS passe les éléments en display:block,
  // ce qui retire leur sémantique de tableau dans certains navigateurs.
  return (
    <table className="pt-table pt-admin-table" role="table">
      <caption className="pt-sr-only">Clients invités</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">Client</th>
          <th scope="col" role="columnheader">SIRET</th>
          <th scope="col" role="columnheader">E-mail invité</th>
          <th scope="col" role="columnheader">Invité le</th>
          <th scope="col" role="columnheader">Statut</th>
          <th scope="col" role="columnheader">
            <span className="pt-sr-only">Action</span>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((r) => (
          <tr key={r.id} role="row">
            <td role="cell" data-label="Client">{orDash(r.client)}</td>
            <td role="cell" data-label="SIRET">{formatSiret(r.siret)}</td>
            <td role="cell" data-label="E-mail invité">
              {r.email ? <a href={'mailto:' + r.email}>{r.email}</a> : EM_DASH}
            </td>
            <td role="cell" data-label="Invité le">{formatDateFr(r.invitedAt)}</td>
            <td role="cell" data-label="Statut">{orDash(r.status)}</td>
            <td role="cell" data-label="Action">
              {r.email ? <ResendButton clientId={r.id} clientName={r.client} /> : EM_DASH}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
