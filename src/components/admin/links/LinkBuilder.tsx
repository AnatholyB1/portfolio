'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import {
  CAMPAIGN_MAX,
  MEDIUM_LABELS,
  PLATFORM_PRESETS,
  SOURCE_LABELS,
  UTM_MEDIUMS,
  UTM_SOURCES,
  buildTrackedUrl,
  slugifyBlock,
  type LinkError,
  type UtmMedium,
  type UtmSource,
} from '@/lib/attribution/utm';
import './links.css';

type Destination = { path: string; label: string };

type Fields = {
  source: UtmSource;
  medium: UtmMedium;
  path: string;
  offre: string;
  cible: string;
  month: string;
  content: string;
  term: string;
};

const DEBOUNCE_MS = 300;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function errorMessage(code: LinkError, campaignLength: number): string {
  switch (code) {
    case 'offre_missing':
      return "Indiquez l'offre : elle sert à nommer la campagne.";
    case 'cible_missing':
      return 'Indiquez la cible : elle sert à nommer la campagne.';
    case 'month_invalid':
      return 'Choisissez un mois valide (aaaa-mm).';
    case 'campaign_too_long':
      return `La campagne dépasse ${CAMPAIGN_MAX} caractères (${campaignLength}). Raccourcissez l'offre ou la cible.`;
    case 'content_invalid':
      return 'La variante de création ne peut contenir que des lettres, chiffres et tirets.';
    case 'path_not_allowed':
      return "Cette page de destination n'est pas autorisée.";
    case 'origin_invalid':
      return "L'adresse du site est invalide.";
  }
}

