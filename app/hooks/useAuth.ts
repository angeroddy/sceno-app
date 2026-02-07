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

    // Vérifier la session actuelle immédiatement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkUserType(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkUserType(session.user.id)
      } else {
        setUserType(null)
        setLoading(false)
      }
    })

    // Vérifier le type d'utilisateur
    async function checkUserType(userId: string) {
      const supabase = createBrowserSupabaseClient()

      // Vérifier admin (priorité)
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (admin) {
        setUserType('admin')
        setLoading(false)
        return
      }

      // Vérifier comédien
      const { data: comedien } = await supabase
        .from('comediens')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (comedien) {
        setUserType('comedian')
        setLoading(false)
        return
      }

      // Vérifier annonceur
      const { data: annonceur } = await supabase
        .from('annonceurs')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (annonceur) {
        setUserType('advertiser')
        setLoading(false)
        return
      }

      setUserType(null)
      setLoading(false)
    }

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
