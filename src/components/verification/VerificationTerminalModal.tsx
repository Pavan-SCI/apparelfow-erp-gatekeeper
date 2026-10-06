/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react'

export default function VerificationTerminalModal({ 
  order, 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  order: any, 
  isOpen: boolean, 
  onClose: () => void, 
  onSuccess: () => void 
}) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectionNote, setRejectionNote] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/orders/${order.id}/verify`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        const data = await res.json()
        if (data.items) {
          const initializedItems = data.items.map((item: any) => ({
            ...item,
            actual_qty: ''
          }))
          setItems(initializedItems)
        }
      } catch {
        setError('Failed to fetch verification items.')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen && order) {
      fetchItems()
      setRejectMode(false)
      setRejectionNote('')
      setError('')
    }
  }, [isOpen, order])

  const handleQtyChange = (itemId: string, value: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, actual_qty: value } : item
    ))
  }

  const getStatus = (expected: number, actualStr: string) => {
    if (actualStr === '') return 'PENDING'
    const actual = parseInt(actualStr)
    if (isNaN(actual)) return 'PENDING'
    
    if (actual === expected) return 'GREEN'
    if (actual > expected) return 'YELLOW'
    return 'RED'
  }

  const hasAnyRed = items.some(item => getStatus(item.expected_qty, item.actual_qty) === 'RED')
  const hasPending = items.some(item => getStatus(item.expected_qty, item.actual_qty) === 'PENDING')
  
  // Gatekeeper Rule: Strict Pass-Fail
  const isApproveDisabled = hasAnyRed || hasPending || submitting

  const handleSubmit = async (decision: 'APPROVED' | 'REJECTED') => {
    setError('')
    
    if (decision === 'REJECTED' && !rejectionNote.trim()) {
      setError('A mandatory reason note is required to reject a batch.')
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        decision,
        rejection_note: rejectionNote,
        items: items.map(item => ({
          id: item.id,
          component_id: item.component_id,
          expected_qty: item.expected_qty,
          actual_qty: parseInt(item.actual_qty) || 0
        }))
      }

      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(`/api/orders/${order.id}/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !order || !isMounted) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col h-fit max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 dark:bg-slate-950 text-white">
          <div>
            <h2 className="text-lg sm:text-xl font-bold flex flex-wrap items-center gap-2">
              Verification Terminal
              <span className="bg-amber-500 text-amber-950 text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-bold uppercase">QC View</span>
            </h2>
            <p className="text-slate-300 dark:text-slate-400 text-xs sm:text-sm mt-1">Batch: {order.order_no} | Recipe: {order.recipe?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 dark:text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-20 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto shadow-sm transition-colors">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-4 font-semibold">Component</th>
                      <th className="py-3 px-4 font-semibold text-center w-32">Expected</th>
                      <th className="py-3 px-4 font-semibold text-center w-40">Actual Count</th>
                      <th className="py-3 px-4 font-semibold w-48">Status (Traffic Light)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map(item => {
                      const status = getStatus(item.expected_qty, item.actual_qty)
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-4 px-4 font-medium text-slate-900 dark:text-slate-100">{item.component?.component_name}</td>
                          <td className="py-4 px-4 text-center">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-md font-bold text-sm border border-slate-200 dark:border-slate-700">
                              {item.expected_qty}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              min="0"
                              value={item.actual_qty}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (['.', '-', 'e', 'E', '+'].includes(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              className={`w-full text-center px-3 py-2 border ${
                                item.actual_qty === '' || isNaN(parseInt(item.actual_qty)) ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500'
                              } rounded-lg focus:ring-2 font-bold text-slate-900 dark:text-slate-100 shadow-inner bg-white dark:bg-slate-950 placeholder-slate-400 dark:placeholder-slate-500`}
                              placeholder="0"
                            />
                            {(item.actual_qty === '' || isNaN(parseInt(item.actual_qty))) && (
                              <p className="text-red-500 text-[10px] mt-1 font-bold text-center uppercase tracking-wide">Required</p>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {status === 'PENDING' && (
                              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                <span className="text-sm font-medium">Pending Count</span>
                              </div>
                            )}
                            {status === 'GREEN' && (
                              <div className="flex items-center gap-2 text-emerald-600">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                <span className="text-sm font-bold tracking-wide">GREEN (MATCH)</span>
                              </div>
                            )}
                            {status === 'YELLOW' && (
                              <div className="flex items-center gap-2 text-amber-600">
                                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                                <span className="text-sm font-bold tracking-wide">YELLOW (EXCESS)</span>
                              </div>
                            )}
                            {status === 'RED' && (
                              <div className="flex items-center gap-2 text-red-600">
                                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
                                <span className="text-sm font-bold tracking-wide">RED (SHORTAGE)</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Reject Flow UI */}
              {rejectMode && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 sm:p-5 mt-6 animate-in fade-in slide-in-from-top-4">
                  <h3 className="text-red-800 dark:text-red-400 font-bold flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    Mandatory Rejection Note
                  </h3>
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Provide a clear reason for returning this batch to the cutting floor..."
                    className="w-full p-3 border border-red-300 dark:border-red-800/50 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    rows={3}
                  />
                  <div className="flex flex-col sm:flex-row justify-end gap-3 mt-3">
                    <button 
                      onClick={() => setRejectMode(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleSubmit('REJECTED')}
                      disabled={submitting || !rejectionNote.trim()}
                      className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Confirm Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!rejectMode && (
          <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button 
              onClick={() => setRejectMode(true)}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5 flex-shrink-0" />
              Reject Batch
            </button>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              {hasAnyRed && (
                <span className="text-sm font-medium text-red-600 dark:text-red-500 flex items-center gap-1.5 text-center sm:text-left">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Shortage detected. Approval disabled.
                </span>
              )}
              <button 
                onClick={() => handleSubmit('APPROVED')}
                disabled={isApproveDisabled}
                className={`w-full sm:w-auto px-8 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2
                  ${isApproveDisabled 
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                  }
                `}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {!submitting && <CheckCircle className="w-5 h-5" />}
                Approve Batch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
