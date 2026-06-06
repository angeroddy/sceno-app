import { NextResponse } from "next/server"

import { sendPasswordResetEmail } from "@/app/lib/email-notifications"
import { createAdminSupabaseClient } from "@/app/lib/supabase-admin"
import { isValidEmail, normalizeEmail } from "@/app/lib/signup-validation"

type PasswordResetRequestBody = {
  email?: string
  redirectTo?: string
}

function buildVerificationUrl(redirectTo: string, tokenHash: string) {
  const url = new URL(redirectTo)
  url.searchParams.set("token_hash", tokenHash)
  url.searchParams.set("type", "recovery")
  return url.toString()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PasswordResetRequestBody
    const email = normalizeEmail(body.email)
    const redirectTo =
      body.redirectTo ||
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?type=recovery&next=/mot-de-passe-oublie?mode=reset`

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Veuillez entrer une adresse e-mail valide." }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo,
      },
    })

    if (error || !data.properties?.hashed_token) {
      console.warn("[PASSWORD RESET] Lien non généré:", error?.message)
      return NextResponse.json({ success: true })
    }

    await sendPasswordResetEmail({
      email,
      resetUrl: buildVerificationUrl(redirectTo, data.properties.hashed_token),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PASSWORD RESET] Erreur demande réinitialisation:", error)
    return NextResponse.json(
      { error: "Impossible d'envoyer l'email de réinitialisation. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
