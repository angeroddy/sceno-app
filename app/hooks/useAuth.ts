"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '../lib/supabase-client'
import type { User } from '@supabase/supabase-js'
import {
  syncPendingComedianSignupPhoto,
  type PendingComedianPhotoSupabase,
} from '../lib/pending-comedian-photo'
import type { UserType } from '../lib/auth-profile'

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
        await syncPendingComedianSignupPhoto(
          supabase as unknown as PendingComedianPhotoSupabase,
          sessionUser.id
        )

        const response = await fetch('/api/auth/me', { credentials: 'same-origin' })
        if (!response.ok) {
          setUserType(null)
          return
        }

        const data = await response.json() as { userType: UserType }

        if (data.userType === 'deleted') {
          await supabase.auth.signOut().catch(() => undefined)
          setUser(null)
          setUserType(null)
          setLoading(false)
          router.push('/connexion')
          return
        }

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
