import { DELETE } from "@/app/api/comedien/compte/route"
import { createServerSupabaseClient } from "@/app/lib/supabase"
import { createAdminSupabaseClient } from "@/app/lib/supabase-admin"

jest.mock("@/app/lib/supabase", () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock("@/app/lib/supabase-admin", () => ({
  createAdminSupabaseClient: jest.fn(),
}))

describe("DELETE /api/comedien/compte", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("retourne 401 si l'utilisateur n'est pas authentifié", async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })

    const response = await DELETE()

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Non authentifié" })
  })

  it("retourne 404 si le profil comédien est introuvable", async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    })

    const response = await DELETE()

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "Profil comédien introuvable." })
  })

  it("anonymise le compte, nettoie les données annexes et écrit un audit", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "comedien-1",
        nom: "Dupont",
        prenom: "Jeanne",
        email: "jeanne@example.com",
        photo_url: "https://brygmtgetzcmogoitdwz.supabase.co/storage/v1/object/public/photos/comediens/auth-1-avatar.webp",
        compte_supprime: false,
      },
      error: null,
    })

    const accountDeletionInsert = jest.fn().mockResolvedValue({ error: null })
    const notificationsEq = jest.fn().mockResolvedValue({ error: null })
    const bloqueesEq = jest.fn().mockResolvedValue({ error: null })
    const vuesEq = jest.fn().mockResolvedValue({ error: null })
    const comediensEq = jest.fn().mockResolvedValue({ error: null })
    const remove = jest.fn().mockResolvedValue({ error: null })
    const deleteUser = jest.fn().mockResolvedValue({ error: null })

    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null }),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle,
          })),
        })),
      })),
    })

    ;(createAdminSupabaseClient as jest.Mock).mockReturnValue({
      auth: {
        admin: {
          deleteUser,
        },
      },
      from: jest.fn((table: string) => {
        if (table === "account_deletions") {
          return { insert: accountDeletionInsert }
        }
        if (table === "notifications_email") {
          return { delete: jest.fn(() => ({ eq: notificationsEq })) }
        }
        if (table === "annonceurs_bloques") {
          return { delete: jest.fn(() => ({ eq: bloqueesEq })) }
        }
        if (table === "opportunite_vues") {
          return { delete: jest.fn(() => ({ eq: vuesEq })) }
        }
        if (table === "comediens") {
          return { update: jest.fn(() => ({ eq: comediensEq })) }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
      storage: {
        from: jest.fn(() => ({
          remove,
        })),
      },
    })

    const response = await DELETE()

    expect(response.status).toBe(200)
    expect(accountDeletionInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_user_id: "auth-1",
        profile_type: "comedian",
        profile_id: "comedien-1",
        deleted_by: "self",
      })
    )
    expect(notificationsEq).toHaveBeenCalledWith("comedien_id", "comedien-1")
    expect(bloqueesEq).toHaveBeenCalledWith("comedien_id", "comedien-1")
    expect(vuesEq).toHaveBeenCalledWith("comedien_id", "comedien-1")
    expect(comediensEq).toHaveBeenCalledWith("id", "comedien-1")
    expect(remove).toHaveBeenCalledWith(["comediens/auth-1-avatar.webp"])
    expect(deleteUser).toHaveBeenCalledWith("auth-1")
    await expect(response.json()).resolves.toEqual({ success: true })
  })
})
