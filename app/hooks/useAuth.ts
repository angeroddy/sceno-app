"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '../lib/supabase-client'
import type { User } from '@supabase/supabase-js'

export type UserType = 'comedian' | 'advertiser' | 'admin' | null

export function useAuth() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userType, setUserType] = useState<UserType>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    async function hydrateUserState(sessionUser: User | null) {
      setUser(sessionUser)

      if (!sessionUser) {
        setUserType(null)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/me', { credentials: 'same-origin' })
        if (!response.ok) {
          setUserType(null)
          return
        }

        const data = await response.json() as { userType: UserType }
        setUserType(data.userType ?? null)
      } catch {
        setUserType(null)
      } finally {
        setLoading(false)
      }
    }

    // Vérifier la session actuelle immédiatement
    supabase.auth.getSession().then(({ data: { session } }) => {
      void hydrateUserState(session?.user ?? null)
    })

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrateUserState(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return {
    user,
    userType,
    loading,
    isAuthenticated: !!user,
    logout,
  }
}
