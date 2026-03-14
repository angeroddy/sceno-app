import { NextResponse } from "next/server"
import { getAuthenticatedUserContext } from "@/app/lib/supabase"

export async function GET() {
  const { user, userType } = await getAuthenticatedUserContext()

  return NextResponse.json({
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          email: user.email ?? null,
        }
      : null,
    userType,
  })
}
