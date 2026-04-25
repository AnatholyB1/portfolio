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
  const { customer_name, pickup_time } = body
  let items = body.items

  // VAPI envoie items comme string JSON quand le type est "string"
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items)
    } catch {
      return NextResponse.json({ error: 'items must be a valid JSON array' }, { status: 400 })
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items array required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const productIds = items.map((i: { product_id: string }) => i.product_id)
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, price, stock_qty, unit')
    .in('id', productIds)

  if (fetchError || !products) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }

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

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ customer_name, items: orderItems, total, pickup_time, status: 'confirmé' })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

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
