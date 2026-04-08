import { GET } from "@/app/api/annonceur/opportunites/[id]/participants/route"
import { createServerSupabaseClient } from "@/app/lib/supabase"
import { createAdminSupabaseClient } from "@/app/lib/supabase-admin"

jest.mock("@/app/lib/supabase", () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock("@/app/lib/supabase-admin", () => ({
  createAdminSupabaseClient: jest.fn(),
}))

describe("GET /api/annonceur/opportunites/[id]/participants", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("retourne 401 si l'utilisateur n'est pas authentifié", async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "auth error" },
        }),
      },
    })

    const response = await GET({} as Request, { params: Promise.resolve({ id: "opp-1" }) })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Non authentifié" })
  })

  it("retourne les profils acheteurs confirmés de l'opportunité", async () => {
    ;(createServerSupabaseClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "auth-1" } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === "annonceurs") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { id: "ann-1", auth_user_id: "auth-1" },
                  error: null,
                }),
              })),
            })),
          }
        }

        if (table === "opportunites") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { id: "opp-1", titre: "Masterclass caméra" },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }

        throw new Error(`Unexpected server table ${table}`)
      }),
    })

    ;(createAdminSupabaseClient as jest.Mock).mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "achats") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn().mockResolvedValue({
                    data: [
                      { id: "achat-2", comedien_id: "comedien-2", created_at: "2026-03-28T09:00:00.000Z" },
                      { id: "achat-1", comedien_id: "comedien-1", created_at: "2026-03-27T09:00:00.000Z" },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }

        if (table === "comediens") {
          return {
            select: jest.fn(() => ({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: "comedien-1",
                    nom: "Durand",
                    prenom: "Lina",
                    date_naissance: "1998-05-14",
                    genre: "feminin",
                    photo_url: "https://example.com/lina.jpg",
                    lien_demo: "https://example.com/demo",
                    compte_supprime: false,
                  },
                  {
                    id: "comedien-2",
                    nom: "Compte",
                    prenom: "supprimé",
                    date_naissance: "1990-01-01",
                    genre: "masculin",
                    photo_url: null,
                    lien_demo: null,
                    compte_supprime: true,
                  },
                ],
                error: null,
              }),
            })),
          }
        }

        throw new Error(`Unexpected admin table ${table}`)
      }),
    })

    const response = await GET({} as Request, { params: Promise.resolve({ id: "opp-1" }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.opportunite).toEqual({ id: "opp-1", titre: "Masterclass caméra" })
    expect(data.participants).toHaveLength(2)
    expect(data.participants[0]).toEqual({
      achat_id: "achat-2",
      purchased_at: "2026-03-28T09:00:00.000Z",
      comedien: {
        id: "comedien-2",
        nom: "Compte",
        prenom: "supprimé",
        photo_url: null,
        lien_demo: null,
        date_naissance: null,
        genre: null,
        compte_supprime: true,
      },
    })
    expect(data.participants[1].comedien).toEqual({
      id: "comedien-1",
      nom: "Durand",
      prenom: "Lina",
      photo_url: "https://example.com/lina.jpg",
      lien_demo: "https://example.com/demo",
      date_naissance: "1998-05-14",
      genre: "feminin",
      compte_supprime: false,
    })
  })
})
