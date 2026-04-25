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
