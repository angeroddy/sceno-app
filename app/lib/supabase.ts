import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../types'
import type { User } from '@supabase/supabase-js'
import {
  resolveUserTypeForAuthUser,
  syncEmailVerificationForAuthUser,
  type AuthProfileSupabase,
  type UserType,
} from './auth-profile'

// ============================================
// CLIENT SUPABASE - CÔTÉ SERVEUR
// ============================================
// Utilise celui-ci dans les Server Components et API Routes

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore si appelé depuis un Server Component
          }
        },
      },
    }
  )
}

// ============================================
// HELPER : RÉCUPÉRER L'UTILISATEUR CONNECTÉ
// ============================================

export async function getUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

// ============================================
// HELPER : RÉCUPÉRER LE PROFIL COMÉDIEN
// ============================================

export async function getComedienProfile() {
  const supabase = await createServerSupabaseClient()
  const user = await getUser()
  
  if (!user) return null
  
  const { data, error } = await supabase
    .from('comediens')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()
  
  const comedienData = data as Database['public']['Tables']['comediens']['Row'] | null

  if (error || comedienData?.compte_supprime) return null
  
  return comedienData
}

export async function getActiveComedienProfile(authUserId?: string) {
  const supabase = await createServerSupabaseClient()
  const resolvedUserId = authUserId ?? (await getUser())?.id

  if (!resolvedUserId) {
    return {
      supabase,
      comedien: null,
      isDeleted: false,
    }
  }

  const { data, error } = await supabase
    .from('comediens')
    .select('*')
    .eq('auth_user_id', resolvedUserId)
    .single()

  const comedienData = data as Database['public']['Tables']['comediens']['Row'] | null

  if (error || !comedienData) {
    return {
      supabase,
      comedien: null,
      isDeleted: false,
    }
  }

  return {
    supabase,
    comedien: comedienData.compte_supprime ? null : comedienData,
    isDeleted: Boolean(comedienData.compte_supprime),
  }
}

// ============================================
// HELPER : RÉCUPÉRER LE PROFIL ANNONCEUR
// ============================================

export async function getAnnonceurProfile() {
  const supabase = await createServerSupabaseClient()
  const user = await getUser()
  
  if (!user) return null
  
  const { data, error } = await supabase
    .from('annonceurs')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()
  
  if (error) return null
  
  return data
}

// ============================================
// HELPER : RÉCUPÉRER LE PROFIL ADMIN
// ============================================

export async function getAdminProfile() {
  const supabase = await createServerSupabaseClient()
  const user = await getUser()
  
  if (!user) return null
  
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()
  
  if (error) return null
  
  return data
}

export async function getAuthenticatedUserContext() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      supabase,
      user: null as User | null,
      userType: null as UserType,
    }
  }

  const userType = await syncEmailVerificationForAuthUser(
    supabase as unknown as AuthProfileSupabase,
    user
  )

  return {
    supabase,
    user,
    userType,
  }
}

export async function getUserType(): Promise<UserType> {
  const { user, userType } = await getAuthenticatedUserContext()
  return user ? userType : null
}

export { resolveUserTypeForAuthUser }
export type { UserType }
