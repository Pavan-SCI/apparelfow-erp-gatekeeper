/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import React, { useState, useEffect } from 'react'
import { useRole } from '@/context/RoleContext'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, AlertCircle, Loader2 } from 'lucide-react'

interface Recipe {
  id: string
  recipe_code: string
  name: string
  std_fabric_yards: number
}

interface Component {
  id: string
  component_name: string
  pieces_per_garment: number
}

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const { user } = useRole()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [components, setComponents] = useState<Component[]>([])
  
  const [targetQty, setTargetQty] = useState('')
  const [fabricRollId, setFabricRollId] = useState('')
  const [actualFabric, setActualFabric] = useState('')
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase.from('recipes').select('*')
      if (data) setRecipes(data)
    }

    if (isOpen) {
      fetchRecipes()
      // Reset state
      setSelectedRecipeId('')
      setTargetQty('')
      setFabricRollId('')
      setActualFabric('')
      setComponents([])
      setError('')
    }
  }, [isOpen])

  useEffect(() => {
    const fetchComponents = async (recipeId: string) => {
      const { data } = await supabase.from('recipe_components').select('*').eq('recipe_id', recipeId)
      if (data) setComponents(data)
    }

    if (selectedRecipeId) {
      fetchComponents(selectedRecipeId)
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComponents([])
    }
  }, [selectedRecipeId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError('You must be logged in.')
      return
    }

    if (user.role !== 'cutting_supervisor') {
      setError('Only Cutting Supervisors can create orders.')
      return
    }

    const qty = parseInt(targetQty)
    const fabric = parseFloat(actualFabric)

    if (isNaN(qty) || qty <= 0) {
      setError('Target Quantity must be a positive number.')
      return
    }

    if (isNaN(fabric) || fabric <= 0) {
      setError('Actual Fabric used must be a positive number.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: selectedRecipeId,
          target_qty: qty,
          fabric_roll_id: fabricRollId,
          actual_fabric_yds: fabric
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Create New Cutting Batch</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form id="create-order-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Production Recipe</label>
                <select 
                  className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100"
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  required
                >
                  <option value="">-- Choose a Recipe --</option>
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.recipe_code} - {r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target Batch Quantity (Units)</label>
                  <input 
                    type="number" 
                    min="1"
                    className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border ${
                      targetQty && isNaN(parseInt(targetQty)) ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500'
                    } rounded-xl focus:ring-2 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500`}
                    placeholder="e.g., 50"
                    value={targetQty}
                    onChange={(e) => setTargetQty(e.target.value)}
                    onKeyDown={(e) => {
                      if (['.', '-', 'e', 'E', '+'].includes(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    required
                  />
                  {targetQty && isNaN(parseInt(targetQty)) && (
                    <p className="text-red-500 text-xs mt-1 font-medium">Must be a valid integer.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Fabric Roll ID</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    placeholder="e.g., FAB-ROLL-882"
                    value={fabricRollId}
                    onChange={(e) => setFabricRollId(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Actual Fabric Used (Yards)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.1"
                  className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border ${
                    actualFabric && isNaN(parseFloat(actualFabric)) ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-xl focus:ring-2 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500`}
                  placeholder="e.g., 105.5"
                  value={actualFabric}
                  onChange={(e) => setActualFabric(e.target.value)}
                  onKeyDown={(e) => {
                    if (['-', 'e', 'E', '+'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  required
                />
                {actualFabric && isNaN(parseFloat(actualFabric)) && (
                  <p className="text-red-500 text-xs mt-1 font-medium">Must be a valid numeric value.</p>
                )}
              </div>
            </div>

            {/* Dynamic Component Multiplier Display */}
            {selectedRecipeId && targetQty && parseInt(targetQty) > 0 && (
              <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs">M</span>
                  Dynamic Component Multiplier
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {components.map(comp => (
                    <div key={comp.id} className="bg-white dark:bg-slate-900 px-4 py-3 rounded-lg border border-blue-100/50 dark:border-slate-700 flex justify-between items-center shadow-sm">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{comp.component_name}</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
                        {comp.pieces_per_garment * parseInt(targetQty)} expected
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="create-order-form"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Creating Order...' : 'Submit Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
