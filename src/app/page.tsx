'use client'

import { useState, useEffect } from 'react'
import { useRole } from '@/context/RoleContext'
import CreateOrderModal from '@/components/CreateOrderModal'
import { Plus, Scissors, CheckCircle2, Factory } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import VerifierDashboard from '@/components/VerifierDashboard'
import SewingDashboard from '@/components/SewingDashboard'

export default function Dashboard() {
  const { user } = useRole()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const supabase = createClient()

  const fetchOrders = async () => {
    const { data } = await fetch('/api/orders').then(res => res.json())
    if (data) setOrders(data)
    else {
      // Direct supabase fetch as fallback if API route has issues parsing
      const res = await supabase.from('cutting_orders').select(`
        *,
        recipe:recipes(name, recipe_code),
        creator:users!cutting_orders_created_by_fkey(full_name)
      `).order('created_at', { ascending: false })
      if (res.data) setOrders(res.data)
    }
  }

  const handleResubmit = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/resubmit`, {
        method: 'POST'
      })
      if (res.ok) {
        fetchOrders()
      } else {
        alert("Failed to resubmit order.")
      }
    } catch (err) {
      alert("Error resubmitting order.")
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ApparelFlow ERP</h1>
        <p className="text-gray-500 mt-2 text-lg">Welcome back, <span className="font-semibold text-gray-800">{user.full_name}</span> ({user.role})</p>
      </header>

      {user.role === 'cutting_supervisor' && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-blue-600" />
                Cutting Operations
              </h2>
              <p className="text-gray-500 mt-1">Manage production recipes and create new cutting batches.</p>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Batch
            </button>
          </div>
        </section>
      )}

      {user.role === 'cutting_verifier' && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
              Verification Terminal
            </h2>
            <p className="text-gray-500 mt-1">Review pending cutting batches and count components.</p>
            <VerifierDashboard />
          </div>
        </section>
      )}

      {user.role === 'sewing_supervisor' && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Factory className="w-5 h-5 text-emerald-600" />
              Sewing Queue
            </h2>
            <p className="text-gray-500 mt-1 mb-4">Batches ready for sewing assembly.</p>
            <SewingDashboard />
          </div>
        </section>
      )}

      {/* Orders List for Supervisor */}
      {user.role === 'cutting_supervisor' && (
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Cutting Batches</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                  <th className="py-3 px-4 font-semibold">Order No</th>
                  <th className="py-3 px-4 font-semibold">Recipe</th>
                  <th className="py-3 px-4 font-semibold">Target Qty</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">No orders found. Create one above!</td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{order.order_no}</td>
                      <td className="py-3 px-4 text-gray-600">{order.recipe?.name} ({order.recipe?.recipe_code})</td>
                      <td className="py-3 px-4 text-gray-600">{order.target_qty} units</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${order.status === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-800' : ''}
                          ${order.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : ''}
                          ${order.status === 'REJECTED' ? 'bg-red-100 text-red-800' : ''}
                          ${order.status === 'CUTTING_IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : ''}
                        `}>
                          {order.status.replace('_', ' ')}
                        </span>
                        {order.status === 'REJECTED' && (
                          <button 
                            onClick={() => handleResubmit(order.id)}
                            className="ml-3 text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
                          >
                            Re-submit
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <CreateOrderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchOrders}
      />
    </div>
  )
}
