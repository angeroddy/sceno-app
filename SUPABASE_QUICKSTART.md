# 🚀 Configuration Rapide Supabase (5 minutes)

## ⚠️ Vous avez l'erreur "infinite recursion" ?

**Solution rapide pour continuer le développement :**

### Étape 1 : Ouvrez le SQL Editor

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Menu gauche : **SQL Editor**
4. Cliquez sur **New query**

### Étape 2 : Exécutez le script de nettoyage

Copiez-collez **tout le contenu** du fichier `SUPABASE_FIX_AGGRESSIVE.sql` et exécutez-le.

Ce script va :
- ✅ Supprimer TOUTES les politiques qui causent la récursion
- ✅ Désactiver temporairement RLS pour le développement
- ✅ Configurer le Storage simplement

### Étape 3 : Désactiver la confirmation d'email

1. Menu gauche : **Authentication** > **Settings**
2. Dans **Email Auth**, décochez : **Enable email confirmations**
3. Cliquez sur **Save**

### Étape 4 : Créer le bucket Storage

1. Menu gauche : **Storage**
2. Cliquez sur **Create a new bucket**
3. Configurez :
   - **Name:** `photos`
   - **Public bucket:** ✅ Coché
4. Cliquez sur **Create bucket**

### Étape 5 : Testez l'inscription

Retournez sur votre application et créez un compte comédien. Ça devrait fonctionner ! 🎉

---

## 📋 Checklist rapide

- [ ] Script `SUPABASE_FIX_AGGRESSIVE.sql` exécuté
- [ ] Confirmation d'email désactivée
- [ ] Bucket `photos` créé (public)
- [ ] Test de l'inscription réussi

---

## ⚡ Pourquoi ça fonctionne maintenant ?

Le script désactive temporairement Row Level Security (RLS) qui causait l'erreur de récursion infinie. C'est parfait pour le développement.

**⚠️ Important pour la production :**
Avant de déployer en production, vous devrez réactiver RLS avec le script `SUPABASE_ENABLE_RLS.sql` pour la sécurité.

---

## 🔧 Comprendre les erreurs RLS

### Qu'est-ce que RLS ?

Row Level Security est un système de sécurité Postgres qui contrôle qui peut lire/écrire chaque ligne d'une table.

### Pourquoi l'erreur de récursion ?

L'erreur "infinite recursion" arrive quand :
- Une politique sur `comediens` vérifie une autre table
- Cette autre table a une politique qui vérifie `comediens`
- → Boucle infinie !

### La solution

Pour le développement :
- Désactiver RLS complètement (script `SUPABASE_FIX_AGGRESSIVE.sql`)
- Développer toutes les fonctionnalités
- Tester sans contraintes

Pour la production :
- Réactiver RLS (script `SUPABASE_ENABLE_RLS.sql`)
- Créer des politiques simples et testées
- Vérifier la sécurité

---

## 🎯 Prochaines étapes

Une fois l'inscription qui fonctionne, vous pourrez :

1. ✅ Créer des comptes comédiens
2. ✅ Uploader des photos
3. ✅ Développer les autres fonctionnalités
4. ⏰ Plus tard : réactiver RLS pour la production

---

## 📚 Documentation complète

- `SUPABASE_CONFIG.md` - Configuration détaillée complète
- `SUPABASE_FIX_RLS.sql` - Premier script de correction (si récursion persiste)
- `SUPABASE_FIX_AGGRESSIVE.sql` - Script de nettoyage complet (recommandé)
- `SUPABASE_ENABLE_RLS.sql` - Pour réactiver RLS en production

---

## ❓ Besoin d'aide ?

Si ça ne fonctionne toujours pas après ces étapes :

1. Vérifiez les logs de la console du navigateur
2. Vérifiez les logs dans Supabase Dashboard > Logs
3. Assurez-vous que les variables d'environnement dans `.env.local` sont correctes
4. Vérifiez que vous êtes sur le bon projet Supabase

---

**Dernière mise à jour :** 18 décembre 2024
