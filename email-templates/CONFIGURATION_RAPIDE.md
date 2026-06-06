# ⚡ Configuration rapide des emails Supabase (2 minutes)

## 📋 Instructions pas à pas

### 1. Accéder aux templates

1. Ouvrez [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Menu gauche : **Authentication** → **Email Templates**

### 2. Configurer chaque template

#### Template "Confirm signup"
1. Cliquez sur **Confirm signup**
2. Copiez le contenu de `confirmation-signup.html`
3. Collez dans l'éditeur
4. Cliquez sur **Save**

#### Template "Reset password"
1. Cliquez sur **Reset password**
2. Copiez le contenu de `reset-password.html`
3. Collez dans l'éditeur
4. Cliquez sur **Save**

#### Template "Magic Link"
1. Cliquez sur **Magic Link**
2. Copiez le contenu de `magic-link.html`
3. Collez dans l'éditeur
4. Cliquez sur **Save**

### 3. Tester les emails

Dans chaque template, cliquez sur **Send test email** pour vérifier l'affichage.

---

## 🎨 Personnalisation rapide

### Changer l'adresse email de support

Remplacez `support@formations-artistiques.fr` par votre vraie adresse dans tous les templates.

### Ajouter un vrai logo

1. Uploadez votre logo sur un CDN ou Supabase Storage
2. Dans chaque template, remplacez :

```html
<h1 style="margin: 0; color: #ffffff; font-size: 32px;">
    formations-artistiques.fr
</h1>
```

Par :

```html
<img src="https://VOTRE_CDN/logo.png"
     alt="formations-artistiques.fr"
     width="120"
     style="display: block; margin: 0 auto;">
```

### Modifier les couleurs

Recherchez et remplacez dans tous les fichiers :
- `#E63832` → Votre couleur principale
- `#c42f2a` → Version plus foncée

---

## ✅ Checklist finale

- [ ] Template "Confirm signup" configuré
- [ ] Template "Reset password" configuré
- [ ] Template "Magic Link" configuré
- [ ] Email de test envoyé et reçu
- [ ] Affichage correct sur mobile
- [ ] Adresse support personnalisée
- [ ] Logo ajouté (optionnel)

---

## 🎯 Résultat attendu

Vos utilisateurs recevront des emails :
- ✨ Professionnels et modernes
- 📱 Responsive (mobile + desktop)
- 🎨 Aux couleurs de votre marque
- ✅ Compatible tous clients email

---

## 📞 Support

Besoin d'aide ? Consultez le fichier `README.md` dans ce dossier pour plus de détails.

---

**Temps estimé : 2 minutes** ⏱️
