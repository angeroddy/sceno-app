import type { User } from "@supabase/supabase-js"

import { normalizeEmail } from "@/app/lib/signup-validation"

export type UserType = "comedian" | "advertiser" | "admin" | "deleted" | null
export type SignupProfileType = "comedian" | "advertiser"

type MaybeSingleResult = Promise<{
  data: { id: string; compte_supprime?: boolean | null } | null
  error?: { message?: string | null } | null
}>

type UpdateResult = Promise<{
  error?: { message?: string | null } | null
}>

export type AuthProfileSupabase = {
  from: (table: "admins" | "annonceurs" | "comediens") => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => MaybeSingleResult
      }
    }
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => UpdateResult
    }
  }
}

type ProfileEmailPresence = {
  hasAdvertiser: boolean
  hasComedian: boolean
}

export async function resolveUserTypeForAuthUser(
  supabase: AuthProfileSupabase,
  userId: string
): Promise<UserType> {
  const [adminResult, annonceurResult, comedienResult] = await Promise.all([
    supabase.from("admins").select("id").eq("auth_user_id", userId).maybeSingle(),
    supabase.from("annonceurs").select("id").eq("auth_user_id", userId).maybeSingle(),
    supabase.from("comediens").select("id, compte_supprime").eq("auth_user_id", userId).maybeSingle(),
  ])

  if (adminResult.data) return "admin"
  if (annonceurResult.data) return "advertiser"
  if (comedienResult.data?.compte_supprime) return "deleted"
  if (comedienResult.data) return "comedian"

  return null
}

export async function getProfileEmailPresence(
  supabase: AuthProfileSupabase,
  email: string
): Promise<ProfileEmailPresence> {
  const normalizedEmail = normalizeEmail(email)
  const [annonceurResult, comedienResult] = await Promise.all([
    supabase.from("annonceurs").select("id").eq("email", normalizedEmail).maybeSingle(),
    supabase.from("comediens").select("id").eq("email", normalizedEmail).maybeSingle(),
  ])

  return {
    hasAdvertiser: Boolean(annonceurResult.data),
    hasComedian: Boolean(comedienResult.data),
  }
}

export function getSignupEmailConflictMessage(
  targetProfile: SignupProfileType,
  presence: ProfileEmailPresence
): string | null {
  if (presence.hasAdvertiser && presence.hasComedian) {
    return "Un compte existe déjà avec cet email."
  }

  if (targetProfile === "comedian") {
    if (presence.hasAdvertiser) {
      return "Un compte annonceur existe déjà avec cet email. Utilisez une autre adresse e-mail."
    }
    if (presence.hasComedian) {
      return "Un compte existe déjà avec cet email."
    }
    return null
  }

  if (presence.hasComedian) {
    return "Un compte comédien existe déjà avec cet email. Utilisez une autre adresse e-mail."
  }
  if (presence.hasAdvertiser) {
    return "Un compte existe déjà avec cet email."
  }

  return null
}

export async function getSignupEmailConflictForProfile(
  supabase: AuthProfileSupabase,
  email: string,
  targetProfile: SignupProfileType
): Promise<string | null> {
  const presence = await getProfileEmailPresence(supabase, email)
  return getSignupEmailConflictMessage(targetProfile, presence)
}

export async function syncEmailVerificationForAuthUser(
  supabase: AuthProfileSupabase,
  user: Pick<User, "id" | "email_confirmed_at">
): Promise<UserType> {
  const userType = await resolveUserTypeForAuthUser(supabase, user.id)

  if (!user.email_confirmed_at || !userType || userType === "admin" || userType === "deleted") {
    return userType
  }

  const table = userType === "advertiser" ? "annonceurs" : "comediens"

  const { error } = await supabase
    .from(table)
    .update({ email_verifie: true })
    .eq("auth_user_id", user.id)

  if (error) {
    console.error(`[AUTH PROFILE] Erreur mise à jour email_verifie (${userType})`, error.message)
  }

  return userType
}
