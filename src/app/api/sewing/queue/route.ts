import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 })
    }

    const userId = authUser.id

    // Server-side RBAC: Only sewing_supervisor can access the sewing queue
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user || user.role !== 'sewing_supervisor') {
      return NextResponse.json({ error: 'Forbidden: Only Sewing Supervisor can access the sewing queue' }, { status: 403 })
    }

    // Query Isolation: MUST enforce status = 'VERIFIED' at the database level
    // We also fetch related data: recipe, verification items, verification logs (verifier attribution & wastage)
    const { data: orders, error: ordersError } = await supabase
      .from('cutting_orders')
      .select(`
        *,
        recipe:recipes(name, recipe_code),
        creator:users!cutting_orders_created_by_fkey(full_name),
        verification_items(
          expected_qty,
          actual_qty,
          status,
          component:recipe_components(component_name)
        ),
        verification_logs!inner(
          wastage_pct,
          timestamp,
          verifier:users!verification_logs_verifier_id_fkey(full_name)
        )
      `)
      .eq('status', 'VERIFIED')
      .order('updated_at', { ascending: false })

    if (ordersError) {
      console.error(ordersError)
      return NextResponse.json({ error: 'Failed to fetch sewing queue' }, { status: 500 })
    }

    return NextResponse.json({ data: orders }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
