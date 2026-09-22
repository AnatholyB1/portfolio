# Feuillette Demo Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer une page `/demo/feuillette` brandée Feuillette (couleurs, police Cormorant) qui affiche en temps réel les commandes et le stock via Supabase, en réutilisant les tables `orders` et `products` existantes.

**Architecture:** Copie de la logique de `/demo/page.tsx`, reskinned aux couleurs Feuillette. Pas de nouvelles tables — les données sont partagées. La police Cormorant Garamond est importée localement dans la page via `next/font/google` (sans polluer le layout global).

**Tech Stack:** Next.js 14 App Router, Supabase Realtime, Tailwind CSS, next/font/google (Cormorant Garamond)

---

## File Map

| Action | Fichier |
|---|---|
| CREATE | `src/app/demo/feuillette/page.tsx` |
| SQL SEED | à exécuter dans Supabase Dashboard ou via MCP |

---

### Task 1 : Seed des produits Feuillette en BDD

**Files:**
- SQL à exécuter dans Supabase (table `products`)

- [ ] **Step 1 : Vider et repeupler la table `products`**

Exécuter ce SQL dans le Supabase Dashboard (SQL Editor) ou via MCP `execute_sql` :

```sql
TRUNCATE products RESTART IDENTITY;

INSERT INTO products (name, category, stock_qty, price, unit) VALUES
  ('Croissant au beurre',    'Viennoiserie',  24, 1.40, 'pièce'),
  ('Pain au chocolat',       'Viennoiserie',  18, 1.50, 'pièce'),
  ('Baguette tradition',     'Boulangerie',   30, 1.30, 'pièce'),
  ('Pain de campagne',       'Boulangerie',   12, 4.20, 'pièce'),
  ('Paris-Brest',            'Pâtisserie',     8, 5.80, 'pièce'),
  ('Tarte aux fraises',      'Pâtisserie',     6, 4.90, 'part'),
  ('Macaron assortiment',    'Pâtisserie',    20, 2.20, 'pièce'),
  ('Sandwich jambon-beurre', 'Restauration',  10, 5.50, 'pièce'),
  ('Café',                   'Salon de thé',  50, 2.50, 'tasse'),
  ('Thé du jour',            'Salon de thé',  40, 3.00, 'tasse');
```

- [ ] **Step 2 : Vérifier le résultat**

```sql
SELECT name, category, stock_qty FROM products ORDER BY category, name;
```

Attendu : 10 lignes, toutes des produits Feuillette.

- [ ] **Step 3 : Commit**

```bash
rtk git add docs/superpowers/plans/2026-05-08-feuillette-demo-page.md
rtk git commit -m "chore: seed feuillette products in supabase (see plan)"
```

---

### Task 2 : Créer la page `/demo/feuillette`

**Files:**
- Create: `src/app/demo/feuillette/page.tsx`

- [ ] **Step 1 : Créer le fichier**

Créer `src/app/demo/feuillette/page.tsx` avec le contenu suivant :

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Cormorant_Garamond } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/layout/Navbar'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-cormorant',
})

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

