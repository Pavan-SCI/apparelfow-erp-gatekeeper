/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react'
import { Scissors, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react'
import useSWR from 'swr'

export default function SewingDashboard() {
  const [startingOrderId, setStartingOrderId] = useState<string | null>(null)
  const [startedOrders, setStartedOrders] = useState<Set<string>>(new Set())
  const [viewAuditIds, setViewAuditIds] = useState<Set<string>>(new Set())

  const toggleAuditView = (id: string) => {
    setViewAuditIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const fetcher = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    const res = await fetch('/api/sewing/queue', {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    if (!res.ok) {
      if (res.status === 403) throw new Error('Access denied. Only Sewing Supervisors can view this queue.')
      throw new Error('Failed to load sewing queue.')
    }
    const { data } = await res.json()
    return data || []
  }

  const { data: orders, error, mutate } = useSWR('sewing-queue', fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 10000 // Keep queue fresh
  })

  const handleStartAssembly = async (orderId: string) => {
    setStartingOrderId(orderId)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/sewing/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ orderId })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start assembly')
      }

      // Mark as started
      setStartedOrders(prev => new Set(prev).add(orderId))
      
      mutate() // Refresh queue immediately
    } catch (err: any) {
      alert(err.message)
      setStartingOrderId(null)
    }
  }

  if (!orders && !error) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200">
        <h3 className="font-bold text-lg mb-2">Access Denied</h3>
        <p>{error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
          <Scissors className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sewing Assembly Queue</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Batches that have passed QC verification and are ready for sewing.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center transition-colors">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
            <CheckCircle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Queue is Empty</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">There are no verified batches waiting for assembly.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order: any) => {
            // Because verification_logs could be an array based on the join, get the latest one
            const latestLog = Array.isArray(order.verification_logs) 
              ? order.verification_logs[order.verification_logs.length - 1] 
              : order.verification_logs;
              
            return (
              <div key={order.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md dark:shadow-black/20 transition-all">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{order.order_no}</h3>
                        <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          QC Passed
                        </span>
                        {order.status === 'SEWING_IN_PROGRESS' && (
                          <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            In Production
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">{order.recipe?.name} (Target: {order.target_qty} units)</p>
                    </div>
                    
                    <button 
                      onClick={() => handleStartAssembly(order.id)}
                      disabled={startingOrderId === order.id || startedOrders.has(order.id) || order.status === 'SEWING_IN_PROGRESS'}
                      className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-70 ${
                        (startedOrders.has(order.id) || order.status === 'SEWING_IN_PROGRESS')
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {startingOrderId === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (startedOrders.has(order.id) || order.status === 'SEWING_IN_PROGRESS') ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Scissors className="w-4 h-4" />
                      )}
                      {(startedOrders.has(order.id) || order.status === 'SEWING_IN_PROGRESS') ? 'Started!' : 'Start Sewing Assembly'}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button 
                      onClick={() => toggleAuditView(order.id)}
                      className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                      {viewAuditIds.has(order.id) ? 'Hide Audit Details' : 'View Gatekeeper Audit Notes'}
                    </button>
                  </div>

                  {viewAuditIds.has(order.id) && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                      {/* Attribution & Analytics */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gatekeeper Sign-Off</h4>
                        
                        <div className="flex flex-col gap-3">
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Verified By</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{latestLog?.verifier?.full_name || 'Unknown'}</span>
                          </div>
                          
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Verification Time</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {latestLog ? new Date(latestLog.timestamp).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Fabric Wastage Variance</span>
                            <span className={`text-sm font-bold ${
                              Number(latestLog?.wastage_pct) > 0 ? 'text-amber-600 dark:text-amber-500' : 
                              Number(latestLog?.wastage_pct) < 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {latestLog?.wastage_pct !== undefined ? `${Number(latestLog.wastage_pct).toFixed(2)}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Component Pieces */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Component Breakdown</h4>
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                              <tr>
                                <th className="px-4 py-2 font-medium">Component</th>
                                <th className="px-4 py-2 font-medium text-center">Verified Count</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {order.verification_items?.map((item: any) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-2.5 text-slate-900 dark:text-slate-100 font-medium">{item.component?.component_name}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold">
                                      {item.actual_qty}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
