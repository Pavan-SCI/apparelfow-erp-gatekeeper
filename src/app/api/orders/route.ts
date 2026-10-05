import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 })
    }

    const userId = authUser.id

    const body = await request.json()
    const { recipe_id, target_qty, fabric_roll_id, actual_fabric_yds } = body

    if (!recipe_id || !target_qty || !fabric_roll_id || !actual_fabric_yds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Server-side RBAC
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    if (user.role !== 'cutting_supervisor') {
      return NextResponse.json({ error: 'Forbidden: Only Cutting Supervisor can create orders' }, { status: 403 })
    }

    // Get the recipe and its components
    const { data: components, error: compError } = await supabase
      .from('recipe_components')
      .select('id, pieces_per_garment')
      .eq('recipe_id', recipe_id)

    if (compError || !components) {
      return NextResponse.json({ error: 'Failed to fetch recipe components' }, { status: 500 })
    }

    const orderNo = `ORD-${Date.now().toString().slice(-6)}`

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('cutting_orders')
      .insert({
        order_no: orderNo,
        recipe_id,
        target_qty,
        fabric_roll_id,
        actual_fabric_yds,
        created_by: userId,
        status: 'PENDING_VERIFICATION' // Immediately goes to verification queue
      })
      .select()
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Insert verification items using the multiplier logic
    const verificationItems = components.map(comp => ({
      order_id: order.id,
      component_id: comp.id,
      expected_qty: comp.pieces_per_garment * target_qty,
      status: null
    }))

    const { error: itemsError } = await supabase
      .from('verification_items')
      .insert(verificationItems)

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to create verification items' }, { status: 500 })
    }

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  
  let query = supabase.from('cutting_orders').select(`
    *,
    recipe:recipes(name, recipe_code),
    creator:users!cutting_orders_created_by_fkey(full_name)
  `).order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders: data })
}
