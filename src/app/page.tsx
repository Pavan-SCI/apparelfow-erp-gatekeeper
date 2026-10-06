/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { useRole } from '@/context/RoleContext'
import CreateOrderModal from '@/components/cutting/CreateOrderModal'
import { Plus, Scissors, CheckCircle2, Factory } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import useSWR from 'swr'
import VerifierDashboard from '@/components/verification/VerifierDashboard'
import SewingDashboard from '@/components/sewing/SewingDashboard'
import RoleSwitcher from '@/components/auth/RoleSwitcher'

import AnalyticsCards from '@/components/AnalyticsCards'

export default function Dashboard() {
  const { user } = useRole()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const fetcher = async () => {
    const res = await fetch('/api/orders')
    if (!res.ok) throw new Error('Failed to fetch orders')
    const { orders } = await res.json()
    return orders || []
  }

  const { data: orders = [], mutate } = useSWR('cutting-orders', fetcher, {
    revalidateOnFocus: true
  })

  const handleResubmit = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/resubmit`, {
        method: 'POST'
      })
      if (res.ok) {
        mutate() // Re-fetch orders via SWR
      } else {
        alert("Failed to resubmit order.")
      }
    } catch (err) {
      alert("Error resubmitting order.")
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      <header className="mb-10 backdrop-blur-sm bg-white/50 p-6 rounded-3xl border border-white shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent tracking-tight">ApparelFlow ERP</h1>
          <p className="text-gray-500 mt-2 text-lg">Welcome back, <span className="font-semibold text-gray-800">{user.full_name}</span> <span className="text-sm bg-gray-200/70 px-2 py-1 rounded-md ml-1 text-gray-600">{user.role.replace('_', ' ')}</span></p>
        </div>
        <div className="hidden sm:block">
           <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center transform rotate-3">
              <Factory className="w-6 h-6 text-white" />
           </div>
        </div>
      </header>

      <AnalyticsCards />

      {user.role === 'cutting_supervisor' && (
        <section className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-blue-900/5 border border-white p-8 mb-10 transition-all hover:shadow-2xl hover:shadow-blue-900/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-700">
                  <Scissors className="w-6 h-6" />
                </div>
                Cutting Operations
              </h2>
              <p className="text-gray-500 mt-2 ml-14">Manage production recipes and dispatch new cutting batches to verification.</p>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
            >
              <Plus className="w-5 h-5" />
              Dispatch New Batch
            </button>
          </div>
        </section>
      )}

      {user.role === 'cutting_verifier' && (
        <section className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-900/5 border border-white p-8 mb-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              Verification Terminal
            </h2>
            <p className="text-gray-500 mt-2 ml-14">Review pending cutting batches and accurately count components before sewing.</p>
          </div>
          <VerifierDashboard />
        </section>
      )}

      {user.role === 'sewing_supervisor' && (
        <section className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white p-8 mb-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600">
                <Factory className="w-6 h-6" />
              </div>
              Sewing Queue
            </h2>
            <p className="text-gray-500 mt-2 ml-14">Approved batches ready for immediate sewing assembly.</p>
          </div>
          <SewingDashboard />
        </section>
      )}

      {/* Orders List for Supervisor */}
      {user.role === 'cutting_supervisor' && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Recent Cutting Batches</h3>
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{orders.length} Total</span>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Order No</th>
                    <th className="py-4 px-6">Recipe</th>
                    <th className="py-4 px-6">Target Qty</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 font-medium bg-gray-50/30">
                        No orders dispatched yet. Click "Dispatch New Batch" to start!
                      </td>
                    </tr>
                  ) : (
                    orders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 px-6 font-bold text-gray-900">{order.order_no}</td>
                        <td className="py-4 px-6 text-gray-600">
                          <span className="font-medium">{order.recipe?.name}</span>
                          <span className="text-xs text-gray-400 block mt-0.5">{order.recipe?.recipe_code}</span>
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-medium">{order.target_qty} units</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${order.status === 'PENDING_VERIFICATION' ? 'bg-amber-100 text-amber-800 border border-amber-200' : ''}
                            ${order.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : ''}
                            ${order.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' : ''}
                            ${order.status === 'CUTTING_IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border border-blue-200' : ''}
                          `}>
                            {order.status === 'PENDING_VERIFICATION' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>}
                            {order.status === 'VERIFIED' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                            {order.status === 'REJECTED' && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                            {order.status.replace('_', ' ')}
                          </span>
                          {order.status === 'REJECTED' && (
                            <button 
                              onClick={() => handleResubmit(order.id)}
                              className="ml-4 text-xs text-blue-600 hover:text-blue-800 font-bold transition-all opacity-0 group-hover:opacity-100"
                            >
                              Re-submit →
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-6 text-gray-400 text-sm font-medium">
                          {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <CreateOrderModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => mutate()}
      />
    </div>
  )
}
