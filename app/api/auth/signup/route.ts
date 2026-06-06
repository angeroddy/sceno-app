import { NextResponse } from "next/server"

import { sendSignupConfirmationEmail } from "@/app/lib/email-notifications"
import { createAdminSupabaseClient } from "@/app/lib/supabase-admin"
import { isValidEmail, isStrongEnoughPassword, normalizeEmail } from "@/app/lib/signup-validation"

type SignupRole = "advertiser" | "comedian"

type SignupRequestBody = {
  role?: SignupRole
  email?: string
  password?: string
  redirectTo?: string
  profile?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

function buildVerificationUrl(redirectTo: string, tokenHash: string, type: "signup" | "recovery") {
  const url = new URL(redirectTo)
  url.searchParams.set("token_hash", tokenHash)
  url.searchParams.set("type", type)
  return url.toString()
}

function getSignupErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("duplicate") ||
    normalized.includes("unique")
  ) {
    return "Un compte existe déjà avec cet email."
  }

  if (normalized.includes("password")) {
    return "Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre."
  }

  return "Impossible de créer le compte. Veuillez réessayer."
}

async function deleteAuthUserIfNeeded(userId: string | null) {
  if (!userId) return

  try {
    await createAdminSupabaseClient().auth.admin.deleteUser(userId)
  } catch (cleanupError) {
    console.error("[SIGNUP] Nettoyage utilisateur Auth impossible:", cleanupError)
  }
}

export async function POST(request: Request) {
  let authUserId: string | null = null

  try {
    const body = (await request.json()) as SignupRequestBody
    const role = body.role
    const email = normalizeEmail(body.email)
    const password = body.password || ""
    const profile = body.profile || {}
    const metadata = body.metadata || {}
    const redirectTo = body.redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`

    if (role !== "advertiser" && role !== "comedian") {
      return NextResponse.json({ error: "Type de compte invalide" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Veuillez entrer une adresse e-mail valide" }, { status: 400 })
    }

    if (!isStrongEnoughPassword(password)) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre." },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: metadata,
      },
    })

    if (linkError || !linkData.user || !linkData.properties?.action_link) {
      return NextResponse.json(
        { error: getSignupErrorMessage(linkError?.message || "") },
        { status: 400 }
      )
    }

    authUserId = linkData.user.id

    if (role === "advertiser") {
      const { error: profileError } = await supabase
        .from("annonceurs")
        .insert({
          ...profile,
          auth_user_id: authUserId,
          email,
        } as never)

      if (profileError) {
        await deleteAuthUserIfNeeded(authUserId)
        return NextResponse.json(
          { error: getSignupErrorMessage(profileError.message) },
          { status: 400 }
        )
      }
    } else {
      const profilePayload = {
        ...profile,
        auth_user_id: authUserId,
        email,
      }

      let { error: profileError } = await supabase
        .from("comediens")
        .insert(profilePayload as never)

      if (profileError && /genre|schema cache|column/i.test(profileError.message)) {
        const profileWithoutGenre: Record<string, unknown> = { ...profilePayload }
        delete profileWithoutGenre.genre
        const retry = await supabase
          .from("comediens")
          .insert(profileWithoutGenre as never)
        profileError = retry.error
      }

      if (profileError) {
        await deleteAuthUserIfNeeded(authUserId)
        return NextResponse.json(
          { error: getSignupErrorMessage(profileError.message) },
          { status: 400 }
        )
      }
    }

    const tokenHash = linkData.properties.hashed_token
    if (!tokenHash) {
      await deleteAuthUserIfNeeded(authUserId)
      return NextResponse.json(
        { error: "Le lien de confirmation n'a pas pu être généré." },
        { status: 500 }
      )
    }

    try {
      await sendSignupConfirmationEmail({
        email,
        confirmationUrl: buildVerificationUrl(redirectTo, tokenHash, "signup"),
      })
    } catch (emailError) {
      await deleteAuthUserIfNeeded(authUserId)
      console.error("[SIGNUP] Envoi email confirmation Resend impossible:", emailError)
      return NextResponse.json(
        { error: "Le compte n'a pas pu être créé car l'email de confirmation n'a pas pu être envoyé." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: authUserId,
    })
  } catch (error) {
    await deleteAuthUserIfNeeded(authUserId)
    console.error("[SIGNUP] Erreur inscription:", error)
    return NextResponse.json(
      { error: "Une erreur inattendue s'est produite. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
