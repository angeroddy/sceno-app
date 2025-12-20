# Configuration des Emails de Confirmation

## Pourquoi vous ne recevez pas les emails ?

### Problème principal
Par défaut, **Supabase limite l'envoi d'emails** pour éviter les abus. Les projets gratuits ont :
- ⚠️ Un nombre limité d'emails par heure (3-4 emails)
- ⚠️ Les emails peuvent être marqués comme spam
- ⚠️ Pas de serveur SMTP personnalisé configuré

## Solution : Configurer un serveur SMTP

### Option 1 : Utiliser Gmail (Recommandé pour débuter)

#### Étape 1 : Créer un mot de passe d'application Gmail

1. Allez sur https://myaccount.google.com/security
2. Activez la **"Validation en deux étapes"** (obligatoire)
3. Une fois activée, cherchez **"Mots de passe des applications"**
4. Créez un nouveau mot de passe pour "Mail"
5. Notez ce mot de passe (vous ne pourrez le voir qu'une fois)

#### Étape 2 : Configurer dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **scenio-app**
3. Allez dans **Settings** > **Auth**
4. Descendez jusqu'à **SMTP Settings**
5. Activez **"Enable Custom SMTP"**
6. Remplissez les informations :

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: votre.email@gmail.com
SMTP Password: [le mot de passe d'application créé]
Sender Email: votre.email@gmail.com
Sender Name: Scenio
```

7. Cliquez sur **Save**

### Option 2 : Utiliser SendGrid (Recommandé pour production)

#### Étape 1 : Créer un compte SendGrid

1. Allez sur https://sendgrid.com/
2. Créez un compte gratuit (100 emails/jour)
3. Vérifiez votre email

#### Étape 2 : Créer une clé API

1. Dans SendGrid, allez dans **Settings** > **API Keys**
2. Cliquez sur **Create API Key**
3. Nom : "Scenio Supabase"
4. Permissions : **Full Access**
5. Copiez la clé API (vous ne pourrez la voir qu'une fois)

#### Étape 3 : Vérifier votre domaine (optionnel mais recommandé)

1. Dans SendGrid, allez dans **Settings** > **Sender Authentication**
2. Cliquez sur **Verify a Single Sender**
3. Remplissez vos informations
4. Vérifiez l'email reçu

#### Étape 4 : Configurer dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **scenio-app**
3. Allez dans **Settings** > **Auth**
4. Descendez jusqu'à **SMTP Settings**
5. Activez **"Enable Custom SMTP"**
6. Remplissez :

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: [votre clé API SendGrid]
Sender Email: noreply@votredomaine.com (ou email vérifié)
Sender Name: Scenio
```

7. Cliquez sur **Save**

### Option 3 : Utiliser Resend (Moderne et simple)

1. Créez un compte sur https://resend.com/ (3000 emails/mois gratuit)
2. Créez une clé API
3. Suivez les mêmes étapes que SendGrid avec les paramètres Resend

## Configuration de l'authentification

### Étape 1 : Vérifier les paramètres Auth

1. Dans Supabase Dashboard
2. **Authentication** > **Providers** > **Email**
3. Assurez-vous que :
   - ✅ **Enable Email Provider** est activé
   - ✅ **Confirm Email** est activé
   - ✅ **Secure Email Change** est activé (recommandé)

### Étape 2 : Configurer les URL de redirection

1. Toujours dans **Authentication** > **URL Configuration**
2. **Site URL** : `https://votre-domaine.com` (ou `http://localhost:3000` en dev)
3. **Redirect URLs** : Ajoutez ces URLs (une par ligne) :
   ```
   http://localhost:3000/**
   https://votre-domaine.com/**
   http://localhost:3000/dashboard
   https://votre-domaine.com/dashboard
   ```

### Étape 3 : Personnaliser les templates d'email

1. Dans **Authentication** > **Email Templates**
2. Personnalisez le template **"Confirm signup"** :

```html
<h2>Confirmez votre inscription à Scenio</h2>

<p>Bonjour,</p>

<p>Merci de vous être inscrit sur <strong>Scenio</strong>, la plateforme qui vous connecte aux meilleures opportunités pour comédiens.</p>

<p>Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>

<a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #E63832; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
  Confirmer mon inscription
</a>

<p>Ou copiez ce lien dans votre navigateur :</p>
<p>{{ .ConfirmationURL }}</p>

<p>Ce lien est valable pendant 24 heures.</p>

<p>Si vous n'avez pas demandé cette inscription, vous pouvez ignorer cet email.</p>

<p>À bientôt sur Scenio !<br>
L'équipe Scenio</p>
```

## Tester la configuration

### Étape 1 : Supprimer les anciens tests

1. Dans Supabase Dashboard
2. **Authentication** > **Users**
3. Supprimez tous les utilisateurs de test

### Étape 2 : Tester l'inscription

1. Allez sur votre formulaire d'inscription
2. Inscrivez-vous avec votre email personnel
3. Vérifiez :
   - ✅ L'inscription réussit
   - ✅ Vous recevez un email de confirmation (vérifiez aussi les spams)
   - ✅ Le lien de confirmation fonctionne
   - ✅ Vous pouvez vous connecter après confirmation

### Étape 3 : Vérifier les logs

1. Dans Supabase Dashboard
2. **Logs** > **Auth Logs**
3. Cherchez les événements `user.signup` et `user.confirmation`

## Troubleshooting

### "Je ne reçois toujours pas d'email"

1. **Vérifiez vos spams**
2. **Attendez 5 minutes** (parfois il y a un délai)
3. **Vérifiez les logs** dans Supabase Dashboard > Logs
4. **Testez le SMTP** avec un outil comme https://www.smtper.net/

### "L'email arrive en spam"

1. Configurez SPF et DKIM pour votre domaine
2. Utilisez SendGrid avec un domaine vérifié
3. Ajoutez un lien de désinscription dans vos emails

### "Quota dépassé"

1. **Solution temporaire** : Attendez 1 heure
2. **Solution permanente** : Passez à un plan payant ou configurez votre SMTP

### "Le lien de confirmation ne fonctionne pas"

1. Vérifiez que l'URL de redirection est dans la liste autorisée
2. Vérifiez que votre app tourne sur le bon port
3. Vérifiez les logs réseau dans la console navigateur

## Configuration en développement

Si vous voulez tester rapidement sans email :

### Option : Désactiver temporairement la confirmation

⚠️ **À utiliser UNIQUEMENT en développement local !**

1. Dans Supabase Dashboard
2. **Authentication** > **Providers** > **Email**
3. **Désactivez** "Confirm Email"
4. Les utilisateurs pourront se connecter immédiatement

**N'oubliez pas de le réactiver avant de déployer en production !**

## Résumé des étapes

✅ **Étape 1** : Configurer un serveur SMTP (Gmail, SendGrid ou Resend)
✅ **Étape 2** : Activer "Confirm Email" dans Supabase
✅ **Étape 3** : Configurer les URL de redirection
✅ **Étape 4** : Personnaliser le template d'email
✅ **Étape 5** : Tester avec votre propre email

## Support

Si vous rencontrez toujours des problèmes :
1. Vérifiez les logs Supabase
2. Testez avec un autre email
3. Contactez le support Supabase si le problème persiste
