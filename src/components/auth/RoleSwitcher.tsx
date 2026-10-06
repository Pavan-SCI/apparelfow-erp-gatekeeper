'use client'

import React from 'react'
import { useRole, DEMO_USERS, UserRole } from '@/context/RoleContext'
import { Users, Loader2 } from 'lucide-react'

export default function RoleSwitcher() {
  const { user, logout, isLoading } = useRole()

  if (!user || isLoading) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-2xl rounded-xl border border-gray-100 p-3 z-50 w-64 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
          {user.full_name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-sm text-gray-900">{user.full_name}</h3>
          <p className="text-xs text-gray-500">{user.role.replace('_', ' ')}</p>
        </div>
      </div>
      
      <button
        onClick={logout}
        title="Sign Out"
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </div>
  )
}
