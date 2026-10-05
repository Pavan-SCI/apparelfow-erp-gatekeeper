'use client'

import React from 'react'
import { useRole, DEMO_USERS, UserRole } from '@/context/RoleContext'
import { Users } from 'lucide-react'

export default function RoleSwitcher() {
  const { user, setUser } = useRole()

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-2xl rounded-xl border border-gray-100 p-4 z-50 w-80">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-sm text-gray-800">Demo Role Switcher</h3>
      </div>
      
      <div className="flex flex-col gap-2">
        {(Object.keys(DEMO_USERS) as UserRole[]).map((roleKey) => {
          const u = DEMO_USERS[roleKey]
          const isActive = user.id === u.id
          return (
            <button
              key={u.id}
              onClick={() => setUser(u)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-50 border-blue-200 border text-blue-700 font-medium' 
                  : 'hover:bg-gray-50 border border-transparent text-gray-600'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{u.full_name}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
              </div>
              <div className="text-xs opacity-70 mt-0.5">{u.role}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
