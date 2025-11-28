import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
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

  const pathname = request.nextUrl.pathname

  // ============================================
  // ROUTES PROTÉGÉES - COMÉDIENS
  // ============================================
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/connexion', request.url))
    }

    // Vérifier que c'est bien un comédien
    const { data: comedien } = await supabase
      .from('comediens')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!comedien) {
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

    // Vérifier que c'est bien un annonceur
    const { data: annonceur } = await supabase
      .from('annonceurs')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!annonceur) {
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

    // Vérifier que c'est bien un admin
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!admin) {
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
      const { data: comedien } = await supabase
        .from('comediens')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (comedien) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      const { data: annonceur } = await supabase
        .from('annonceurs')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (annonceur) {
        return NextResponse.redirect(new URL('/annonceur', request.url))
      }

      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (admin) {
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
