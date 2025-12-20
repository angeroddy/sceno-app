# Configuration des Emails avec le serveur intégré Supabase

## Le problème

Vous utilisez déjà le serveur mail de Supabase (pas besoin de Gmail/SendGrid), mais les emails ne partent pas. Voici comment le résoudre.

## Solution en 3 étapes (5 minutes max)

### ✅ Étape 1 : Activer la confirmation email dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **scenio-app**
3. Dans le menu de gauche, cliquez sur **Authentication**
4. Cliquez sur **Providers**
5. Cliquez sur **Email**
6. **VÉRIFIEZ ET ACTIVEZ** :
   - ✅ "Enable Email Provider" doit être **ON**
   - ✅ "Confirm email" doit être **ON**
   - ✅ "Secure email change" → recommandé ON
7. Cliquez sur **Save**

### ✅ Étape 2 : Configurer les URL de redirection

1. Toujours dans **Authentication**
2. Cliquez sur **URL Configuration** (dans le menu à gauche)
3. Vérifiez ces paramètres :

**Site URL** (l'URL principale de votre app) :
```
http://localhost:3000
```

**Redirect URLs** (les URLs autorisées après confirmation) :
Ajoutez ces lignes UNE PAR UNE :
```
http://localhost:3000/**
http://localhost:3000/auth/confirm
http://localhost:3000/dashboard
http://localhost:3000/inscription-reussie
```

4. Cliquez sur **Save**

### ✅ Étape 3 : Personnaliser le template d'email (optionnel mais recommandé)

1. Dans **Authentication** → **Email Templates**
2. Sélectionnez **"Confirm signup"**
3. Remplacez le contenu par :

```html
<h2>Bienvenue sur Scenio !</h2>

<p>Merci de vous être inscrit sur Scenio.</p>

<p>Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #E63832; color: white; text-decoration: none; border-radius: 4px;">
    Confirmer mon email
  </a>
</p>

<p>Ou copiez ce lien dans votre navigateur :</p>
<p>{{ .ConfirmationURL }}</p>

<p>Ce lien expire dans 24 heures.</p>

<p>L'équipe Scenio</p>
```

4. Cliquez sur **Save**

## 🧪 Tester l'inscription

### 1. Supprimer les anciens comptes de test

1. Dans **Authentication** → **Users**
2. Supprimez tous les utilisateurs de test précédents

### 2. Faire une nouvelle inscription

1. Allez sur http://localhost:3000/inscription
2. Remplissez le formulaire avec **VOTRE VRAI EMAIL**
3. Validez l'inscription
4. Vous devriez voir la page "Inscription réussie"

### 3. Vérifier l'email

**IMPORTANT** : Vérifiez ces endroits dans l'ordre :

1. ✅ **Boîte de réception** (inbox)
2. ✅ **Courrier indésirable / Spam** ← Souvent ici !
3. ✅ **Promotions** (Gmail)
4. ✅ **Notifications** (Gmail)

**Attendez 2-3 minutes** - parfois il y a un délai.

L'email vient de : `noreply@mail.app.supabase.io`

### 4. Vérifier dans Supabase si l'email a été envoyé

1. Dans Supabase Dashboard
2. Allez dans **Logs** (menu de gauche, icône avec des lignes)
3. Cliquez sur **Auth Logs**
4. Cherchez les événements récents :
   - `user.signup` → L'inscription a réussi ✅
   - Si vous voyez une erreur → il y a un problème

## 🔍 Problèmes fréquents

### "Je ne reçois toujours pas l'email après 5 minutes"

**Vérifiez le quota Supabase :**

Le serveur mail gratuit de Supabase est limité :
- ⚠️ **Maximum ~3-4 emails par heure**
- ⚠️ **Si quota dépassé** : attendez 1 heure

**Solution temporaire** : Testez avec un autre email

### "L'email arrive en spam"

C'est normal avec le serveur Supabase gratuit. Deux options :

**Option 1** : Ajoutez `noreply@mail.app.supabase.io` à vos contacts
**Option 2** : Configurez un SMTP personnalisé (Gmail, SendGrid) plus tard

### "Le lien de confirmation ne fonctionne pas"

1. Vérifiez que votre app tourne sur `http://localhost:3000`
2. Vérifiez que l'URL est bien dans la liste des "Redirect URLs"
3. Le lien expire après 24h - demandez un nouveau lien

### "Erreur: Email rate limit exceeded"

Vous avez dépassé le quota. **Solutions** :

1. **Attendez 1 heure** et réessayez
2. OU configurez un SMTP externe (voir autre guide)
3. OU désactivez temporairement la confirmation pour tester

## 🔧 Mode développement : Désactiver temporairement la confirmation

⚠️ **UNIQUEMENT POUR TESTER EN LOCAL**

Si vous voulez tester rapidement sans email :

1. Authentication → Providers → Email
2. **Désactivez** "Confirm Email"
3. Save
4. Les utilisateurs peuvent se connecter immédiatement

**⚠️ N'oubliez pas de le réactiver avant le déploiement !**

## 📊 Vérifier que tout fonctionne

Après avoir activé la confirmation :

1. ✅ L'utilisateur s'inscrit
2. ✅ Il voit la page "Inscription réussie"
3. ✅ Il reçoit un email (vérifier spam)
4. ✅ Il clique sur le lien de confirmation
5. ✅ Il est redirigé vers `/auth/confirm`
6. ✅ Son compte est activé
7. ✅ Il est redirigé vers `/dashboard`

## 📝 Checklist de configuration

Cochez que tout est fait :

- [ ] "Enable Email Provider" est activé
- [ ] "Confirm email" est activé
- [ ] Site URL est configurée : `http://localhost:3000`
- [ ] Redirect URLs incluent `/auth/confirm` et `/dashboard`
- [ ] J'ai supprimé les anciens utilisateurs de test
- [ ] J'ai testé avec mon vrai email
- [ ] J'ai vérifié mes spams

## 💡 Astuce

Pour éviter les spams à l'avenir (production) :

1. Utilisez votre propre domaine
2. Configurez un SMTP externe (Gmail/SendGrid)
3. Configurez SPF et DKIM pour votre domaine

Mais pour le développement local, le serveur Supabase suffit ! 🎉
