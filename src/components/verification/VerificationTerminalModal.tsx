/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import React, { useState, useEffect } from 'react'
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

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/orders/${order.id}/verify`)
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

      const res = await fetch(`/api/orders/${order.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-900 text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Verification Terminal
              <span className="bg-amber-500 text-amber-950 text-xs px-2 py-0.5 rounded-md font-bold uppercase">QC View</span>
            </h2>
            <p className="text-gray-300 text-sm mt-1">Batch: {order.order_no} | Recipe: {order.recipe?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
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
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/50 border-b border-gray-200 text-sm text-gray-600">
                      <th className="py-3 px-4 font-semibold">Component</th>
                      <th className="py-3 px-4 font-semibold text-center w-32">Expected</th>
                      <th className="py-3 px-4 font-semibold text-center w-40">Actual Count</th>
                      <th className="py-3 px-4 font-semibold w-48">Status (Traffic Light)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(item => {
                      const status = getStatus(item.expected_qty, item.actual_qty)
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-gray-900">{item.component?.component_name}</td>
                          <td className="py-4 px-4 text-center">
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md font-bold text-sm border border-gray-200">
                              {item.expected_qty}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              min="0"
                              value={item.actual_qty}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              className="w-full text-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900 shadow-inner bg-white"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-4 px-4">
                            {status === 'PENDING' && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <div className="w-3 h-3 rounded-full bg-gray-200"></div>
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
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 mt-6 animate-in fade-in slide-in-from-top-4">
                  <h3 className="text-red-800 font-bold flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    Mandatory Rejection Note
                  </h3>
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Provide a clear reason for returning this batch to the cutting floor..."
                    className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                    rows={3}
                  />
                  <div className="flex justify-end gap-3 mt-3">
                    <button 
                      onClick={() => setRejectMode(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg"
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
          <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
            <button 
              onClick={() => setRejectMode(true)}
              className="px-5 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Reject Batch
            </button>
            
            <div className="flex items-center gap-3">
              {hasAnyRed && (
                <span className="text-sm font-medium text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Shortage detected. Approval disabled.
                </span>
              )}
              <button 
                onClick={() => handleSubmit('APPROVED')}
                disabled={isApproveDisabled}
                className={`px-8 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm flex items-center gap-2
                  ${isApproveDisabled 
                    ? 'bg-gray-300 cursor-not-allowed opacity-70' 
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md'
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
    </div>
  )
}
