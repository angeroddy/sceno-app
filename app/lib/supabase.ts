import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../types'

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

export async function getUserType(): Promise<UserType> {
  const [comedien, annonceur, admin] = await Promise.all([
    getComedienProfile(),
    getAnnonceurProfile(),
    getAdminProfile()
  ])
  
  if (admin) return 'admin'
  if (annonceur) return 'advertiser'
  if (comedien) return 'comedian'
  
  return null
}
