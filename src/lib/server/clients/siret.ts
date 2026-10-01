import 'server-only';
import type { CompanySnapshot } from '@/lib/admin/inviteSchema';

// Recherche d'entreprise par SIRET (D-02) via l'API publique gratuite.
// Minimisation : liste blanche explicite de champs, aucune donnée personnelle
// des dirigeants n'est lue ni conservée.

export type SiretLookupResult =
  | { ok: true; data: CompanySnapshot & { siret: string } }
  | { ok: false; reason: 'invalid' | 'not_found' | 'rate_limited' | 'unavailable' };

const SIRET = /^\d{14}$/;

type Etab = {
  siret?: string;
  adresse?: string;
  code_postal?: string;
  libelle_commune?: string;
  activite_principale?: string;
  etat_administratif?: string;
};

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function fail(reason: 'not_found' | 'rate_limited' | 'unavailable'): SiretLookupResult {
  console.error(`[admin/siret] ${reason}`);
  return { ok: false, reason };
}

export async function lookupSiret(raw: string): Promise<SiretLookupResult> {
  const siret = String(raw ?? '').replace(/\s/g, '');
  if (!SIRET.test(siret)) return { ok: false, reason: 'invalid' };

  let res: Response;
  try {
    res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=1`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
  } catch {
    return fail('unavailable');
  }
  if (res.status === 429) return fail('rate_limited');
  if (!res.ok) return fail('unavailable');

  let body: { results?: Record<string, unknown>[] };
  try {
    body = await res.json();
  } catch {
    return fail('unavailable');
  }

  const r = body?.results?.[0];
  if (!r) return fail('not_found');

  // q est une recherche floue : confirmer que le SIRET exact est revenu.
  const siege = r.siege as Etab | undefined;
  const matching = r.matching_etablissements as Etab[] | undefined;
  const etab: Etab | undefined =
    siege?.siret === siret ? siege : matching?.find((e) => e?.siret === siret);
  if (!etab) return fail('not_found');

  const nom = str(r.nom_complet);
  if (!nom) return fail('not_found');

  const tva = r.tva;
  return {
    ok: true,
    data: {
      siret,
      nom: nom.slice(0, 200),
      adresse: str(etab.adresse)?.slice(0, 300),
      code_postal: /^\d{5}$/.test(etab.code_postal ?? '') ? etab.code_postal : undefined,
      commune: str(etab.libelle_commune)?.slice(0, 120),
      naf: (str(etab.activite_principale) ?? str(r.activite_principale))?.slice(0, 10),
      siren: /^\d{9}$/.test(String(r.siren ?? '')) ? String(r.siren) : undefined,
      forme_juridique_code: str(r.nature_juridique)?.slice(0, 10),
      etat_administratif: str(etab.etat_administratif)?.slice(0, 2),
      categorie_entreprise: str(r.categorie_entreprise)?.slice(0, 20),
      date_creation: str(r.date_creation)?.slice(0, 10),
      tva_intracom: typeof tva === 'string' ? tva.slice(0, 20) : null,
    },
  };
}
