# Design Spec — Agent Vocal IA (VAPI Demo)

**Date:** 2026-04-25  
**Status:** Approved

---

## 1. Objectif

Intégrer une démo live d'un agent téléphonique IA dans le portfolio pour promouvoir une offre commerciale. Les visiteurs peuvent appeler un vrai numéro Twilio, parler à un agent IA (VAPI + Claude Sonnet + ElevenLabs), et voir en temps réel les commandes apparaître dans un dashboard CRM sur `/demo`.

**Scénario :** Boulangerie-pâtisserie-traiteur fictive ("Boulangerie Demo"). L'agent gère les demandes de disponibilité de produits et la prise de commandes.

---

## 2. Architecture

### Flux d'un appel

```
Client appelle → Twilio → VAPI
                              ↓
                    Claude Sonnet 4.6 (LLM)
                    ElevenLabs FR (TTS)
                    Deepgram fr-FR (STT)
                              ↓ tool calls HTTP
                    Next.js /api/crm/* (routes)
                              ↓ read/write
                    Supabase (PostgreSQL)
                              ↓ Realtime subscription
                    Dashboard /demo (mise à jour instantanée)
```

### Nouveaux fichiers

```
src/
  app/
    demo/
      page.tsx                    ← dashboard CRM live
    api/
      crm/
        products/route.ts         ← GET liste produits du jour
        stock/route.ts            ← GET /api/crm/stock?product_id=xxx (outil VAPI)
        orders/route.ts           ← GET commandes  POST nouvelle commande (décrémente stock en interne)
  lib/
    supabase.ts                   ← client Supabase (browser + server)
```

### Variables d'environnement requises

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## 3. Supabase — Schéma

### Table `products`

| Colonne     | Type    | Description                                  |
|-------------|---------|----------------------------------------------|
| id          | uuid    | PK, default gen_random_uuid()                |
| name        | text    | Ex: "Baguette", "Croissant"                  |
| category    | text    | "pain" \| "viennoiserie" \| "pâtisserie" \| "traiteur" |
| unit        | text    | "pièce" \| "kg"                              |
| price       | numeric | Prix unitaire en €                           |
| stock_qty   | integer | Quantité disponible aujourd'hui              |
| created_at  | timestamptz | default now()                            |

### Table `orders`

| Colonne       | Type        | Description                          |
|---------------|-------------|--------------------------------------|
| id            | uuid        | PK, default gen_random_uuid()        |
| created_at    | timestamptz | default now()                        |
| customer_name | text        | Prénom du client (optionnel)         |
| items         | jsonb       | [{product_id, name, qty, unit_price}]|
| total         | numeric     | Montant total calculé                |
| pickup_time   | text        | Heure de retrait (optionnel)         |
| status        | text        | "confirmé" (seul statut pour la démo)|

### Données de démo pré-chargées (seed)

| Produit                | Catégorie    | Prix   | Stock |
|------------------------|--------------|--------|-------|
| Baguette               | pain         | 1.20 € | 15    |
| Croissant              | viennoiserie | 1.10 € | 12    |
| Pain au chocolat       | viennoiserie | 1.30 € | 10    |
| Tarte aux fraises      | pâtisserie   | 3.50 € | 4     |
| Éclair au chocolat     | pâtisserie   | 2.80 € | 8     |
| Quiche Lorraine        | traiteur     | 4.50 € | 6     |
| Sandwich jambon-beurre | traiteur     | 5.00 € | 10    |

---

## 4. API Routes (outils VAPI)

### GET `/api/crm/products`
Retourne tous les produits avec stock > 0.

**Response:**
```json
{
  "products": [
    { "id": "uuid", "name": "Baguette", "category": "pain", "price": 1.20, "stock_qty": 15, "unit": "pièce" }
  ]
}
```

### GET `/api/crm/stock?product_id=uuid`
Retourne le stock actuel d'un produit.

**Response:**
```json
{ "product_id": "uuid", "name": "Baguette", "stock_qty": 15, "available": true }
```

### POST `/api/crm/orders`
Crée une commande et décrémente le stock de chaque produit.

**Body:**
```json
{
  "customer_name": "Sophie",
  "items": [
    { "product_id": "uuid", "qty": 2 }
  ],
  "pickup_time": "16h30"
}
```

**Response:**
```json
{
  "order_id": "uuid",
  "status": "confirmé",
  "total": 2.40,
  "items": [{ "name": "Baguette", "qty": 2, "unit_price": 1.20 }]
}
```

**Erreur si stock insuffisant:**
```json
{ "error": "stock_insufficient", "product": "Baguette", "available": 1, "requested": 2 }
```

---

## 5. Configuration VAPI

### Paramètres

| Paramètre     | Valeur                        |
|---------------|-------------------------------|
| LLM           | claude-sonnet-4-6             |
| TTS           | ElevenLabs (voix FR féminine — recommandé : `Serena` ID `pFZP5JQG7iQjIQuC4Bku` ou `Charlotte` ID `XB0fDUnXU5powFXDhCwa`) |
| STT           | Deepgram (fr-FR)              |
| Téléphone     | Numéro Twilio existant        |

### System Prompt

