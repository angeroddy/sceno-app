# Migrations Supabase

Ce dossier contient des scripts SQL historiques. Ils doivent être utilisés comme des migrations contrôlées, pas comme des snippets ponctuels.

## Règles

- Appliquer les scripts dans un environnement de test avant production.
- Garder les scripts idempotents quand c'est possible (`if not exists`, politiques nommées, colonnes vérifiées).
- Ne jamais modifier une migration déjà appliquée en production sans documenter le correctif.
- Ajouter une nouvelle migration datée pour tout changement de schéma, RPC, index, trigger, storage ou RLS.
- Lancer les tests liés après application: auth, publication, checkout, webhook Stripe et suppression de compte.

## Inventaire Actuel

Scripts de base et stockage:

- `setup-storage-simple.sql`
- `setup-storage-pieces-identite.sql`
- `setup-storage-rls-final.sql`
- `setup-rls-annonceurs.sql`

Évolutions comptes:

- `add-annonceur-identity-fields.sql`
- `add-annonceur-representant-telephone.sql`
- `add-annonceur-site-internet.sql`
- `lock-annonceur-email-and-account-type.sql`
- `add-annonceur-soft-delete.sql`
- `add-comedien-soft-delete.sql`
- `add-banking-info-columns.sql`

Évolutions opportunités:

- `add-opportunity-body-image.sql`
- `add-opportunity-status-qualified-at.sql`
- `add-opportunity-supprimee-status.sql`
- `add-opportunity-views.sql`

Paiements et opérations:

- `add-stripe-connect-and-payments.sql`
- `create-admin.sql`
- `seed-opportunites-ui-ux.sql`

## Prochaine Étape Recommandée

Créer une convention de nommage datée pour les nouveaux scripts, par exemple:

```text
YYYYMMDDHHMM_description.sql
```

Puis migrer progressivement les scripts existants dans un journal d'application vérifiable par environnement.
