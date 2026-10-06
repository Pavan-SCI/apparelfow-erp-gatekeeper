'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'cutting_supervisor' | 'cutting_verifier' | 'sewing_supervisor'

interface User {
  id: string
  email: string
  role: UserRole
  full_name: string
}

// Demo users mapped to their Auth emails
export const DEMO_USERS: Record<UserRole, User> = {
  cutting_supervisor: {
    id: '33333333-3333-3333-3333-333333333333', // Temporary visual ID
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
  user: User | null
  setUser: (user: User) => Promise<void>
  isLoading: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const handleSetUser = useCallback(async (newUser: User) => {
    setIsLoading(true)
    // REAL AUTHENTICATION: Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: newUser.email,
      password: process.env.NEXT_PUBLIC_DEMO_PASSWORD as string,
    })
    
    if (!error && data.session) {
      setUserState({ ...newUser, id: data.session.user.id })
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    // Check active Supabase session on load
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Find matching demo user by email
        const activeUser = Object.values(DEMO_USERS).find(u => u.email === session.user.email)
        if (activeUser) {
          // Update visual ID to match real Auth ID
          setUserState({ ...activeUser, id: session.user.id })
        }
      } else {
        // Auto-login to Supervisor as default for demo if no session
        handleSetUser(DEMO_USERS.cutting_supervisor)
      }
      setIsLoading(false)
    }

    checkSession()
  }, [handleSetUser, supabase])

  return (
    <RoleContext.Provider value={{ user, setUser: handleSetUser, isLoading }}>
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
