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
