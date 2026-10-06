import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const orderId = params.id
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

    // Server-side RBAC: Only cutting_supervisor can resubmit
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user || user.role !== 'cutting_supervisor') {
      return NextResponse.json({ error: 'Forbidden: Only Cutting Supervisor can resubmit batches' }, { status: 403 })
    }

    // Update the order status back to PENDING_VERIFICATION
    const { error: orderUpdateError } = await supabase
      .from('cutting_orders')
      .update({ status: 'PENDING_VERIFICATION' })
      .eq('id', orderId)
      .eq('status', 'REJECTED') // Only rejected ones can be resubmitted

    if (orderUpdateError) {
      return NextResponse.json({ error: 'Failed to resubmit order' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Internal server error' }, { status: 500 })
  }
}
