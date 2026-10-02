// Tableau des clients invités (UI-SPEC S4). Composant serveur : les données
// arrivent déjà lues via le client RLS par la page.
export interface ClientRow {
  id: string;
  client: string;
  siret: string;
  email: string;
  invitedAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR');
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

  return (
    <table className="pt-table">
      <thead>
        <tr>
          <th scope="col">Client</th>
          <th scope="col">SIRET</th>
          <th scope="col">E-mail invité</th>
          <th scope="col">Invité le</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td data-label="Client">{r.client}</td>
            <td data-label="SIRET">{r.siret}</td>
            <td data-label="E-mail invité">{r.email}</td>
            <td data-label="Invité le">{formatDate(r.invitedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
