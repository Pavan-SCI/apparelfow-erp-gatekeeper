import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface VerificationItem {
  id?: string;
  component_id: string;
  expected_qty: number;
  actual_qty: number;
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const orderId = params.id
    
    const authHeader = request.headers.get('Authorization')
    let supabase = await createClient()

    // If Authorization header is present (API clients), override the client to use it
    if (authHeader) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      )
    }

    let authUser = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const result = await supabase.auth.getUser(token)
      authUser = result.data.user
      authError = result.error
    } else {
      const result = await supabase.auth.getUser()
      authUser = result.data.user
      authError = result.error
    }

    if (authError || !authUser) {
      console.error("Auth Error:", authError?.message || "No user found")
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No active session'}` }, { status: 401 })
    }

    const userId = authUser.id

    // Server-side RBAC: Only cutting_verifier can verify orders
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    console.log("verify route auth check:", { userId, user, userError })

    if (userError || !user || user.role !== 'cutting_verifier') {
      return NextResponse.json({ error: 'Forbidden: Only Cutting Verifier can verify batches' }, { status: 403 })
    }

    const body = await request.json()
    const { items, decision, rejection_note } = body

    if (!items || !Array.isArray(items) || !decision) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (decision === 'REJECTED' && (!rejection_note || rejection_note.trim() === '')) {
      return NextResponse.json({ error: 'Rejection note is mandatory when rejecting a batch.' }, { status: 400 })
    }

    // Get order to calculate wastage
    const { data: order, error: orderFetchError } = await supabase
      .from('cutting_orders')
      .select('*, recipe:recipes(std_fabric_yards)')
      .eq('id', orderId)
      .single()
      
    if (orderFetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status !== 'PENDING_VERIFICATION') {
      return NextResponse.json({ error: 'Forbidden: Order is not pending verification' }, { status: 403 })
    }

    // Calculate actuals and expected for the traffic light logic server-side
    let hasShortage = false

    const itemsToUpdate = items.map((item: VerificationItem) => {
      let status = 'GREEN'
      if (item.actual_qty < item.expected_qty) {
        status = 'RED'
        hasShortage = true
      } else if (item.actual_qty > item.expected_qty) {
        status = 'YELLOW'
      }

      return {
        id: item.id,
        order_id: orderId,
        component_id: item.component_id,
        expected_qty: item.expected_qty,
        actual_qty: item.actual_qty,
        status: status
      }
    })

    // HARD STOP: Reject if attempting to approve with shortages
    if (decision === 'APPROVED' && hasShortage) {
      return NextResponse.json({ 
        error: 'Unprocessable Entity: Cannot approve a batch with component shortages.' 
      }, { status: 422 })
    }

    // Calculate wastage
    // Fabric Wastage % = [ (Actual Fabric Used − Expected Fabric) ÷ Expected Fabric ] × 100
    const expectedFabric = order.target_qty * order.recipe.std_fabric_yards
    const actualFabric = order.actual_fabric_yds
    const wastagePct = expectedFabric > 0 
      ? ((actualFabric - expectedFabric) / expectedFabric) * 100 
      : 0

    // Begin transaction-like operations using Admin Client (bypassing the read-only RLS)
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js')
    const adminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Update verification items
    const { error: itemsUpdateError } = await adminClient
      .from('verification_items')
      .upsert(itemsToUpdate)

    if (itemsUpdateError) throw itemsUpdateError

    // 2. Insert verification log
    const { error: logError } = await adminClient
      .from('verification_logs')
      .insert({
        order_id: orderId,
        verifier_id: userId,
        decision: decision,
        rejection_note: decision === 'REJECTED' ? rejection_note : null,
        wastage_pct: wastagePct,
        component_variances: itemsToUpdate
      })

    if (logError) throw logError

    // 3. Update order status
    const newStatus = decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED'
    const { error: orderUpdateError } = await adminClient
      .from('cutting_orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (orderUpdateError) throw orderUpdateError

    return NextResponse.json({ success: true, status: newStatus }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('verification_items')
    .select(`
      *,
      component:recipe_components(component_name)
    `)
    .eq('order_id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data })
}
