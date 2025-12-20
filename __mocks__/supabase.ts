// Mock pour le client Supabase
export const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    })),
  },
  from: jest.fn((table: string) => ({
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  })),
  storage: {
    from: jest.fn((bucket: string) => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
}

// Mock de la fonction createClient
export const createClient = jest.fn(() => mockSupabaseClient)
