import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/app/types'
import { resolveUserTypeForAuthUser } from '@/app/lib/supabase'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Récupérer la session
  const { data: { user } } = await supabase.auth.getUser()
  const userType = user
    ? await resolveUserTypeForAuthUser(supabase as never, user.id)
    : null

  const pathname = request.nextUrl.pathname

  // ============================================
  // ROUTES PROTÉGÉES - COMÉDIENS
  // ============================================
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/connexion', request.url))
    }

    if (userType !== 'comedian') {
      return NextResponse.redirect(new URL('/connexion', request.url))
    }
  }

  // ============================================
  // ROUTES PROTÉGÉES - ANNONCEURS
  // ============================================
  if (pathname.startsWith('/annonceur')) {
    // Exclure la page d'inscription annonceur
    if (pathname === '/inscription/annonceur') {
      return response
    }

    if (!user) {
      return NextResponse.redirect(new URL('/connexion', request.url))
    }

    if (userType !== 'advertiser') {
      return NextResponse.redirect(new URL('/connexion', request.url))
    }
  }

  // ============================================
  // ROUTES PROTÉGÉES - ADMIN
  // ============================================
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/connexion', request.url))
    }

    if (userType !== 'admin') {
      // Rediriger vers l'accueil si pas admin
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ============================================
  // REDIRECTION SI DÉJÀ CONNECTÉ
  // ============================================
  if (pathname === '/connexion' || pathname === '/inscription') {
    if (user) {
      // Déterminer où rediriger selon le type d'utilisateur
      if (userType === 'comedian') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      if (userType === 'advertiser') {
        return NextResponse.redirect(new URL('/annonceur', request.url))
      }

      if (userType === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
  }

  return response
}

// ============================================
// CONFIGURATION DES ROUTES À SURVEILLER
// ============================================
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/annonceur/:path*',
    '/admin/:path*',
    '/connexion',
    '/inscription',
  ],
}