export default function FeuilletteDemo() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [newOrderId, setNewOrderId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
    fetchProducts()

    const ordersChannel = supabase
      .channel('feuillette-orders')
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
      .channel('feuillette-products')
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
    qty === 0 ? 'text-red-600' : qty <= 5 ? 'text-amber-600' : 'text-emerald-700'

  const stockEmoji = (qty: number) =>
    qty === 0 ? '🔴' : qty <= 5 ? '🟡' : '🟢'

  const twilioNumber = process.env.NEXT_PUBLIC_TWILIO_NUMBER ?? '+33 X XX XX XX XX'

  return (
    <div className={cormorant.variable}>
      <Navbar />
      <div
        className="min-h-screen pt-24 pb-12 px-4"
        style={{ backgroundColor: '#f5ede0', color: '#241C10', fontFamily: 'var(--font-cormorant), serif' }}
      >
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="text-5xl font-medium tracking-wide"
                style={{ fontFamily: 'var(--font-cormorant), serif', color: '#241C10' }}
              >
                Feuillette
              </h1>
              <p className="text-sm tracking-widest mt-1" style={{ color: '#5a3217' }}>
                Boulangerie · Pâtisserie · Restauration
              </p>
            </div>
            <span
              className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
              style={{
                backgroundColor: 'rgba(90,50,23,0.08)',
                border: '1px solid rgba(90,50,23,0.25)',
                color: '#5a3217',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              En ligne
            </span>
          </div>

          {/* Bloc numéro VAPI */}
          <div
            className="rounded-2xl p-6 text-center mb-8"
            style={{
              backgroundColor: '#ede3d0',
              border: '1px solid rgba(90,50,23,0.2)',
            }}
          >
            <p className="text-sm mb-2" style={{ color: '#5a3217' }}>
              📞 Appelez ce numéro pour tester l&apos;agent IA en direct
            </p>
            <p
              className="text-4xl font-medium tracking-wider mb-2"
              style={{ fontFamily: 'var(--font-cormorant), serif', color: '#5a3217' }}
            >
              {twilioNumber}
            </p>
            <p className="text-sm" style={{ color: '#8a6a50' }}>
              Demandez les produits disponibles ou passez une commande — elle apparaît ici instantanément
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div
              className="rounded-xl p-5 text-center"
              style={{ backgroundColor: '#ede3d0', border: '1px solid rgba(90,50,23,0.15)' }}
            >
              <div
                className="text-4xl font-medium mb-1"
                style={{ fontFamily: 'var(--font-cormorant), serif', color: '#5a3217' }}
              >
                {orders.length}
              </div>
              <div className="text-sm" style={{ color: '#8a6a50' }}>commandes aujourd&apos;hui</div>
            </div>
            <div
              className="rounded-xl p-5 text-center"
              style={{ backgroundColor: '#ede3d0', border: '1px solid rgba(90,50,23,0.15)' }}
            >
              <div
                className="text-4xl font-medium mb-1"
                style={{ fontFamily: 'var(--font-cormorant), serif', color: '#5a3217' }}
              >
                {products.filter((p) => p.stock_qty > 0).length}
              </div>
              <div className="text-sm" style={{ color: '#8a6a50' }}>produits disponibles</div>
            </div>
          </div>

          {/* Grille commandes / stock */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Commandes */}
            <div>
              <h2
                className="text-xs uppercase tracking-widest mb-3"
                style={{ color: '#8a6a50' }}
              >
                Commandes du jour
              </h2>
              <div
                className="rounded-xl overflow-hidden min-h-[200px]"
                style={{ backgroundColor: '#ede3d0', border: '1px solid rgba(90,50,23,0.15)' }}
              >
                {orders.length === 0 ? (
                  <div
                    className="flex items-center justify-center h-48 text-sm"
                    style={{ color: '#a08060' }}
                  >
                    Aucune commande — appelez le numéro !
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'rgba(90,50,23,0.1)' }}>
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 transition-all duration-700"
                        style={
                          newOrderId === order.id
                            ? { backgroundColor: 'rgba(90,50,23,0.08)', borderLeft: '2px solid #5a3217' }
                            : {}
                        }
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium" style={{ color: '#241C10' }}>
                            {order.customer_name ?? 'Client'}
                          </span>
                          <span className="text-sm text-emerald-700">✓ {order.status}</span>
                        </div>
                        <div className="text-sm" style={{ color: '#5a3217' }}>
                          {order.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs" style={{ color: '#a08060' }}>
                            {new Date(order.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {order.pickup_time && ` · retrait ${order.pickup_time}`}
                          </span>
                          <span className="text-sm font-medium" style={{ color: '#241C10' }}>
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
              <h2
                className="text-xs uppercase tracking-widest mb-3"
                style={{ color: '#8a6a50' }}
              >
                Stock
              </h2>
              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: '#ede3d0', border: '1px solid rgba(90,50,23,0.15)' }}
              >
                <div className="divide-y" style={{ borderColor: 'rgba(90,50,23,0.1)' }}>
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4">
                      <div>
                        <span style={{ color: '#241C10' }}>{product.name}</span>
                        <span className="text-xs ml-2" style={{ color: '#a08060' }}>
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

          {/* Footer mini */}
          <div className="mt-10 text-center text-xs" style={{ color: '#c0a882' }}>
            Propulsé par VAPI · Claude Sonnet · ElevenLabs · Twilio · Supabase
          </div>

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier que la route est accessible**

```bash
# Si le dev server est lancé :
# Ouvrir http://localhost:3000/demo/feuillette
# Attendu : page avec fond crème, "Feuillette" en grand Cormorant, liste des produits
```

- [ ] **Step 3 : Commit**

```bash
rtk git add src/app/demo/feuillette/page.tsx
rtk git commit -m "feat: add /demo/feuillette branded demo page for Feuillette national pitch"
```
