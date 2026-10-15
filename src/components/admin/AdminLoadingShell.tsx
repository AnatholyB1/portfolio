import AdminNav, { type AdminNavItem } from '@/components/admin/AdminNav';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import './admin.css';

// Squelettes de chargement de l'administration : coque et navigation restent en place,
// la zone de contenu reprend la mise en page finale (titre, filtres, tableau, grille) à
// hauteurs fixes (primitive .pt-sk) pour que le contenu réel arrive sans décalage.
// Les formes sont aria-hidden ; une seule région role="status" annonce l'attente.
export type AdminLoadingVariant = 'list' | 'home' | 'kpi' | 'detail';

function Bar({ className }: { className: string }) {
  return <span className={`pt-sk ${className}`} />;
}

function Table({ rows, columns }: { rows: number; columns: number }) {
  return (
    <div className="pt-sk-table">
      <span className="pt-sk-row pt-sk-row-head" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, j) => (
          <span className="pt-sk" key={j} />
        ))}
      </span>
      {Array.from({ length: rows }, (_, i) => (
        <span className="pt-sk-row" key={i} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, j) => (
            <span className="pt-sk" key={j} />
          ))}
        </span>
      ))}
    </div>
  );
}

function Body({ variant }: { variant: AdminLoadingVariant }) {
  if (variant === 'home') {
    return (
      <>
        <Bar className="pt-sk-title" />
        <section className="pt-card">
          <Bar className="pt-sk-subtitle" />
          <div className="pt-sk-queue">
            {Array.from({ length: 4 }, (_, i) => (
              <Bar key={i} className="pt-sk-tile" />
            ))}
          </div>
        </section>
        <section className="pt-card">
          <Bar className="pt-sk-subtitle" />
          <Bar className="pt-sk-field" />
          <Bar className="pt-sk-field" />
        </section>
        <section className="pt-card">
          <Bar className="pt-sk-subtitle" />
          <Table rows={3} columns={5} />
        </section>
      </>
    );
  }
  if (variant === 'kpi') {
    return (
      <section className="pt-card">
        <Bar className="pt-sk-title" />
        <Bar className="pt-sk-controls" />
        <div className="pt-sk-kpis">
          {Array.from({ length: 4 }, (_, i) => (
            <Bar key={i} className="pt-sk-kpi" />
          ))}
        </div>
        <Table rows={4} columns={5} />
      </section>
    );
  }
  if (variant === 'detail') {
    return (
      <>
        <Bar className="pt-sk-back" />
        <div className="pt-sk-head">
          <Bar className="pt-sk-title" />
          <Bar className="pt-sk-pill" />
        </div>
        <div className="pt-sk-grid">
          <div className="pt-sk-col">
            <Bar className="pt-sk-card-lg" />
            <Bar className="pt-sk-card-md" />
          </div>
          <div className="pt-sk-col">
            <Bar className="pt-sk-card-md" />
            <Bar className="pt-sk-card-md" />
          </div>
        </div>
      </>
    );
  }
  return (
    <section className="pt-card">
      <Bar className="pt-sk-title" />
      <Bar className="pt-sk-controls" />
      <Table rows={6} columns={5} />
    </section>
  );
}

export default function AdminLoadingShell({
  current,
  variant = 'list',
}: {
  current?: AdminNavItem;
  variant?: AdminLoadingVariant;
}) {
  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin pt-admin-loading" aria-busy="true">
          <AdminNav current={current} />
          <p role="status" className="pt-sr-only">
            Chargement…
          </p>
          <div className="pt-sk-wrap" aria-hidden="true">
            <Body variant={variant} />
          </div>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
