# VAPI Agent Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intégrer une démo live d'un agent téléphonique IA (VAPI + Claude Sonnet 4.6 + ElevenLabs) dans le portfolio — avec un CRM boulangerie fictif (Supabase), 3 routes API, un dashboard `/demo` en temps réel, et des sections promotionnelles sur la homepage et la page services.

**Architecture:** Les outils VAPI sont des routes Next.js (`/api/crm/*`) qui lisent/écrivent dans Supabase. Le dashboard `/demo` souscrit à Supabase Realtime et se met à jour instantanément à chaque appel. Les sections marketing s'intègrent dans l'i18n existant (fr/en/th).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Realtime), `@supabase/supabase-js`, VAPI, ElevenLabs, Twilio

---

## File Map

| Fichier | Action | Rôle |
|---------|--------|------|
| `src/lib/supabase.ts` | Create | Client Supabase browser + serveur |
| `src/app/api/crm/products/route.ts` | Create | GET produits disponibles (outil VAPI) |
| `src/app/api/crm/stock/route.ts` | Create | GET stock d'un produit (outil VAPI) |
| `src/app/api/crm/orders/route.ts` | Create | GET commandes / POST commande + décrémente stock (outil VAPI) |
| `src/app/demo/page.tsx` | Create | Dashboard CRM live avec Supabase Realtime |
| `src/components/sections/PhoneAgentPromo.tsx` | Create | Section promo homepage |
| `src/lib/translations.ts` | Modify | Ajouter clés `phoneAgent` + `services.phoneAgent` |
| `src/app/page.tsx` | Modify | Insérer `<PhoneAgentPromo />` entre Projects et Contact |
| `src/app/services/page.tsx` | Modify | Ajouter `PhoneAgentSection` + nouvelle carte offre |

---

## Task 1: Supabase project + env vars

**Files:**
- Modify: `.env.local` (créer s'il n'existe pas)

- [ ] **Step 1: Créer un projet Supabase**

  Va sur https://supabase.com → New project. Note les valeurs suivantes dans Settings → API :
  - Project URL (`SUPABASE_URL`)
  - `anon` public key
  - `service_role` secret key

- [ ] **Step 2: Créer `.env.local` à la racine du portfolio**

  ```bash
  # .env.local
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
  SUPABASE_SERVICE_ROLE_KEY=eyJhb...
  NEXT_PUBLIC_TWILIO_NUMBER=+33 1 23 45 67 89
  ```

- [ ] **Step 3: Vérifier que `.env.local` est dans `.gitignore`**

  ```bash
  grep ".env.local" .gitignore
  ```
  Si absent : `echo ".env.local" >> .gitignore`

---

## Task 2: Supabase schema + seed

**Files:**
- Reference: Supabase SQL editor (interface web)

- [ ] **Step 1: Créer les tables via le SQL editor Supabase**

  Ouvre Supabase → SQL Editor → New query → colle et exécute :

  ```sql
  CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'pièce',
    price NUMERIC(10,2) NOT NULL,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    customer_name TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    pickup_time TEXT,
    status TEXT NOT NULL DEFAULT 'confirmé'
  );
  ```

- [ ] **Step 2: Activer Realtime sur les deux tables**

  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  ```

- [ ] **Step 3: Seed les produits de démo**

  ```sql
  INSERT INTO products (name, category, unit, price, stock_qty) VALUES
    ('Baguette', 'pain', 'pièce', 1.20, 15),
    ('Croissant', 'viennoiserie', 'pièce', 1.10, 12),
    ('Pain au chocolat', 'viennoiserie', 'pièce', 1.30, 10),
    ('Tarte aux fraises', 'pâtisserie', 'pièce', 3.50, 4),
    ('Éclair au chocolat', 'pâtisserie', 'pièce', 2.80, 8),
    ('Quiche Lorraine', 'traiteur', 'part', 4.50, 6),
    ('Sandwich jambon-beurre', 'traiteur', 'pièce', 5.00, 10);
  ```

- [ ] **Step 4: Configurer RLS (Row Level Security)**

  Pour la démo, autoriser lecture publique et écriture via service_role uniquement :

  ```sql
  -- Products: lecture publique, écriture service_role only
  ALTER TABLE products ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Public read products" ON products FOR SELECT USING (true);

  -- Orders: lecture publique, insert via service_role only
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
  ```

  Note : les API routes utilisent `service_role` key pour contourner RLS lors des INSERT/UPDATE.

- [ ] **Step 5: Vérifier dans Supabase Table Editor**

  Les tables `products` (7 lignes) et `orders` (0 lignes) doivent apparaître.

---

## Task 3: Install Supabase + client lib

**Files:**
- Create: `src/lib/supabase.ts`

- [ ] **Step 1: Installer le package**

  ```bash
  npm install @supabase/supabase-js
  ```

- [ ] **Step 2: Créer `src/lib/supabase.ts`**

  ```typescript
  import { createClient } from '@supabase/supabase-js'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Client browser (anon key) — pour le dashboard realtime
  export const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Client serveur (service_role) — pour les API routes
  export function createServerClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  ```

- [ ] **Step 3: Vérifier la compilation TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/supabase.ts package.json package-lock.json
  git commit -m "feat: add Supabase client lib"
  ```

