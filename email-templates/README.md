# 📧 Templates d'emails formations-artistiques.fr

Ce dossier contient les templates HTML pour tous les emails envoyés par Supabase Auth.

## 📋 Templates disponibles

- `confirmation-signup.html` - Email de confirmation d'inscription
- `magic-link.html` - Email de connexion par lien magique (à venir)
- `reset-password.html` - Email de réinitialisation de mot de passe (à venir)
- `change-email.html` - Email de changement d'adresse (à venir)

---

## 🚀 Configuration dans Supabase

### Étape 1 : Accéder aux templates d'email

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Menu gauche : **Authentication** > **Email Templates**

### Étape 2 : Configurer le template "Confirm signup"

1. Cliquez sur **Confirm signup** dans la liste
2. Copiez **tout le contenu** du fichier `confirmation-signup.html`
3. Collez dans l'éditeur
4. Cliquez sur **Save**

### Étape 3 : Personnaliser les variables

Les templates utilisent ces variables Supabase :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Lien de confirmation | https://votre-app.com/auth/confirm?token=... |
| `{{ .SiteURL }}` | URL de votre site | https://votre-app.com |
| `{{ .Token }}` | Token de confirmation | abc123... |
| `{{ .TokenHash }}` | Hash du token | xyz789... |
| `{{ .Email }}` | Email de l'utilisateur | user@example.com |

### Étape 4 : Tester l'email

1. Dans l'onglet **Email Templates**
2. Cliquez sur **Send test email**
3. Entrez votre adresse email
4. Vérifiez que l'email est bien reçu et affiché correctement

---

## 🎨 Personnalisation

### Changer les couleurs

Le template utilise la couleur principale de formations-artistiques.fr : `#E63832` (rouge)

Pour changer la couleur principale, remplacez toutes les occurrences de :
- `#E63832` → Votre couleur principale
- `#c42f2a` → Version plus foncée de votre couleur (pour les dégradés)

### Changer le logo

Actuellement, le logo est affiché en texte. Pour utiliser une image :

Remplacez cette section :
```html
<h1 style="margin: 0; color: #ffffff; font-size: 32px;">
    formations-artistiques.fr
</h1>
```

Par :
```html
<img src="https://votre-domaine.com/logo-blanc.png"
     alt="formations-artistiques.fr"
     width="150"
     style="display: block; margin: 0 auto;">
```

### Ajouter des liens sociaux

Dans le footer, ajoutez :

```html
<div style="margin: 16px 0;">
    <a href="https://facebook.com/formations-artistiques.fr" style="display: inline-block; margin: 0 8px;">
        <img src="https://votre-cdn.com/facebook-icon.png" alt="Facebook" width="24" height="24">
    </a>
    <a href="https://instagram.com/formations-artistiques.fr" style="display: inline-block; margin: 0 8px;">
        <img src="https://votre-cdn.com/instagram-icon.png" alt="Instagram" width="24" height="24">
    </a>
</div>
```

---

## ✅ Checklist de configuration

- [ ] Template "Confirm signup" copié et sauvegardé dans Supabase
- [ ] Test email envoyé et reçu
- [ ] Affichage correct dans Gmail
- [ ] Affichage correct dans Outlook
- [ ] Affichage correct sur mobile
- [ ] Tous les liens fonctionnent
- [ ] Couleurs et branding corrects

---

## 🎯 Bonnes pratiques

### 1. Compatibilité email

Les emails utilisent des tables HTML pour assurer la compatibilité avec tous les clients email (Gmail, Outlook, Apple Mail, etc.).

**⚠️ À éviter dans les emails :**
- Flexbox et Grid CSS
- JavaScript
- Vidéos embarquées
- Polices personnalisées complexes

**✅ À utiliser :**
- Tables HTML pour la mise en page
- Styles inline
- Images hébergées sur un CDN
- Polices web-safe

### 2. Responsive design

Le template est responsive et s'adapte automatiquement aux écrans mobiles grâce à :
- Largeur maximale de 600px
- Padding adaptatif
- Tailles de texte lisibles sur mobile

### 3. Accessibilité

Le template respecte les bonnes pratiques d'accessibilité :
- Textes alt sur les images
- Contrastes de couleurs suffisants
- Hiérarchie de titres logique
- Liens explicites

### 4. Tests

Testez toujours vos emails sur :
- [ ] Gmail (desktop)
- [ ] Gmail (mobile)
- [ ] Outlook
- [ ] Apple Mail
- [ ] Thunderbird

---

## 📊 Métriques et suivi

### Ajouter le tracking (optionnel)

Pour suivre les ouvertures d'emails, ajoutez avant la fermeture du `</body>` :

```html
<img src="https://votre-analytics.com/track?email={{ .Email }}&type=confirm"
     width="1" height="1" alt=""
     style="display: none;">
```

⚠️ Respectez le RGPD et informez les utilisateurs du tracking.

---

## 🔧 Dépannage

### L'email n'arrive pas

1. Vérifiez les logs Supabase : Dashboard > Logs > Auth
2. Vérifiez le dossier spam
3. Vérifiez que la confirmation email est activée : Authentication > Settings

### L'affichage est cassé

1. Vérifiez que vous avez copié tout le HTML
2. Testez avec un validateur HTML
3. Vérifiez les styles inline

### Les liens ne fonctionnent pas

1. Vérifiez la variable `{{ .ConfirmationURL }}`
2. Vérifiez la configuration des redirections : Authentication > URL Configuration

---

## 📝 Notes de version

### v1.0 (18 décembre 2024)
- Template de confirmation d'inscription
- Design moderne avec dégradés
- Responsive et accessible
- Compatible tous clients email

---

## 🆘 Support

Pour toute question ou personnalisation :
- Email : support@formations-artistiques.fr
- Documentation Supabase : https://supabase.com/docs/guides/auth/auth-email-templates

---

**Dernière mise à jour :** 18 décembre 2024
