export const COMPANY_FIELDS = [
  'nom',
  'adresse',
  'code_postal',
  'commune',
  'naf',
  'siren',
  'forme_juridique_code',
  'etat_administratif',
  'categorie_entreprise',
  'date_creation',
  'tva_intracom',
] as const;

export function field(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function buildCompany(fd: FormData): Record<string, string> | null {
  const company: Record<string, string> = {};
  for (const key of COMPANY_FIELDS) {
    const v = field(fd, `company_${key}`);
    if (v) company[key] = v;
  }
  return company.nom ? company : null;
}
