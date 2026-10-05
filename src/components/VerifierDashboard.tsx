'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, ChevronRight } from 'lucide-react'

export default function VerifierDashboard() {
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchPendingOrders()
  }, [])

  const fetchPendingOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cutting_orders')
      .select(`
        *,
        recipe:recipes(name, recipe_code),
        creator:users!cutting_orders_created_by_fkey(full_name)
      `)
      .eq('status', 'PENDING_VERIFICATION')
      .order('created_at', { ascending: true })
    
    if (data) setPendingOrders(data)
    setLoading(false)
  }

  if (loading) {
    return <div className="text-gray-500 animate-pulse mt-4">Loading pending batches...</div>
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-500" />
        Batches Pending Verification
      </h3>
      
      {pendingOrders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-500 font-medium">No batches in the verification queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingOrders.map(order => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Needs QC</p>
                  <h4 className="font-bold text-gray-900 text-lg">{order.order_no}</h4>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">
                  {order.target_qty} units
                </span>
              </div>
              
              <div className="space-y-1.5 mb-5">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-500">Recipe:</span> {order.recipe?.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-500">Fabric Roll:</span> {order.fabric_roll_id}
                </p>
              </div>
              
              <button className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 hover:bg-amber-50 text-gray-700 hover:text-amber-700 rounded-lg font-medium text-sm transition-colors border border-gray-100 group-hover:border-amber-200">
                Start Verification
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
