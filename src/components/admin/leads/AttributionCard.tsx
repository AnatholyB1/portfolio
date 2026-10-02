import { EM_DASH } from '@/lib/admin/format';

const CLICK_IDS = ['gclid', 'fbclid', 'ttclid'] as const;

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function text(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v : EM_DASH;
}

function Touch({ title, touch }: { title: string; touch: unknown }) {
  const t = rec(touch);
  const params = rec(t?.params) ?? {};
  return (
    <div>
      <h3 className="pt-lead-subhead">{title}</h3>
      {!t ? (
        <p className="pt-helper">Aucune donnée (arrivée directe)</p>
      ) : (
        <dl className="pt-summary">
          <dt>Source</dt>
          <dd>{text(params.utm_source)}</dd>
          <dt>Support</dt>
          <dd>{text(params.utm_medium)}</dd>
          <dt>Campagne</dt>
          <dd>{text(params.utm_campaign)}</dd>
          <dt>Contenu</dt>
          <dd>{text(params.utm_content)}</dd>
          <dt>Terme</dt>
          <dd>{text(params.utm_term)}</dd>
          <dt>Page d&apos;atterrissage</dt>
          <dd className="pt-lead-trunc" title={text(t.landing)}>{text(t.landing)}</dd>
          <dt>Référent</dt>
          <dd className="pt-lead-trunc" title={text(t.referrer)}>{text(t.referrer)}</dd>
          {CLICK_IDS.filter((k) => typeof params[k] === 'string' && params[k] !== '').map((k) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt>{k}</dt>
              <dd className="pt-lead-trunc" title={String(params[k])}>{String(params[k])}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// Les deux jeux d'attribution (premier et dernier contact), valeurs en texte React.
export default function AttributionCard({ firstTouch, lastTouch }: { firstTouch: unknown; lastTouch: unknown }) {
  return (
    <section className="pt-card" aria-labelledby="lead-attr-title">
      <h2 id="lead-attr-title" className="pt-heading">
        Attribution
      </h2>
      <Touch title="Premier contact" touch={firstTouch} />
      <Touch title="Dernier contact" touch={lastTouch} />
    </section>
  );
}
