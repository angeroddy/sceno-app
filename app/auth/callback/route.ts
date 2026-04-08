import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  syncEmailVerificationForAuthUser,
  type AuthProfileSupabase,
} from '@/app/lib/auth-profile'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const userType =
        (await syncEmailVerificationForAuthUser(
          supabase as unknown as AuthProfileSupabase,
          data.user
        )) ?? 'unknown'

      // Rediriger vers la page de confirmation avec succès et le type d'utilisateur
      const redirectUrl = `${requestUrl.origin}/auth/confirm?success=true&userType=${userType}`
      return NextResponse.redirect(redirectUrl)
    }

    console.error('[AUTH CALLBACK] Erreur lors de l\'échange du code')
  }

  // En cas d'erreur, rediriger vers la page de confirmation avec une erreur
  const errorRedirectUrl = `${requestUrl.origin}/auth/confirm?error=true`
  return NextResponse.redirect(errorRedirectUrl)
}
