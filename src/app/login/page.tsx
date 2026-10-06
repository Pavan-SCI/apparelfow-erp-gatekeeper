'use client'

import React, { useState, useEffect } from 'react'
import { useRole, DEMO_USERS, UserRole } from '@/context/RoleContext'
import { useRouter } from 'next/navigation'
import { Lock, User as UserIcon, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login, user, isLoading: contextLoading } = useRole()
  const router = useRouter()
  
  const [selectedRole, setSelectedRole] = useState<UserRole>('cutting_supervisor')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!password.trim()) {
      setError('Password is required')
      return
    }

    setIsLoggingIn(true)
    const activeUser = DEMO_USERS[selectedRole]
    
    const result = await login(activeUser.email, password)
    
    if (result.error) {
      setError('Invalid credentials. Hint: use the demo password')
    }
    setIsLoggingIn(false)
  }

  if (contextLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (user) return null // Will redirect in useEffect

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('/grid.svg')] relative">
      <div className="absolute inset-0 bg-blue-50/50 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl shadow-xl flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          ApparelFlow ERP Execution System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-blue-900/5 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Demo Role
              </label>
              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(DEMO_USERS) as UserRole[]).map((role) => {
                  const u = DEMO_USERS[role]
                  const isSelected = selectedRole === role
                  return (
                    <div 
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/50' 
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {u.full_name}
                        </p>
                        <p className={`text-xs ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                          {u.email}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Hint: Passwords are role-based (e.g. supervisor123)</p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign in to Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
