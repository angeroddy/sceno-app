import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Route API pour créer un nouveau compte administrateur
 *
 * Cette route utilise la Service Role Key de Supabase pour créer
 * un utilisateur directement dans auth.users ET dans la table admins
 *
 * SÉCURITÉ : Protégée par une clé secrète (ADMIN_CREATION_SECRET_KEY)
 */

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, nom, secretKey } = body

    // SÉCURITÉ : Vérifier une clé secrète
    const ADMIN_CREATION_SECRET = process.env.ADMIN_CREATION_SECRET_KEY

    if (!ADMIN_CREATION_SECRET) {
      return NextResponse.json(
        {
          error: 'Configuration manquante',
          help: 'Ajoutez ADMIN_CREATION_SECRET_KEY dans votre fichier .env.local'
        },
        { status: 500 }
      )
    }

    if (secretKey !== ADMIN_CREATION_SECRET) {
      return NextResponse.json(
        { error: 'Clé secrète invalide' },
        { status: 403 }
      )
    }

    // Validation des champs
    if (!email || !password || !nom) {
      return NextResponse.json(
        { error: 'Email, mot de passe et nom sont obligatoires' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    // Vérifier que la Service Role Key existe
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error: 'Configuration manquante',
          help: 'Ajoutez SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env.local (voir Supabase Settings → API → service_role key)'
        },
        { status: 500 }
      )
    }

    // Créer un client Supabase avec la Service Role Key (droits admin)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Vérifier si un admin avec cet email existe déjà
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Un admin avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // 1. Créer l'utilisateur dans auth.users avec la Service Role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirmer l'email
    })

    if (authError || !authData.user) {
      console.error('Erreur création utilisateur Auth:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Erreur lors de la création de l\'utilisateur' },
        { status: 500 }
      )
    }

    console.log('✅ Utilisateur créé dans auth.users:', authData.user.id)

    // 2. Créer le profil admin dans la table admins
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .insert({
        auth_user_id: authData.user.id,
        email: email,
        nom: nom,
      })
      .select()
      .single()

    if (adminError) {
      console.error('Erreur création profil admin:', adminError)

      // Tenter de supprimer l'utilisateur auth créé pour éviter les incohérences
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: 'Erreur lors de la création du profil admin' },
        { status: 500 }
      )
    }

    console.log('✅ Profil admin créé:', adminData.id)

    return NextResponse.json({
      success: true,
      message: 'Compte admin créé avec succès !',
      admin: {
        id: adminData.id,
        email: adminData.email,
        nom: adminData.nom,
        auth_user_id: authData.user.id,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur inattendue:', error)
    return NextResponse.json(
      { error: 'Erreur inattendue lors de la création de l\'admin' },
      { status: 500 }
    )
  }
}
