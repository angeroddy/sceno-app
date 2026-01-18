# 🔐 Guide : Créer un compte Administrateur

Ce guide explique comment créer votre premier compte admin sur Scenio.

---

## 📋 **Prérequis**

Vous aurez besoin de 2 clés secrètes de Supabase :

1. **Service Role Key** (clé admin de Supabase)
2. **Secret Key personnalisée** (pour sécuriser la route)

---

## ⚙️ **Étape 1 : Configuration des variables d'environnement**

### 1. Récupérer la Service Role Key de Supabase

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. **Settings** → **API**
4. Descendez jusqu'à **Project API keys**
5. Copiez la clé **`service_role`** (⚠️ PAS la clé `anon` !)

### 2. Créer une clé secrète personnalisée

Générez une clé aléatoire sécurisée (ou utilisez un mot de passe fort) :
```bash
# Exemple de génération (Linux/Mac)
openssl rand -base64 32

# Ou créez simplement un mot de passe fort
# Exemple : MyS3cr3tK3y!2024#Admin
```

### 3. Ajouter les variables dans `.env.local`

Ouvrez ou créez le fichier `.env.local` à la racine du projet :

```bash
# Variables Supabase existantes
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key...

# NOUVELLES VARIABLES À AJOUTER :
# Service Role Key (pour créer des admins)
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key-ici

# Clé secrète pour protéger la création d'admins
ADMIN_CREATION_SECRET_KEY=MyS3cr3tK3y!2024#Admin
```

⚠️ **IMPORTANT** : Ne commitez JAMAIS le fichier `.env.local` sur Git !

---

## 🚀 **Étape 2 : Créer votre premier admin**

### Option A : Via cURL (Terminal)

```bash
curl -X POST http://localhost:3000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@scenio.com",
    "password": "VotreMotDePasseAdmin123!",
    "nom": "Super Admin",
    "secretKey": "MyS3cr3tK3y!2024#Admin"
  }'
```

### Option B : Via Postman

1. Créez une nouvelle requête **POST**
2. URL : `http://localhost:3000/api/admin/create`
3. Headers :
   - `Content-Type: application/json`
4. Body (raw JSON) :
```json
{
  "email": "admin@scenio.com",
  "password": "VotreMotDePasseAdmin123!",
  "nom": "Super Admin",
  "secretKey": "MyS3cr3tK3y!2024#Admin"
}
```

### Option C : Via le navigateur (Fetch)

Ouvrez la console du navigateur (F12) sur `http://localhost:3000` et exécutez :

```javascript
fetch('http://localhost:3000/api/admin/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@scenio.com',
    password: 'VotreMotDePasseAdmin123!',
    nom: 'Super Admin',
    secretKey: 'MyS3cr3tK3y!2024#Admin'
  })
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err))
```

---

## ✅ **Étape 3 : Vérifier la création**

Si tout s'est bien passé, vous verrez :

```json
{
  "success": true,
  "message": "Compte admin créé avec succès !",
  "admin": {
    "id": "uuid-de-l-admin",
    "email": "admin@scenio.com",
    "nom": "Super Admin",
    "auth_user_id": "uuid-auth"
  }
}
```

### Vérifiez dans Supabase :

1. **Table `admins`** : Une nouvelle ligne doit apparaître
2. **Authentication → Users** : Un utilisateur avec cet email doit exister

---

## 🔓 **Étape 4 : Se connecter**

1. Allez sur `http://localhost:3000/connexion`
2. Connectez-vous avec :
   - Email : `admin@scenio.com`
   - Mot de passe : `VotreMotDePasseAdmin123!`
3. Vous serez redirigé vers `/admin` 🎉

---

## 🛡️ **Sécurité en Production**

⚠️ **IMPORTANT** : Cette route est DANGEREUSE en production !

### Option 1 : Désactiver la route après création

Une fois tous vos admins créés, **supprimez ou commentez** le fichier :
```
app/api/admin/create/route.ts
```

### Option 2 : Restreindre l'accès

Modifiez la route pour vérifier que l'utilisateur est déjà un admin :

```typescript
// Ajouter au début de la route
const user = await getUser()
const admin = await getAdminProfile()

if (!admin) {
  return NextResponse.json(
    { error: 'Accès refusé : seuls les admins peuvent créer des admins' },
    { status: 403 }
  )
}
```

### Option 3 : Variables d'environnement de production

Sur Vercel/production, ajoutez les mêmes variables :
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_CREATION_SECRET_KEY`

---

## ❓ **Résolution des problèmes**

### Erreur : "Configuration manquante"
➜ Vérifiez que `.env.local` contient bien les 2 nouvelles variables

### Erreur : "Clé secrète invalide"
➜ Vérifiez que `secretKey` dans votre requête correspond à `ADMIN_CREATION_SECRET_KEY`

### Erreur : "Un admin avec cet email existe déjà"
➜ Cet email est déjà utilisé, choisissez-en un autre

### L'admin ne peut pas se connecter
➜ Vérifiez dans Supabase Authentication que l'utilisateur existe et est confirmé

---

## 📞 **Support**

Si vous avez des questions, contactez l'équipe de développement.
