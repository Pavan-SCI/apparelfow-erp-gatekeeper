import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    let supabase = await createClient()

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
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 })
    }

    const userId = authUser.id

    // Server-side RBAC: Only sewing_supervisor can start sewing
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user || user.role !== 'sewing_supervisor') {
      return NextResponse.json({ error: 'Forbidden: Only Sewing Supervisor can start assembly' }, { status: 403 })
    }

    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Verify order is currently VERIFIED
    const { data: orderData, error: orderCheckError } = await supabase
      .from('cutting_orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (orderCheckError || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (orderData.status !== 'VERIFIED') {
      return NextResponse.json({ error: 'Order is not in VERIFIED state' }, { status: 422 })
    }

    // Update status using Admin Client (RLS bypass needed for mutation)
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js')
    const adminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: updateError } = await adminClient
      .from('cutting_orders')
      .update({ status: 'SEWING_IN_PROGRESS', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (updateError) {
      console.error(updateError)
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'SEWING_IN_PROGRESS' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 })
  }
}
