/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState } from 'react'
import { Scissors, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react'
import useSWR from 'swr'

export default function SewingDashboard() {
  const [startingOrderId, setStartingOrderId] = useState<string | null>(null)

  const fetcher = async () => {
    const res = await fetch('/api/sewing/queue')
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

  const handleStartAssembly = (orderId: string) => {
    setStartingOrderId(orderId)
    // Simulate starting assembly process
    setTimeout(() => {
      alert(`Assembly started for batch ${orderId}! (Demo)`)
      setStartingOrderId(null)
      mutate() // Refresh queue after starting
    }, 1000)
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
        <p>{error}</p>
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
          <h2 className="text-2xl font-bold text-gray-900">Sewing Assembly Queue</h2>
          <p className="text-gray-500 text-sm">Batches that have passed QC verification and are ready for sewing.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Queue is Empty</h3>
          <p className="text-gray-500 text-sm">There are no verified batches waiting for assembly.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order: any) => {
            // Because verification_logs could be an array based on the join, get the latest one
            const latestLog = Array.isArray(order.verification_logs) 
              ? order.verification_logs[order.verification_logs.length - 1] 
              : order.verification_logs;
              
            return (
              <div key={order.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{order.order_no}</h3>
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          QC Passed
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm">{order.recipe?.name} (Target: {order.target_qty} units)</p>
                    </div>
                    
                    <button 
                      onClick={() => handleStartAssembly(order.id)}
                      disabled={startingOrderId === order.id}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                    >
                      {startingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                      Start Sewing Assembly
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 rounded-xl p-5 border border-gray-100">
                    {/* Attribution & Analytics */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gatekeeper Sign-Off</h4>
                      
                      <div className="flex flex-col gap-3">
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Verified By</span>
                          <span className="text-sm font-bold text-gray-900">{latestLog?.verifier?.full_name || 'Unknown'}</span>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Verification Time</span>
                          <span className="text-sm font-bold text-gray-900">
                            {latestLog ? new Date(latestLog.timestamp).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Fabric Wastage Variance</span>
                          <span className={`text-sm font-bold ${
                            Number(latestLog?.wastage_pct) > 0 ? 'text-amber-600' : 
                            Number(latestLog?.wastage_pct) < 0 ? 'text-emerald-600' : 'text-gray-900'
                          }`}>
                            {latestLog?.wastage_pct !== undefined ? `${Number(latestLog.wastage_pct).toFixed(2)}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Component Pieces */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Component Breakdown</h4>
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-100">
                            <tr>
                              <th className="px-4 py-2 font-medium">Component</th>
                              <th className="px-4 py-2 font-medium text-center">Verified Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {order.verification_items?.map((item: any) => (
                              <tr key={item.id}>
                                <td className="px-4 py-2.5 text-gray-900 font-medium">{item.component?.component_name}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold">
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
                  
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
