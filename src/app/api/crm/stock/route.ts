import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const product_id = searchParams.get('product_id')

  if (!product_id) {
    return NextResponse.json({ error: 'product_id query param required' }, { status: 400 })
  }

  return handler(product_id)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const product_id = body.product_id

  if (!product_id) {
    return NextResponse.json({ error: 'product_id required' }, { status: 400 })
  }

  return handler(product_id)
}

async function handler(product_id: string) {

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
