import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

import { createServerSupabaseClient } from "@/lib/supabase"
import type { Admin, Annonceur, Comedien } from "@/types"

export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>

type AuthSuccess<TProfile> = {
  ok: true
  supabase: ServerSupabaseClient
  user: User
  profile: TProfile
}

type AuthFailure = {
  ok: false
  response: NextResponse
}

export type AuthResult<TProfile> = AuthSuccess<TProfile> | AuthFailure

function jsonError(message: string, status: number): AuthFailure {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status }),
  }
}

async function requireUser(): Promise<
  | { ok: true; supabase: ServerSupabaseClient; user: User }
  | AuthFailure
> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return jsonError("Non authentifié", 401)
  }

  return { ok: true, supabase, user }
}

export async function requireComedian(): Promise<AuthResult<Comedien>> {
  const context = await requireUser()
  if (!context.ok) return context

  const { data, error } = await context.supabase
    .from("comediens")
    .select("*")
    .eq("auth_user_id", context.user.id)
    .single()

  const profile = data as Comedien | null

  if (error || !profile) {
    return jsonError("Profil comédien introuvable", 404)
  }

  if (profile.compte_supprime) {
    return jsonError("Compte supprimé", 403)
  }

  return { ok: true, supabase: context.supabase, user: context.user, profile }
}

export async function requireAdvertiser(): Promise<AuthResult<Annonceur>> {
  const context = await requireUser()
  if (!context.ok) return context

  const { data, error } = await context.supabase
    .from("annonceurs")
    .select("*")
    .eq("auth_user_id", context.user.id)
    .single()

  const profile = data as Annonceur | null

  if (error || !profile) {
    return jsonError("Profil annonceur introuvable", 404)
  }

  if (profile.compte_supprime) {
    return jsonError("Compte supprimé", 403)
  }

  return { ok: true, supabase: context.supabase, user: context.user, profile }
}

export async function requireAdmin(): Promise<AuthResult<Admin>> {
  const context = await requireUser()
  if (!context.ok) return context

  const { data, error } = await context.supabase
    .from("admins")
    .select("*")
    .eq("auth_user_id", context.user.id)
    .single()

  const profile = data as Admin | null

  if (error || !profile) {
    return jsonError("Accès refusé", 403)
  }

  return { ok: true, supabase: context.supabase, user: context.user, profile }
}
