import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User role not found' }, { status: 403 })
    }

    // Use Admin Client to bypass RLS for aggregate counting, 
    // BUT we manually enforce isolation based on role!
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js')
    const adminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let analytics = {}

    if (user.role === 'cutting_supervisor') {
      const { count: pendingCount } = await adminClient.from('cutting_orders').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION')
      const { count: verifiedCount } = await adminClient.from('cutting_orders').select('*', { count: 'exact', head: true }).eq('status', 'VERIFIED')
      const { count: rejectedCount } = await adminClient.from('cutting_orders').select('*', { count: 'exact', head: true }).eq('status', 'REJECTED')
      
      analytics = {
        title: "Cutting Department Overview",
        stats: [
          { label: 'Pending Verification', value: pendingCount || 0, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Verified Batches', value: verifiedCount || 0, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Rejected Batches', value: rejectedCount || 0, color: 'text-red-600', bg: 'bg-red-100' },
        ]
      }
    } else if (user.role === 'cutting_verifier') {
      const { count: queueCount } = await adminClient.from('cutting_orders').select('*', { count: 'exact', head: true }).eq('status', 'PENDING_VERIFICATION')
      const { count: myApprovals } = await adminClient.from('verification_logs').select('*', { count: 'exact', head: true }).eq('verifier_id', authUser.id).eq('decision', 'APPROVED')
      const { count: myRejections } = await adminClient.from('verification_logs').select('*', { count: 'exact', head: true }).eq('verifier_id', authUser.id).eq('decision', 'REJECTED')

      analytics = {
        title: "Verifier Performance",
        stats: [
          { label: 'Items in Queue', value: queueCount || 0, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'My Approvals', value: myApprovals || 0, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'My Rejections', value: myRejections || 0, color: 'text-red-600', bg: 'bg-red-100' },
        ]
      }
    } else if (user.role === 'sewing_supervisor') {
      // Sewing can ONLY see VERIFIED related stats
      const { count: readyCount } = await adminClient.from('cutting_orders').select('*', { count: 'exact', head: true }).eq('status', 'VERIFIED')
      
      analytics = {
        title: "Sewing Floor Queue",
        stats: [
          { label: 'Ready for Assembly', value: readyCount || 0, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'In Production', value: 0, color: 'text-blue-600', bg: 'bg-blue-100' }, // Placeholder for future feature
          { label: 'Completed Today', value: 0, color: 'text-purple-600', bg: 'bg-purple-100' },
        ]
      }
    }

    return NextResponse.json({ success: true, analytics }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
