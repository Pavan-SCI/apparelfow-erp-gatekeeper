/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, ChevronRight, CheckCircle2, History, XCircle } from 'lucide-react'
import VerificationTerminalModal from './VerificationTerminalModal'
import useSWR from 'swr'
import { useRole } from '@/context/RoleContext'

export default function VerifierDashboard() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const { user } = useRole()
  
  const supabase = createClient()

  // Fetch pending orders
  const fetchPending = async () => {
    const { data, error } = await supabase
      .from('cutting_orders')
      .select(`
        *,
        recipe:recipes(name, recipe_code),
        creator:users!cutting_orders_created_by_fkey(full_name)
      `)
      .eq('status', 'PENDING_VERIFICATION')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  }

  // Fetch verifier's history from logs
  const fetchHistory = async () => {
    if (!user) return []
    const { data, error } = await supabase
      .from('verification_logs')
      .select(`
        id,
        decision,
        rejection_note,
        timestamp,
        order:cutting_orders (
          id,
          order_no,
          target_qty,
          recipe:recipes(name, recipe_code)
        )
      `)
      .eq('verifier_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(20) // show last 20

    if (error) throw error
    return data
  }

  const { data: pendingOrders = [], mutate: mutatePending } = useSWR('pending-orders', fetchPending, {
    revalidateOnFocus: true,
    refreshInterval: 10000 
  })

  const { data: historyLogs = [], mutate: mutateHistory } = useSWR(
    user ? `verifier-history-${user.id}` : null, 
    fetchHistory, 
    { revalidateOnFocus: true }
  )

  return (
    <div className="mt-6">
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 mb-6 pb-2">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === 'pending' ? 'border-amber-500 text-amber-700 dark:text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <Clock className="w-5 h-5" />
          Pending Batches
          {pendingOrders.length > 0 && (
            <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400 text-xs py-0.5 px-2 rounded-full ml-1">{pendingOrders.length}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-semibold transition-colors ${activeTab === 'history' ? 'border-emerald-500 text-emerald-700 dark:text-emerald-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <History className="w-5 h-5" />
          My Verified History
        </button>
      </div>
      
      {/* PENDING TAB */}
      {activeTab === 'pending' && (
        <>
          {pendingOrders.length === 0 ? (
            <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl p-10 text-center transition-colors">
              <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-slate-700 dark:text-slate-300 font-bold text-lg mb-1">You&apos;re all caught up!</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No batches in the verification queue right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-amber-900/5 transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                  
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Needs QC
                        </p>
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xl">{order.order_no}</h4>
                      </div>
                      <span className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {order.target_qty} units
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-6 bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-slate-500 dark:text-slate-400 block text-xs uppercase mb-0.5">Recipe</span>
                        {order.recipe?.name}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-slate-500 dark:text-slate-400 block text-xs uppercase mb-0.5">Fabric Roll</span>
                        {order.fabric_roll_id}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-amber-500 dark:hover:bg-amber-600 hover:text-white dark:hover:text-white text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-600 group-hover:shadow-md"
                  >
                    Start Verification
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          {historyLogs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-slate-500 dark:text-slate-400 font-medium">You haven&apos;t verified any batches yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Date & Time</th>
                  <th className="py-4 px-6">Order No</th>
                  <th className="py-4 px-6">Recipe</th>
                  <th className="py-4 px-6">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {historyLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-slate-100">{(log.order as any)?.order_no}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{(log.order as any)?.recipe?.name}</td>
                    <td className="py-4 px-6">
                      {log.decision === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          APPROVED
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50 w-fit">
                            <XCircle className="w-3.5 h-3.5" />
                            REJECTED
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 italic max-w-xs truncate" title={log.rejection_note}>
                            &quot;{log.rejection_note}&quot;
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <VerificationTerminalModal 
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onSuccess={() => {
          setSelectedOrder(null)
          mutatePending() 
          mutateHistory() // Refresh both lists
        }}
      />
    </div>
  )
}
