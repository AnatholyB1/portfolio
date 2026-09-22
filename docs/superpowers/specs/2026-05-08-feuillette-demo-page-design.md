# Design Spec — Page Démo Feuillette

**Date** : 2026-05-08  
**Statut** : Approuvé  
**Contexte** : La directrice du Feuillette local a validé l'agent vocal IA et remonte au siège national (~60-70 boulangeries). Une démo en ligne brandée Feuillette est nécessaire comme livrable du dossier commercial.

---

## Route

`/demo/feuillette` → `src/app/demo/feuillette/page.tsx`

---

## Fonctionnalités

- Même logique temps réel que `/demo` (Supabase Realtime via `postgres_changes`)
- Tables partagées : `orders` + `products` (pas de filtre par enseigne)
- Affichage : commandes du jour + stock produits en temps réel
- Numéro VAPI : `process.env.NEXT_PUBLIC_TWILIO_NUMBER`
- Langue : français uniquement (pas d'i18n)
- Navbar : `<Navbar />` standard portfolio

---

## Branding

| Élément | Valeur |
|---|---|
| Fond page | `#f5ede0` |
| Texte principal | `#241C10` |
| Accent / bordures | `#5a3217` |
| Cards fond | `#ede3d0` |
| Police | Cormorant Garamond (Google Fonts, weights 400 & 500) |
| Header | `"Feuillette"` en Cormorant 48px + `"Boulangerie · Pâtisserie · Restauration"` |
| Badge statut En ligne | fond `#5a3217/10`, bord `#5a3217/30`, texte `#5a3217`, point vert animé |

---

## Produits à seeder en BDD

```sql
TRUNCATE products RESTART IDENTITY;

INSERT INTO products (name, category, stock_qty, price, unit) VALUES
  ('Croissant au beurre',   'Viennoiserie', 24, 1.40, 'pièce'),
  ('Pain au chocolat',      'Viennoiserie', 18, 1.50, 'pièce'),
  ('Baguette tradition',    'Boulangerie',  30, 1.30, 'pièce'),
  ('Pain de campagne',      'Boulangerie',  12, 4.20, 'pièce'),
  ('Paris-Brest',           'Pâtisserie',    8, 5.80, 'pièce'),
  ('Tarte aux fraises',     'Pâtisserie',    6, 4.90, 'part'),
  ('Macaron assortiment',   'Pâtisserie',   20, 2.20, 'pièce'),
  ('Sandwich jambon-beurre','Restauration', 10, 5.50, 'pièce'),
  ('Café',                  'Salon de thé', 50, 2.50, 'tasse'),
  ('Thé du jour',           'Salon de thé', 40, 3.00, 'tasse');
```

---

## Structure de la page

1. `<Navbar />` standard
2. **Header Feuillette** — nom en Cormorant + badge "En ligne"
3. **Bloc numéro VAPI** — fond card, numéro en Cormorant, texte explicatif
4. **Stats** — 2 cards : commandes aujourd'hui / produits disponibles
5. **Grille** — commandes du jour (gauche) + stock (droite)
6. **Footer mini** — "Propulsé par VAPI · Claude Sonnet · ElevenLabs · Twilio · Supabase"

---

## Ce qui ne change pas vs `/demo`

- Logique Supabase (canaux, abonnements, fetch)
- Highlight nouvelle commande (3s)
- Couleurs stock (rouge/orange/vert — conservées car fonctionnelles)