---

## Task 4: GET /api/crm/products

**Files:**
- Create: `src/app/api/crm/products/route.ts`

- [ ] **Step 1: Créer la route**

  ```typescript
  // src/app/api/crm/products/route.ts
  import { NextResponse } from 'next/server'
  import { createServerClient } from '@/lib/supabase'

  export async function GET() {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, unit, price, stock_qty')
      .gt('stock_qty', 0)
      .order('category')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ products: data })
  }
  ```

- [ ] **Step 2: Démarrer le serveur dev et tester**

  ```bash
  npm run dev
  ```

  Dans un autre terminal :
  ```bash
  curl http://localhost:3000/api/crm/products
  ```

  Expected :
  ```json
  {
    "products": [
      { "id": "...", "name": "Baguette", "category": "pain", "unit": "pièce", "price": 1.20, "stock_qty": 15 },
      ...
    ]
  }
  ```
  7 produits doivent apparaître.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/api/crm/products/route.ts
  git commit -m "feat: add GET /api/crm/products route"
  ```

---

## Task 5: GET /api/crm/stock

**Files:**
- Create: `src/app/api/crm/stock/route.ts`

- [ ] **Step 1: Créer la route**

  ```typescript
  // src/app/api/crm/stock/route.ts
  import { NextRequest, NextResponse } from 'next/server'
  import { createServerClient } from '@/lib/supabase'

  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')

    if (!product_id) {
      return NextResponse.json({ error: 'product_id query param required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, name, stock_qty')
      .eq('id', product_id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({
      product_id: data.id,
      name: data.name,
      stock_qty: data.stock_qty,
      available: data.stock_qty > 0,
    })
  }
  ```

- [ ] **Step 2: Tester — cas normal**

  Récupère un UUID depuis la réponse de `/api/crm/products`, remplace `<UUID>` :

  ```bash
  curl "http://localhost:3000/api/crm/stock?product_id=<UUID>"
  ```

  Expected :
  ```json
  { "product_id": "...", "name": "Baguette", "stock_qty": 15, "available": true }
  ```

- [ ] **Step 3: Tester — product_id manquant**

  ```bash
  curl "http://localhost:3000/api/crm/stock"
  ```

  Expected : `{ "error": "product_id query param required" }` avec status 400

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/api/crm/stock/route.ts
  git commit -m "feat: add GET /api/crm/stock route"
  ```

---

## Task 6: GET + POST /api/crm/orders

**Files:**
- Create: `src/app/api/crm/orders/route.ts`

- [ ] **Step 1: Créer la route**

  ```typescript
  // src/app/api/crm/orders/route.ts
  import { NextRequest, NextResponse } from 'next/server'
  import { createServerClient } from '@/lib/supabase'

  export async function GET() {
    const supabase = createServerClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ orders: data })
  }

  export async function POST(request: NextRequest) {
    const body = await request.json()
    const { customer_name, items, pickup_time } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Fetch products to validate stock and get prices
    const productIds = items.map((i: { product_id: string }) => i.product_id)
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, price, stock_qty, unit')
      .in('id', productIds)

    if (fetchError || !products) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // 2. Check stock for each item
    for (const item of items as { product_id: string; qty: number }[]) {
      const product = products.find((p) => p.id === item.product_id)
      if (!product) {
        return NextResponse.json({ error: `Product ${item.product_id} not found` }, { status: 404 })
      }
      if (product.stock_qty < item.qty) {
        return NextResponse.json({
          error: 'stock_insufficient',
          product: product.name,
          available: product.stock_qty,
          requested: item.qty,
        }, { status: 409 })
      }
    }

    // 3. Build enriched order items
    const orderItems = (items as { product_id: string; qty: number }[]).map((item) => {
      const product = products.find((p) => p.id === item.product_id)!
      return {
        product_id: item.product_id,
        name: product.name,
        qty: item.qty,
        unit_price: product.price,
      }
    })

    const total = orderItems.reduce((sum, i) => sum + i.unit_price * i.qty, 0)

    // 4. Insert order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ customer_name, items: orderItems, total, pickup_time, status: 'confirmé' })
      .select()
      .single()

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    // 5. Decrement stock for each item (fire-and-forget updates)
    for (const item of items as { product_id: string; qty: number }[]) {
      const product = products.find((p) => p.id === item.product_id)!
      await supabase
        .from('products')
        .update({ stock_qty: product.stock_qty - item.qty })
        .eq('id', item.product_id)
    }

    return NextResponse.json({
      order_id: order.id,
      status: 'confirmé',
      total: Math.round(total * 100) / 100,
      items: orderItems,
    })
  }
  ```

- [ ] **Step 2: Tester GET**

  ```bash
  curl http://localhost:3000/api/crm/orders
  ```
  Expected : `{ "orders": [] }` (aucune commande pour l'instant)

- [ ] **Step 3: Tester POST — commande valide**

  Remplace `<UUID_BAGUETTE>` et `<UUID_CROISSANT>` par les vrais UUIDs de `/api/crm/products` :

  ```bash
  curl -X POST http://localhost:3000/api/crm/orders \
    -H "Content-Type: application/json" \
    -d '{
      "customer_name": "Sophie",
      "items": [
        { "product_id": "<UUID_BAGUETTE>", "qty": 2 },
        { "product_id": "<UUID_CROISSANT>", "qty": 3 }
      ],
      "pickup_time": "17h00"
    }'
  ```

  Expected :
  ```json
  {
    "order_id": "...",
    "status": "confirmé",
    "total": 5.70,
    "items": [
      { "name": "Baguette", "qty": 2, "unit_price": 1.20, "product_id": "..." },
      { "name": "Croissant", "qty": 3, "unit_price": 1.10, "product_id": "..." }
    ]
  }
  ```

  Vérifier dans Supabase Table Editor que :
  - La commande est bien présente dans `orders`
  - `stock_qty` de Baguette est passé de 15 à 13
  - `stock_qty` de Croissant est passé de 12 à 9

- [ ] **Step 4: Tester POST — stock insuffisant**

  ```bash
  curl -X POST http://localhost:3000/api/crm/orders \
    -H "Content-Type: application/json" \
    -d '{
      "customer_name": "Marc",
      "items": [{ "product_id": "<UUID_TARTE>", "qty": 99 }]
    }'
  ```

  Expected : status 409, `{ "error": "stock_insufficient", "product": "Tarte aux fraises", "available": 4, "requested": 99 }`

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/api/crm/orders/route.ts
  git commit -m "feat: add GET+POST /api/crm/orders route with stock decrement"
  ```

---

## Task 7: Dashboard /demo

**Files:**
- Create: `src/app/demo/page.tsx`

- [ ] **Step 1: Créer `src/app/demo/page.tsx`**

  ```typescript
  'use client'

  import { useEffect, useState } from 'react'
  import { supabase } from '@/lib/supabase'
  import Navbar from '@/components/layout/Navbar'

  interface Product {
    id: string
    name: string
    category: string
    stock_qty: number
    price: number
    unit: string
  }

  interface OrderItem {
    product_id: string
    name: string
    qty: number
    unit_price: number
  }

  interface Order {
    id: string
    created_at: string
    customer_name: string | null
    items: OrderItem[]
    total: number
    pickup_time: string | null
    status: string
  }

  export default function DemoPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [newOrderId, setNewOrderId] = useState<string | null>(null)

    useEffect(() => {
      fetchOrders()
      fetchProducts()

      const ordersChannel = supabase
        .channel('demo-orders')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            const newOrder = payload.new as Order
            setOrders((prev) => [newOrder, ...prev])
            setNewOrderId(newOrder.id)
            setTimeout(() => setNewOrderId(null), 3000)
          }
        )
        .subscribe()

      const productsChannel = supabase
        .channel('demo-products')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'products' },
          (payload) => {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === (payload.new as Product).id ? (payload.new as Product) : p
              )
            )
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(ordersChannel)
        supabase.removeChannel(productsChannel)
      }
    }, [])

    async function fetchOrders() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
      if (data) setOrders(data)
    }

    async function fetchProducts() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('category')
      if (data) setProducts(data)
    }

    const stockColor = (qty: number) =>
      qty === 0 ? 'text-red-400' : qty <= 5 ? 'text-amber-400' : 'text-emerald-400'

    const stockEmoji = (qty: number) =>
      qty === 0 ? '🔴' : qty <= 5 ? '🟡' : '🟢'

    const twilioNumber = process.env.NEXT_PUBLIC_TWILIO_NUMBER ?? '+33 X XX XX XX XX'

    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#0f172a] text-white pt-24 pb-12 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold">🥐 Boulangerie Demo — CRM Live</h1>
              <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                En ligne
              </span>
            </div>

            {/* Phone CTA */}
            <div className="bg-[#1e293b] border border-indigo-500/30 rounded-2xl p-6 text-center mb-8">
              <p className="text-gray-400 text-sm mb-2">
                📞 Appelez ce numéro pour tester l&apos;agent IA en direct
              </p>
              <p className="text-4xl font-bold text-indigo-400 tracking-wider mb-2">
                {twilioNumber}
              </p>
              <p className="text-gray-500 text-sm">
                Demandez les produits disponibles ou passez une commande — elle apparaît ici instantanément
              </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#1e293b] border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-4xl font-bold text-blue-400 mb-1">{orders.length}</div>
                <div className="text-gray-500 text-sm">commandes aujourd&apos;hui</div>
              </div>
              <div className="bg-[#1e293b] border border-gray-800 rounded-xl p-5 text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-1">
                  {products.filter((p) => p.stock_qty > 0).length}
                </div>
                <div className="text-gray-500 text-sm">produits disponibles</div>
              </div>
            </div>

            {/* Main grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Orders */}
              <div>
                <h2 className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                  Commandes du jour
                </h2>
                <div className="bg-[#1e293b] border border-gray-800 rounded-xl overflow-hidden min-h-[200px]">
                  {orders.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
                      Aucune commande — appelez le numéro !
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800/60">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className={`p-4 transition-all duration-700 ${
                            newOrderId === order.id
                              ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium">
                              {order.customer_name ?? 'Client'}
                            </span>
                            <span className="text-emerald-400 text-sm">✓ {order.status}</span>
                          </div>
                          <div className="text-gray-400 text-sm">
                            {order.items
                              .map((i) => `${i.qty}× ${i.name}`)
                              .join(', ')}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-600 text-xs">
                              {new Date(order.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {order.pickup_time && ` · retrait ${order.pickup_time}`}
                            </span>
                            <span className="text-white text-sm font-medium">
                              {order.total.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stock */}
              <div>
                <h2 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Stock</h2>
                <div className="bg-[#1e293b] border border-gray-800 rounded-xl overflow-hidden">
                  <div className="divide-y divide-gray-800/60">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div>
                          <span className="text-white">{product.name}</span>
                          <span className="text-gray-600 text-xs ml-2">
                            {product.category}
                          </span>
                        </div>
                        <span className={`font-medium tabular-nums ${stockColor(product.stock_qty)}`}>
                          {stockEmoji(product.stock_qty)} {product.stock_qty} {product.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tech stack footer */}
            <div className="mt-10 text-center text-gray-700 text-xs">
              Propulsé par VAPI · Claude Sonnet · ElevenLabs · Twilio · Supabase
            </div>
          </div>
        </div>
      </>
    )
  }
  ```

- [ ] **Step 2: Vérifier visuellement**

  Ouvre http://localhost:3000/demo. Tu dois voir :
  - Header avec badge "En ligne" pulsant
  - CTA avec le numéro Twilio
  - KPIs (1 commande si tu as testé Task 6, 7 produits)
  - Tableau commandes à gauche, stock à droite

- [ ] **Step 3: Tester le realtime**

  Dans un terminal séparé, passe une nouvelle commande via curl (Task 6 Step 3).
  La commande doit apparaître dans le dashboard avec un flash vert, et le stock se met à jour.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/demo/page.tsx
  git commit -m "feat: add /demo CRM dashboard with Supabase Realtime"
  ```

---

## Task 8: Homepage — section PhoneAgentPromo

**Files:**
- Create: `src/components/sections/PhoneAgentPromo.tsx`
- Modify: `src/lib/translations.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Ajouter les clés `phoneAgent` dans le type `Translations`**

  Dans `src/lib/translations.ts`, dans l'interface `Translations`, ajouter après le bloc `footer` :

  ```typescript
  phoneAgent: {
    badge: string;
    title: string;
    poweredBy: string;
    benefits: string[];
    cta_demo: string;
    cta_services: string;
  };
  ```

- [ ] **Step 2: Ajouter les traductions françaises**

  Dans l'objet `fr` des traductions, ajouter :

  ```typescript
  phoneAgent: {
    badge: 'Nouveau',
    title: 'Agent Vocal IA — Votre standard téléphonique automatisé',
    poweredBy: 'Powered by VAPI · Claude · ElevenLabs · Twilio',
    benefits: [
      'Disponible 24h/24 et 7j/7 sans décrocher',
      'Prend les commandes et RDV directement dans votre CRM',
      'Connecté à vos outils métier via protocole MCP',
    ],
    cta_demo: 'Voir la démo live',
    cta_services: 'En savoir plus',
  },
  ```

- [ ] **Step 3: Ajouter les traductions anglaises**

  Dans l'objet `en` :

  ```typescript
  phoneAgent: {
    badge: 'New',
    title: 'AI Voice Agent — Your phone line, automated',
    poweredBy: 'Powered by VAPI · Claude · ElevenLabs · Twilio',
    benefits: [
      'Available 24/7 without picking up the phone',
      'Takes orders and appointments directly into your CRM',
      'Connected to your business tools via MCP protocol',
    ],
    cta_demo: 'See live demo',
    cta_services: 'Learn more',
  },
  ```

- [ ] **Step 4: Ajouter les traductions thaïes**

  Dans l'objet `th` :

  ```typescript
  phoneAgent: {
    badge: 'ใหม่',
    title: 'AI Voice Agent — ระบบโทรศัพท์อัตโนมัติ',
    poweredBy: 'ขับเคลื่อนโดย VAPI · Claude · ElevenLabs · Twilio',
    benefits: [
      'พร้อมให้บริการ 24/7 โดยไม่ต้องรับสาย',
      'รับคำสั่งซื้อและนัดหมายลงใน CRM ของคุณ',
      'เชื่อมต่อกับเครื่องมือธุรกิจผ่านโปรโตคอล MCP',
    ],
    cta_demo: 'ดูเดโมสด',
    cta_services: 'เรียนรู้เพิ่มเติม',
  },
  ```

- [ ] **Step 5: Vérifier TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 6: Créer `src/components/sections/PhoneAgentPromo.tsx`**

  ```typescript
  'use client'

  import Link from 'next/link'
  import { useLanguage } from '@/context/LanguageContext'

  export default function PhoneAgentPromo() {
    const { t } = useLanguage()
    const ts = t.phoneAgent

    return (
      <section className="py-20 px-4 bg-black/40">
        <div className="max-w-6xl mx-auto">
          <div className="relative bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/10 border border-gray-800 rounded-3xl p-8 md:p-12 overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              {/* Left: text */}
              <div>
                <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
                  {ts.badge}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent leading-tight">
                  {ts.title}
                </h2>
                <p className="text-indigo-400/70 text-sm font-mono mb-6">{ts.poweredBy}</p>

                <ul className="space-y-3 mb-8">
                  {ts.benefits.map((benefit: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                      <span className="text-gray-300">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/demo"
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 rounded-full text-white font-semibold hover:from-emerald-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 text-center shadow-lg shadow-emerald-500/20"
                  >
                    {ts.cta_demo}
                  </Link>
                  <Link
                    href="/services"
                    className="px-6 py-3 border border-gray-600 rounded-full text-white font-medium hover:bg-white/10 transition-all duration-300 text-center"
                  >
                    {ts.cta_services}
                  </Link>
                </div>
              </div>

              {/* Right: architecture visual */}
              <div className="bg-[#0f172a] rounded-2xl p-6 border border-gray-800 font-mono text-sm">
                <div className="text-gray-500 text-xs uppercase tracking-widest mb-5">
                  Flux en temps réel
                </div>
                {[
                  { icon: '📞', label: 'Appel client', color: 'text-blue-400' },
                  { icon: '🔁', label: 'VAPI + Claude Sonnet', color: 'text-indigo-400' },
                  { icon: '🗄️', label: 'Outils MCP → CRM', color: 'text-purple-400' },
                  { icon: '✅', label: 'Commande confirmée', color: 'text-emerald-400' },
                ].map((step, i, arr) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 py-2">
                      <span className="text-lg">{step.icon}</span>
                      <span className={step.color}>{step.label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="text-gray-700 ml-1 leading-none">│</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }
  ```

- [ ] **Step 7: Insérer dans `src/app/page.tsx`**

  ```typescript
  import Hero from '@/components/sections/Hero';
  import About from '@/components/sections/About';
  import Projects from '@/components/sections/Projects';
  import PhoneAgentPromo from '@/components/sections/PhoneAgentPromo';
  import Contact from '@/components/sections/Contact';
  import Navbar from '@/components/layout/Navbar';
  import Footer from '@/components/layout/Footer';

  export default function Home() {
    return (
      <>
        <Navbar />
        <main>
          <Hero />
          <About />
          <Projects />
          <PhoneAgentPromo />
          <Contact />
        </main>
        <Footer />
      </>
    );
  }
  ```

- [ ] **Step 8: Vérifier visuellement**

  Ouvre http://localhost:3000. La section doit apparaître entre Projects et Contact avec le badge "Nouveau", les 3 bénéfices, et les deux CTA.

- [ ] **Step 9: Commit**

  ```bash
  git add src/components/sections/PhoneAgentPromo.tsx src/lib/translations.ts src/app/page.tsx
  git commit -m "feat: add PhoneAgentPromo section on homepage"
  ```

---

## Task 9: Services page — nouvelle offre + section explicative

**Files:**
- Modify: `src/lib/translations.ts`
- Modify: `src/app/services/page.tsx`

- [ ] **Step 1: Ajouter la traduction pour la section explicative**

  Dans `src/lib/translations.ts`, dans le type `Translations`, trouver le bloc `services` et ajouter :

  ```typescript
  // Dans Translations.services :
  phoneAgent: {
    badge: string;
    title: string;
    subtitle: string;
    steps: { icon: string; label: string; description: string }[];
    cta_label: string;
  };
  ```

  Et dans les 3 objets de traduction (`fr`, `en`, `th`), dans le bloc `services`, ajouter :

  **fr:**
  ```typescript
  phoneAgent: {
    badge: 'Nouveau',
    title: 'Comment fonctionne l\'agent vocal IA ?',
    subtitle: 'Une solution clé en main connectée à vos outils en quelques heures.',
    steps: [
      { icon: '📞', label: 'Le client appelle', description: 'Un numéro Twilio dédié à votre business.' },
      { icon: '🧠', label: 'L\'IA comprend', description: 'Claude Sonnet analyse la demande en français naturel.' },
      { icon: '🗄️', label: 'Le CRM est mis à jour', description: 'Via le protocole MCP, la commande ou le RDV s\'enregistre.' },
      { icon: '🔔', label: 'Vous êtes notifié', description: 'Votre dashboard se met à jour en temps réel.' },
    ],
    cta_label: 'Tester la démo live',
  },
  ```

  **en:**
  ```typescript
  phoneAgent: {
    badge: 'New',
    title: 'How does the AI voice agent work?',
    subtitle: 'A turnkey solution connected to your tools in a few hours.',
    steps: [
      { icon: '📞', label: 'Customer calls', description: 'A dedicated Twilio number for your business.' },
      { icon: '🧠', label: 'AI understands', description: 'Claude Sonnet processes the request in natural language.' },
      { icon: '🗄️', label: 'CRM is updated', description: 'Via MCP protocol, the order or appointment is recorded.' },
      { icon: '🔔', label: 'You are notified', description: 'Your dashboard updates in real time.' },
    ],
    cta_label: 'Try the live demo',
  },
  ```

  **th:**
  ```typescript
  phoneAgent: {
    badge: 'ใหม่',
    title: 'AI Voice Agent ทำงานอย่างไร?',
    subtitle: 'โซลูชันสำเร็จรูปที่เชื่อมต่อกับเครื่องมือของคุณในไม่กี่ชั่วโมง',
    steps: [
      { icon: '📞', label: 'ลูกค้าโทรเข้า', description: 'หมายเลข Twilio เฉพาะสำหรับธุรกิจของคุณ' },
      { icon: '🧠', label: 'AI เข้าใจ', description: 'Claude Sonnet วิเคราะห์คำขอด้วยภาษาธรรมชาติ' },
      { icon: '🗄️', label: 'CRM อัปเดต', description: 'ผ่านโปรโตคอล MCP คำสั่งซื้อหรือการนัดหมายถูกบันทึก' },
      { icon: '🔔', label: 'คุณได้รับการแจ้งเตือน', description: 'แดชบอร์ดของคุณอัปเดตแบบเรียลไทม์' },
    ],
    cta_label: 'ลองดูเดโมสด',
  },
  ```

- [ ] **Step 2: Ajouter la 4e carte dans les traductions de l'offre**

  Trouver `t.services.offers.items` dans les traductions et ajouter une 4e entrée (dans fr, en, th) :

  **fr:**
  ```typescript
  {
    name: 'Agent Vocal IA',
    tagline: 'Votre téléphone, automatisé par l\'IA',
    price: 'À partir de 990 €',
    description: 'Un agent téléphonique intelligent qui répond, qualifie et enregistre — 24h/24.',
    features: [
      'Setup VAPI + numéro Twilio',
      'Voix ElevenLabs ultra-naturelle',
      'Connexion CRM via protocole MCP',
      '1 scénario métier sur mesure',
      '1 mois de support inclus',
    ],
  }
  ```

  **en:**
  ```typescript
  {
    name: 'AI Voice Agent',
    tagline: 'Your phone line, automated by AI',
    price: 'From €990',
    description: 'An intelligent phone agent that answers, qualifies and records — 24/7.',
    features: [
      'VAPI + Twilio number setup',
      'Ultra-natural ElevenLabs voice',
      'CRM connection via MCP protocol',
      '1 custom business scenario',
      '1 month of support included',
    ],
  }
  ```

  **th:**
  ```typescript
  {
    name: 'AI Voice Agent',
    tagline: 'สายโทรศัพท์ของคุณ ขับเคลื่อนโดย AI',
    price: 'เริ่มต้นที่ 990 €',
    description: 'ตัวแทนโทรศัพท์อัจฉริยะที่ตอบ คัดกรอง และบันทึก — ตลอด 24 ชั่วโมง',
    features: [
      'ตั้งค่า VAPI + หมายเลข Twilio',
      'เสียง ElevenLabs แบบธรรมชาติ',
      'เชื่อมต่อ CRM ผ่านโปรโตคอล MCP',
      '1 สถานการณ์ธุรกิจที่กำหนดเอง',
      'รองรับ 1 เดือน',
    ],
  }
  ```

- [ ] **Step 3: Ajouter un 4e gradient dans `OffersSection`**

  Dans `src/app/services/page.tsx`, trouver le tableau `gradients` dans `OffersSection` et ajouter une 4e couleur :

  ```typescript
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-indigo-500',
    'from-purple-500 to-pink-500',
    'from-orange-500 to-rose-500',  // ← ajouter
  ];
  ```

- [ ] **Step 4: Ajouter `PhoneAgentSection` dans `src/app/services/page.tsx`**

  Ajouter cette fonction AVANT `MaintenanceSection` dans le fichier :

  ```typescript
  function PhoneAgentSection() {
    const { t } = useLanguage()
    const ts = t.services.phoneAgent

    return (
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm font-medium mb-4">
              {ts.badge}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {ts.title}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto mb-6 rounded-full" />
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">{ts.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {ts.steps.map((step: { icon: string; label: string; description: string }, i: number) => (
              <div key={i} className="relative">
                {i < ts.steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-500/30 to-transparent z-0" />
                )}
                <div className="relative z-10 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center hover:border-indigo-500/30 transition-all duration-300">
                  <span className="text-4xl mb-4 block">{step.icon}</span>
                  <h3 className="text-white font-semibold mb-2">{step.label}</h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-indigo-500/25"
            >
              {ts.cta_label}
              <ArrowIcon />
            </a>
          </div>
        </div>
      </section>
    )
  }
  ```

- [ ] **Step 5: Insérer `<PhoneAgentSection />` dans `ServicesPage`**

  Dans la fonction `ServicesPage` à la fin du fichier, insérer `<PhoneAgentSection />` avant `<MaintenanceSection />` :

  ```typescript
  export default function ServicesPage() {
    return (
      <>
        <Navbar />
        <main>
          <ServicesHero />
          <ProblemSection />
          <SolutionSection />
          <OffersSection />
          <PhoneAgentSection />
          <MaintenanceSection />
          <UpsellSection />
          <MethodologySection />
          <ReassuranceSection />
          <PartnersBanner />
          <FinalCTA />
        </main>
        <Footer />
      </>
    );
  }
  ```

- [ ] **Step 6: Vérifier TypeScript**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 7: Vérifier visuellement**

  Ouvre http://localhost:3000/services. Tu dois voir :
  - La nouvelle carte "Agent Vocal IA" dans la section Offres (4e carte)
  - La section "Comment fonctionne l'agent vocal IA ?" avec les 4 étapes avant Maintenance

- [ ] **Step 8: Commit**

  ```bash
  git add src/lib/translations.ts src/app/services/page.tsx
  git commit -m "feat: add phone agent offer and explainer section on /services"
  ```

---

## Task 10: Configuration VAPI (documentation)

Cette tâche documente la config VAPI à saisir dans l'interface VAPI dashboard.

- [ ] **Step 1: Déployer le portfolio sur Vercel pour obtenir l'URL de prod**

  ```bash
  git push origin master
  ```

  Note l'URL Vercel de production (ex: `https://portfolio-abc.vercel.app`).

- [ ] **Step 2: Ajouter les env vars dans Vercel**

  Dans Vercel → Settings → Environment Variables, ajouter :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_TWILIO_NUMBER`

- [ ] **Step 3: Créer l'assistant VAPI**

  Sur https://dashboard.vapi.ai → Assistants → Create :

  **Model :** Claude (Anthropic) → `claude-sonnet-4-6`

  **System Prompt :**
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

  **Voice :** ElevenLabs → choisir `Serena` (ID: `pFZP5JQG7iQjIQuC4Bku`) ou `Charlotte` (ID: `XB0fDUnXU5powFXDhCwa`) — tester les deux pour choisir la plus naturelle en français.

  **Transcriber :** Deepgram → langue `fr`

- [ ] **Step 4: Ajouter les 3 tools VAPI**

  Dans l'assistant → Tools → Add Tool (type "Function") :

  **Tool 1 — get_products**
  ```
  Name: get_products
  Description: Récupère la liste des produits disponibles aujourd'hui avec leur stock et prix
  URL: https://<votre-domaine-vercel>/api/crm/products
  Method: GET
  ```

  **Tool 2 — check_stock**
  ```
  Name: check_stock
  Description: Vérifie le stock disponible pour un produit spécifique
  URL: https://<votre-domaine-vercel>/api/crm/stock
  Method: GET
  Parameters:
    product_id (string, required): UUID du produit à vérifier
  ```

  **Tool 3 — create_order**
  ```
  Name: create_order
  Description: Enregistre une commande client et met à jour le stock en temps réel
  URL: https://<votre-domaine-vercel>/api/crm/orders
  Method: POST
  Parameters:
    customer_name (string, optional): Prénom du client
    items (array, required): Liste [{product_id: string, qty: integer}]
    pickup_time (string, optional): Heure de retrait souhaitée ex: "17h30"
  ```

- [ ] **Step 5: Connecter le numéro Twilio**

  Dans VAPI → Phone Numbers → Import (Twilio) → saisir les credentials Twilio (Account SID + Auth Token) → sélectionner le numéro → assigner l'assistant créé à Step 3.

- [ ] **Step 6: Test end-to-end**

  Appelle le numéro Twilio depuis un téléphone. Dis : _"Bonjour, vous avez encore des croissants ?"_
  
  Attendu :
  - L'agent répond avec le stock actuel
  - Dans le dashboard `/demo`, le stock se met à jour si une commande est passée
  - La commande apparaît en temps réel avec animation verte

---

## Checklist de couverture spec

| Exigence spec | Tâche |
|---------------|-------|
| Supabase schema (products + orders) | Task 2 |
| Supabase Realtime activé | Task 2 Step 2 |
| Seed 7 produits | Task 2 Step 3 |
| RLS configuré | Task 2 Step 4 |
| Client Supabase browser + serveur | Task 3 |
| GET /api/crm/products | Task 4 |
| GET /api/crm/stock | Task 5 |
| POST /api/crm/orders + décrémente stock | Task 6 |
| Dashboard /demo avec KPIs + commandes + stock | Task 7 |
| Realtime subscription sur orders + products | Task 7 |
| Animation flash sur nouvelle commande | Task 7 |
| Badge couleur stock (🟢🟡🔴) | Task 7 |
| Section PhoneAgentPromo homepage | Task 8 |
| Traductions fr/en/th phoneAgent | Task 8 |
| Nouvelle carte "Agent Vocal IA" dans /services | Task 9 |
| Section explicative 4 étapes dans /services | Task 9 |
| Config VAPI (prompt + 3 tools + voice + STT) | Task 10 |
| Connexion Twilio | Task 10 Step 5 |
