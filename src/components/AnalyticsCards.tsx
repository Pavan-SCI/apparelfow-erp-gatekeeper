'use client'

import React from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const fetcher = async (url: string) => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session?.access_token}`
    }
  })
  if (!res.ok) throw new Error('Failed to fetch analytics')
  return res.json()
}

export default function AnalyticsCards() {
  const { data, error, isLoading } = useSWR('/api/analytics', fetcher)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse h-28"></div>
        ))}
      </div>
    )
  }

  if (error || !data?.analytics) return null

  const { title, stats } = data.analytics

  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat: any, index: number) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm font-semibold text-gray-500">{stat.label}</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              {/* Simple icon based on index or just standard icon */}
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
