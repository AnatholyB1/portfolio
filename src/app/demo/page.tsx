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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">🥐 Boulangerie Demo — CRM Live</h1>
            <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              En ligne
            </span>
          </div>

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

          <div className="grid lg:grid-cols-2 gap-6">
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
                          {order.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
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

            <div>
              <h2 className="text-xs text-gray-400 uppercase tracking-widest mb-3">Stock</h2>
              <div className="bg-[#1e293b] border border-gray-800 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-800/60">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4">
                      <div>
                        <span className="text-white">{product.name}</span>
                        <span className="text-gray-600 text-xs ml-2">{product.category}</span>
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

          <div className="mt-10 text-center text-gray-700 text-xs">
            Propulsé par VAPI · Claude Sonnet · ElevenLabs · Twilio · Supabase
          </div>
        </div>
      </div>
    </>
  )
}
