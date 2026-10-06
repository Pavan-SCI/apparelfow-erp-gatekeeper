'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

export type UserRole = 'cutting_supervisor' | 'cutting_verifier' | 'sewing_supervisor'

export interface User {
  id: string
  email: string
  role: UserRole
  full_name: string
}

// Demo users mapped to their Auth emails
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
  user: User | null
  login: (email: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  isLoading: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      setIsLoading(false)
      return { error: error.message }
    }
    
    if (data.session) {
      const activeUser = Object.values(DEMO_USERS).find(u => u.email === data.session.user.email)
      if (activeUser) {
        setUserState({ ...activeUser, id: data.session.user.id })
      }
      router.push('/')
    }
    setIsLoading(false)
    return {}
  }, [supabase, router])

  const logout = useCallback(async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setUserState(null)
    router.push('/login')
    setIsLoading(false)
  }, [supabase, router])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const activeUser = Object.values(DEMO_USERS).find(u => u.email === session.user.email)
        if (activeUser) {
          setUserState({ ...activeUser, id: session.user.id })
        }
      } else {
        setUserState(null)
        if (pathname !== '/login') {
          router.push('/login')
        }
      }
      setIsLoading(false)
    }

    checkSession()
  }, [supabase, router, pathname])

  return (
    <RoleContext.Provider value={{ user, login, logout, isLoading }}>
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
