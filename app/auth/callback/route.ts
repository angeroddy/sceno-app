import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('[AUTH CALLBACK] URL reçue:', requestUrl.href)
  console.log('[AUTH CALLBACK] Code présent:', !!code)

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

    console.log('[AUTH CALLBACK] Tentative d\'échange du code...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      console.log('[AUTH CALLBACK] ✅ Échange réussi pour l\'utilisateur:', data.user.id)

      // Vérifier si c'est un comédien ou un annonceur et mettre à jour email_verifie
      // Essayer d'abord dans la table comediens
      const { data: comedien, error: comedienError } = await supabase
        .from('comediens')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle()

      if (comedien) {
        // C'est un comédien
        const { error: updateError } = await supabase
          .from('comediens')
          .update({ email_verifie: true })
          .eq('auth_user_id', data.user.id)

        if (updateError) {
          console.error('[AUTH CALLBACK] ⚠️ Erreur mise à jour email_verifie (comedien):', updateError)
        } else {
          console.log('[AUTH CALLBACK] ✅ email_verifie mis à jour à true (comedien)')
        }
      } else {
        // Essayer dans la table annonceurs
        const { data: annonceur, error: annonceurError } = await supabase
          .from('annonceurs')
          .select('id')
          .eq('auth_user_id', data.user.id)
          .maybeSingle()

        if (annonceur) {
          const { error: updateError } = await supabase
            .from('annonceurs')
            .update({ email_verifie: true })
            .eq('auth_user_id', data.user.id)

          if (updateError) {
            console.error('[AUTH CALLBACK] ⚠️ Erreur mise à jour email_verifie (annonceur):', updateError)
          } else {
            console.log('[AUTH CALLBACK] ✅ email_verifie mis à jour à true (annonceur)')
          }
        } else {
          console.error('[AUTH CALLBACK] ⚠️ Utilisateur non trouvé dans comediens ni annonceurs')
        }
      }

      // Rediriger vers la page de confirmation avec succès
      const redirectUrl = `${requestUrl.origin}/auth/confirm?success=true`
      return NextResponse.redirect(redirectUrl)
    }

    console.error('[AUTH CALLBACK] ❌ Erreur lors de l\'échange du code:', error)
  } else {
    console.error('[AUTH CALLBACK] ❌ Pas de code dans l\'URL')
  }

  // En cas d'erreur, rediriger vers la page de confirmation avec une erreur
  console.log('[AUTH CALLBACK] Redirection vers /auth/confirm?error=true')
  const errorRedirectUrl = `${requestUrl.origin}/auth/confirm?error=true`
  return NextResponse.redirect(errorRedirectUrl)
}
