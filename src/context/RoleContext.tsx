'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'cutting_supervisor' | 'cutting_verifier' | 'sewing_supervisor'

interface User {
  id: string
  email: string
  role: UserRole
  full_name: string
}

// Demo users from our seed data
export const DEMO_USERS: Record<UserRole, User> = {
  cutting_supervisor: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'supervisor@apparelflow.com',
    role: 'cutting_supervisor',
    full_name: 'John Supervisor',
  },
  cutting_verifier: {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'verifier@apparelflow.com',
    role: 'cutting_verifier',
    full_name: 'Alice Verifier',
  },
  sewing_supervisor: {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'sewing@apparelflow.com',
    role: 'sewing_supervisor',
    full_name: 'Bob Sewing',
  },
}

interface RoleContextType {
  user: User
  setUser: (user: User) => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(DEMO_USERS.cutting_supervisor)

  // Persist demo user in localStorage for testing
  useEffect(() => {
    const savedUser = localStorage.getItem('demo_user_role')
    if (savedUser && DEMO_USERS[savedUser as UserRole]) {
      setUser(DEMO_USERS[savedUser as UserRole])
    }
  }, [])

  const handleSetUser = (newUser: User) => {
    setUser(newUser)
    localStorage.setItem('demo_user_role', newUser.role)
  }

  return (
    <RoleContext.Provider value={{ user, setUser: handleSetUser }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
