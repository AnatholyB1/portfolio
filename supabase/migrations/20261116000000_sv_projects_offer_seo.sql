-- Ajoute l'offre « seo-referencement » à la liste fermée sv_projects.offer (10 slugs).
alter table public.sv_projects drop constraint if exists sv_projects_offer_check;
alter table public.sv_projects add constraint sv_projects_offer_check check (offer in (
  'site-vitrine', 'rebranding-site-premium', 'branding', 'projet-sur-mesure',
  'agent-vocal-ia', 'maintenance', 'community-management', 'meta-ads', 'google-ads',
  'seo-referencement'
));
