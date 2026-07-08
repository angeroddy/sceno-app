import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  syncEmailVerificationForAuthUser,
  type AuthProfileSupabase,
} from '@/lib/auth-profile'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import {
  notifyAdminAdvertiserPending,
  sendAdvertiserWelcomeEmail,
  sendComedianWelcomeEmail,
} from '@/lib/email-notifications'

type EmailVerificationAdvertiser = {
  id: string
  email: string
  nom_formation: string | null
  nom_entreprise: string | null
  email_verifie: boolean
}

type EmailVerificationComedian = {
  id: string
  email: string
  prenom: string | null
  nom: string | null
  email_verifie: boolean
}

async function createCallbackSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
}

async function sendFirstEmailVerificationNotifications(userId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return
  }

  try {
    const adminSupabase = createAdminSupabaseClient()

    const { data: advertiserData } = await adminSupabase
      .from('annonceurs')
      .select('id, email, nom_formation, nom_entreprise, email_verifie')
      .eq('auth_user_id', userId)
      .maybeSingle()
    const advertiser = advertiserData as EmailVerificationAdvertiser | null

    if (advertiser && !advertiser.email_verifie) {
      await adminSupabase
        .from('annonceurs')
        .update({ email_verifie: true } as unknown as never)
        .eq('id', advertiser.id)

      await sendAdvertiserWelcomeEmail(advertiser)
      await notifyAdminAdvertiserPending(advertiser)
      return
    }

    const { data: comedianData } = await adminSupabase
      .from('comediens')
      .select('id, email, prenom, nom, email_verifie')
      .eq('auth_user_id', userId)
      .maybeSingle()
    const comedian = comedianData as EmailVerificationComedian | null

    if (comedian && !comedian.email_verifie) {
      await adminSupabase
        .from('comediens')
        .update({ email_verifie: true } as unknown as never)
        .eq('id', comedian.id)

      await sendComedianWelcomeEmail(comedian)
    }
  } catch (notificationError) {
    console.error('[AUTH CALLBACK] Erreur notifications email verification:', notificationError)
  }
}

function getPasswordRecoveryRedirectPath(nextPath: string | null) {
  if (!nextPath) return '/mot-de-passe-oublie?mode=reset'

  return nextPath.startsWith('/mot-de-passe-oublie')
    ? nextPath
    : '/mot-de-passe-oublie?mode=reset'
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const callbackType = requestUrl.searchParams.get('type')
  const nextPath = requestUrl.searchParams.get('next')
  const passwordRecoveryRedirectPath = getPasswordRecoveryRedirectPath(nextPath)
  const isPasswordRecovery =
    callbackType === 'recovery' ||
    Boolean(nextPath?.startsWith('/mot-de-passe-oublie'))

  if (tokenHash) {
    const supabase = await createCallbackSupabaseClient()
    const verificationType = isPasswordRecovery ? 'recovery' : 'signup'
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: verificationType,
    })

    if (!error && data.user) {
      if (isPasswordRecovery) {
        return NextResponse.redirect(`${requestUrl.origin}${passwordRecoveryRedirectPath}`)
      }

      await sendFirstEmailVerificationNotifications(data.user.id)

      const userType =
        (await syncEmailVerificationForAuthUser(
          supabase as unknown as AuthProfileSupabase,
          data.user
        )) ?? 'unknown'

      return NextResponse.redirect(
        `${requestUrl.origin}/auth/confirm?success=true&userType=${userType}`
      )
    }

    console.error('[AUTH CALLBACK] Erreur lors de la vérification du token', error)
  }

  if (code) {
    const supabase = await createCallbackSupabaseClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      if (isPasswordRecovery) {
        return NextResponse.redirect(`${requestUrl.origin}${passwordRecoveryRedirectPath}`)
      }

      await sendFirstEmailVerificationNotifications(data.user.id)

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
