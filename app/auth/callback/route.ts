import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
      // Vérifier si c'est un admin, comédien ou annonceur et mettre à jour email_verifie
      let userType = 'unknown'

      // Vérifier d'abord si c'est un admin (priorité)
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()

      if (admin) {
        userType = 'admin'
      } else {
        // Essayer dans la table comediens
        const { data: comedien } = await supabase
          .from('comediens')
          .select('id')
          .eq('auth_user_id', data.user.id)
          .maybeSingle()

        if (comedien) {
          // C'est un comédien
          userType = 'comedian'
          const { error: updateError } = await supabase
            .from('comediens')
            .update({ email_verifie: true })
            .eq('auth_user_id', data.user.id)

          if (updateError) {
            console.error('[AUTH CALLBACK] Erreur mise à jour email_verifie (comedien)')
          }
        } else {
          // Essayer dans la table annonceurs
          const { data: annonceur } = await supabase
            .from('annonceurs')
            .select('id')
            .eq('auth_user_id', data.user.id)
            .maybeSingle()

          if (annonceur) {
            userType = 'advertiser'
            const { error: updateError } = await supabase
              .from('annonceurs')
              .update({ email_verifie: true })
              .eq('auth_user_id', data.user.id)

            if (updateError) {
              console.error('[AUTH CALLBACK] Erreur mise à jour email_verifie (annonceur)')
            }
          }
        }
      }

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
