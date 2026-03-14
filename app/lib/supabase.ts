import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../types'
import type { User } from '@supabase/supabase-js'

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
  
  if (error) return null
  
  return data
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

// ============================================
// HELPER : DÉTERMINER LE TYPE D'UTILISATEUR
// ============================================

export type UserType = 'comedian' | 'advertiser' | 'admin' | null

type RoleAwareSupabase = {
  from: (table: 'admins' | 'annonceurs' | 'comediens') => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { id: string } | null }>
      }
    }
  }
}

export async function resolveUserTypeForAuthUser(
  supabase: RoleAwareSupabase,
  userId: string
): Promise<UserType> {
  const [adminResult, annonceurResult, comedienResult] = await Promise.all([
    supabase.from('admins').select('id').eq('auth_user_id', userId).maybeSingle(),
    supabase.from('annonceurs').select('id').eq('auth_user_id', userId).maybeSingle(),
    supabase.from('comediens').select('id').eq('auth_user_id', userId).maybeSingle(),
  ])

  if (adminResult.data) return 'admin'
  if (annonceurResult.data) return 'advertiser'
  if (comedienResult.data) return 'comedian'

  return null
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

  const userType = await resolveUserTypeForAuthUser(supabase as unknown as RoleAwareSupabase, user.id)

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