export default function LinkBuilder({ origin, destinations }: { origin: string; destinations: Destination[] }) {
  const [fields, setFields] = useState<Fields>(() => ({
    source: 'meta',
    medium: PLATFORM_PRESETS.meta,
    path: '/',
    offre: '',
    cible: '',
    month: currentMonth(),
    content: '',
    term: '',
  }));
  const [snapshot, setSnapshot] = useState<Fields>(fields);
  const [status, setStatus] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSnapshot(fields), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [fields]);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setStatus('');
    setFields((f) => ({ ...f, [key]: value }));
  };

  const allowedPaths = useMemo(() => destinations.map((d) => d.path), [destinations]);

  const result = useMemo(
    () =>
      buildTrackedUrl(
        {
          origin,
          path: snapshot.path,
          source: snapshot.source,
          medium: snapshot.medium,
          offre: snapshot.offre,
          cible: snapshot.cible,
          month: snapshot.month,
          content: snapshot.content,
          term: snapshot.source === 'google' ? snapshot.term : undefined,
        },
        allowedPaths,
      ),
    [snapshot, origin, allowedPaths],
  );

  const empty = snapshot.offre.trim() === '' || snapshot.cible.trim() === '';
  const ok = !empty && result.ok;
  const campaignLength = result.campaign.length;
  const offreSlug = slugifyBlock(fields.offre);
  const cibleSlug = slugifyBlock(fields.cible);
  const contentSlug = slugifyBlock(fields.content);

  async function copy() {
    if (!result.ok || empty) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setStatus('Lien copié');
    } catch {
      areaRef.current?.focus();
      areaRef.current?.select();
      setStatus('Copiez le lien manuellement (Ctrl+C).');
    }
  }

  function applyGooglePreset() {
    setStatus('');
    setFields((f) => ({
      ...f,
      source: 'gbp',
      medium: PLATFORM_PRESETS.gbp,
      path: '/',
      offre: 'fiche-google',
      cible: 'local',
      month: currentMonth(),
    }));
  }

  const summary: [string, string][] = result.ok
    ? [
        ['Source', result.params.utm_source ?? ''],
        ['Support', result.params.utm_medium ?? ''],
        ['Campagne', result.params.utm_campaign ?? ''],
        ['Contenu', result.params.utm_content ?? '—'],
        ['Terme', result.params.utm_term ?? '—'],
      ]
    : [];

  return (
    <form className="pt-link-form" onSubmit={(e) => e.preventDefault()} noValidate>
      <div className="pt-link-field">
        <label htmlFor="lk-source">Plateforme <span className="pt-link-req">(obligatoire)</span></label>
        <select
          id="lk-source"
          value={fields.source}
          onChange={(e) => {
            const s = e.target.value as UtmSource;
            setStatus('');
            setFields((f) => ({ ...f, source: s, medium: PLATFORM_PRESETS[s] }));
          }}
        >
          {UTM_SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]} ({s})
            </option>
          ))}
        </select>
      </div>

      <div className="pt-link-field">
        <label htmlFor="lk-medium">Support <span className="pt-link-req">(obligatoire)</span></label>
        <select
          id="lk-medium"
          aria-describedby="lk-medium-help"
          value={fields.medium}
          onChange={(e) => set('medium', e.target.value as UtmMedium)}
        >
          {UTM_MEDIUMS.map((m) => (
            <option key={m} value={m}>
              {MEDIUM_LABELS[m]} ({m})
            </option>
          ))}
        </select>
        <p id="lk-medium-help" className="pt-helper">Valeur proposée selon la plateforme.</p>
      </div>

      <div className="pt-link-field">
        <label htmlFor="lk-path">Page de destination <span className="pt-link-req">(obligatoire)</span></label>
        <div className="pt-link-path">
          <span className="pt-link-mono pt-link-origin">{origin}</span>
          <select id="lk-path" value={fields.path} onChange={(e) => set('path', e.target.value)}>
            {destinations.map((d) => (
              <option key={d.path} value={d.path}>
                {d.label} ({d.path})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-link-field">
        <label htmlFor="lk-offre">Offre <span className="pt-link-req">(obligatoire)</span></label>
        <input
          id="lk-offre"
          type="text"
          autoComplete="off"
          aria-describedby="lk-offre-help"
          value={fields.offre}
          onChange={(e) => set('offre', e.target.value)}
        />
        <p id="lk-offre-help" className="pt-helper">Ex. agent-vocal</p>
        {offreSlug && offreSlug !== fields.offre ? (
          <p className="pt-helper">
            Sera écrit : <span className="pt-link-mono">{offreSlug}</span>
          </p>
        ) : null}
      </div>

      <div className="pt-link-field">
        <label htmlFor="lk-cible">Cible <span className="pt-link-req">(obligatoire)</span></label>
        <input
          id="lk-cible"
          type="text"
          autoComplete="off"
          aria-describedby="lk-cible-help"
          value={fields.cible}
          onChange={(e) => set('cible', e.target.value)}
        />
        <p id="lk-cible-help" className="pt-helper">Ex. restaurants</p>
        {cibleSlug && cibleSlug !== fields.cible ? (
          <p className="pt-helper">
            Sera écrit : <span className="pt-link-mono">{cibleSlug}</span>
          </p>
        ) : null}
      </div>

      <div className="pt-link-grid">
        <div className="pt-link-field">
          <label htmlFor="lk-month">Mois <span className="pt-link-req">(obligatoire)</span></label>
          <input id="lk-month" type="month" value={fields.month} onChange={(e) => set('month', e.target.value)} />
        </div>

        <div className="pt-link-field">
          <label htmlFor="lk-content">Variante de création</label>
          <input
            id="lk-content"
            type="text"
            autoComplete="off"
            aria-describedby="lk-content-help"
            value={fields.content}
            onChange={(e) => set('content', e.target.value)}
          />
          <p id="lk-content-help" className="pt-helper">Ex. video-a, carrousel-1</p>
          {contentSlug && contentSlug !== fields.content ? (
            <p className="pt-helper">
              Sera écrit : <span className="pt-link-mono">{contentSlug}</span>
            </p>
          ) : null}
        </div>

        {fields.source === 'google' ? (
          <div className="pt-link-field">
            <label htmlFor="lk-term">Mot-clé</label>
            <input
              id="lk-term"
              type="text"
              autoComplete="off"
              value={fields.term}
              onChange={(e) => set('term', e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div>
        <button type="button" className="pt-btn-ghost pt-link-btn" onClick={applyGooglePreset}>
          Préremplir pour la fiche Google
        </button>
      </div>

      <div className="pt-link-result" aria-live="polite">
        <label htmlFor="lk-url" className="pt-link-result-label">Lien à utiliser</label>
        {empty ? (
          <div className="pt-empty">
            <p><strong>Aucun lien généré</strong></p>
            <p className="pt-helper">
              Remplissez l&apos;offre et la cible pour générer le lien. Le mois est prérempli avec le mois en
              cours.
            </p>
          </div>
        ) : (
          <>
            <textarea
              id="lk-url"
              ref={areaRef}
              className="pt-link-url"
              readOnly
              rows={3}
              value={result.ok ? result.url : ''}
            />
            {result.ok ? (
              <dl className="pt-summary">
                {summary.map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd className="pt-link-mono">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="pt-helper">
              {campaignLength} / {CAMPAIGN_MAX} caractères
            </p>
            {result.ok ? (
              <p className="pt-link-ok">
                <CheckCircle2 size={16} aria-hidden="true" /> Conforme à la convention
              </p>
            ) : (
              <ul className="pt-link-errors">
                {result.errors.map((code) => (
                  <li key={code}>
                    <TriangleAlert size={16} aria-hidden="true" /> {errorMessage(code, campaignLength)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="pt-link-actions">
          <button
            type="button"
            className="pt-btn-primary pt-link-btn"
            onClick={copy}
            disabled={!ok}
            aria-disabled={!ok}
          >
            Copier le lien
          </button>
          {ok && result.ok ? (
            <a
              className="pt-btn-ghost pt-link-btn"
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir le lien<span className="pt-sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
            </a>
          ) : null}
        </div>
        <p className="pt-status" role="status">{status}</p>
      </div>
    </form>
  );
}