```
Tu es l'assistante vocale de la "Boulangerie Demo", une boulangerie-pâtisserie-traiteur.
Tu parles français, avec un ton chaleureux, naturel et concis — c'est une conversation téléphonique, sois brève et directe.

Ton rôle :
- Informer les clients sur les produits disponibles et leurs prix
- Vérifier le stock avant toute confirmation
- Enregistrer les commandes

Règles absolues :
1. Toujours appeler get_products ou check_stock avant de parler d'un produit
2. Si stock insuffisant pour une quantité demandée, propose une alternative ou la quantité disponible
3. Confirmer la commande à voix haute (produits + total) avant d'appeler create_order
4. Demander le prénom du client avant de finaliser
5. Ne traite que les sujets liés aux produits et commandes de la boulangerie

Première phrase : "Bonjour, Boulangerie Demo, comment puis-je vous aider ?"
```

### Tools VAPI

**Tool 1 — `get_products`**
```json
{
  "name": "get_products",
  "description": "Récupère la liste des produits disponibles aujourd'hui avec leur stock et prix",
  "url": "https://[portfolio-domain]/api/crm/products",
  "method": "GET"
}
```

**Tool 2 — `check_stock`**
```json
{
  "name": "check_stock",
  "description": "Vérifie le stock disponible pour un produit spécifique",
  "url": "https://[portfolio-domain]/api/crm/stock",
  "method": "GET",
  "parameters": {
    "product_id": { "type": "string", "description": "UUID du produit" }
  }
}
```

**Tool 3 — `create_order`**
```json
{
  "name": "create_order",
  "description": "Enregistre une commande client et met à jour le stock",
  "url": "https://[portfolio-domain]/api/crm/orders",
  "method": "POST",
  "parameters": {
    "customer_name": { "type": "string", "description": "Prénom du client" },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "product_id": { "type": "string" },
          "qty": { "type": "integer" }
        }
      }
    },
    "pickup_time": { "type": "string", "description": "Heure de retrait souhaitée (optionnel)" }
  }
}
```

---

## 6. Dashboard `/demo`

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  🥐 Boulangerie Demo — CRM Live            ● En ligne   │
├─────────────────────────────────────────────────────────┤
│  📞 Appelez maintenant pour tester l'agent IA           │
│              +33 X XX XX XX XX                          │
├──────────────┬──────────────┬──────────────────────────┤
│  7 commandes │  12 produits dispo │  Realtime ●             │
├──────────────┴──────────────┴──────────────────────────┤
│  COMMANDES DU JOUR              │  STOCK                │
│  ─────────────────              │  ──────               │
│  14:32 Sophie — 2 baguettes ✓   │  Baguette      13 🟢  │
│  14:18 Marc   — 6 croissants ✓  │  Croissant      6 🟢  │
│                                 │  Tarte fr.      4 🟡  │
│  [live pulse on new entry]      │  Quiche         0 🔴  │
└─────────────────────────────────┴──────────────────────┘
```

### Comportement temps réel
- Supabase Realtime subscription sur `orders` et `products`
- Nouvelle commande : apparaît en haut de la liste avec animation de pulse vert
- Stock mis à jour : mise à jour instantanée dans le tableau, badge couleur (🟢 > 5, 🟡 1-5, 🔴 0)
- Indicateur "● En ligne" : vert statique pour la démo (le numéro est toujours actif)

### Design
Suit l'identité visuelle du portfolio : fond sombre (#0f172a), gradients indigo/emerald, border-gray-800, composants en Tailwind. Pas de nouvelle dépendance CSS.

---

## 7. Intégration dans le portfolio

### Homepage — nouvelle section

**Position :** entre `<Projects />` et `<Contact />`  
**Composant :** `src/components/sections/PhoneAgentPromo.tsx`

**Contenu :**
- Badge : "Nouveau"
- Titre : "Agent Vocal IA — Votre standard téléphonique automatisé"
- Sous-titre : "Powered by VAPI · Claude · ElevenLabs · Twilio"
- 3 bénéfices : disponible 24/7 sans décrocher, prend commandes/RDV et les écrit dans votre CRM, connecté à vos outils métier via MCP
- CTA principal : "Voir la démo live" → /demo
- CTA secondaire : "En savoir plus" → /services

**Traductions :** à ajouter dans `src/lib/translations.ts` pour fr/en/th.

### Services page — mise à jour

**1. Nouvelle carte dans `OffersSection`** (4e carte ou remplacement de la 3e) :
- Nom : "Agent Vocal IA"
- Tagline : "Votre boulangerie, votre cabinet, votre agence — au téléphone 24/7"
- Prix : "À partir de 990 €"
- Features : Setup VAPI + Twilio, intégration CRM, voix ElevenLabs, 1 scénario sur mesure, 1 mois de support

**2. Nouvelle section `PhoneAgentSection`** (avant `MaintenanceSection`) :
- Titre : "Comment fonctionne l'agent vocal IA ?"
- Diagramme simplifié : Appel → VAPI → Claude → MCP → CRM
- Encart "Testez maintenant" avec le numéro de démo

---

## 8. Périmètre

**Dans le scope :**
- Supabase setup + seed data
- 3 API routes CRM
- Dashboard /demo avec realtime
- Section promo homepage
- Mise à jour services page (offre + section explicative)
- VAPI config (prompt + 3 tools) documentée et prête à copier-coller

**Hors scope :**
- Authentification du dashboard (public pour la démo)
- Vrai reset quotidien du stock (manuel via Supabase)
- Analytics des appels
- Multi-scénarios (une seule boulangerie pour la démo)
