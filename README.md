# Scenio App

Application Next.js pour mettre en relation des annonceurs de formations artistiques et des comédiens. Le produit gère l'inscription, la validation des comptes annonceurs, la publication d'opportunités, la réservation payante, Stripe Connect et les espaces admin.

## Stack

- Next.js App Router, React 19, TypeScript strict
- Supabase Auth, Postgres, Storage et RLS
- Stripe Checkout et Stripe Connect
- Nodemailer/Resend pour les emails transactionnels
- Jest et Testing Library pour les tests
- Tailwind CSS 4 et composants Radix/shadcn

## Commandes

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm test -- --runInBand
```

Avant de livrer une modification sensible, lancer au minimum `npm run lint`, `npx tsc --noEmit` et les tests ciblés. Pour les changements d'auth, paiement ou réservation, lancer aussi la suite complète.

## Architecture

`app/` contient les routes Next.js, les pages et les API routes. Les zones métier principales sont:

- `app/admin`: modération, statistiques, annonceurs, comédiens et opportunités.
- `app/annonceur`: espace annonceur, publication, paramètres et gestion des opportunités.
- `app/dashboard`: espace comédien.
- `app/api`: endpoints applicatifs utilisés par les clients et les webhooks.
- `app/lib`: helpers partagés, validation, Stripe, Supabase, emails, PDF, disponibilité.
- `app/server`: helpers serveur réutilisables, notamment l'authentification par rôle.
- `components`: composants UI transverses et formulaires client.
- `scripts`: scripts SQL Supabase historiques et migrations à cadrer.

La couche `app/server/auth.ts` centralise les garde-fous serveur par rôle:

- `requireComedian()`
- `requireAdvertiser()`
- `requireAdmin()`

Les API routes doivent utiliser ces helpers au lieu de recopier manuellement `auth.getUser()` et la récupération de profil. Les pages restent protégées par `proxy.ts`, mais les API routes doivent toujours refaire leur propre contrôle côté serveur.

## Flux Métier

### Inscription

Les formulaires client appellent `/api/auth/signup`. La route crée l'utilisateur Supabase Auth via le client service-role, crée le profil métier puis envoie l'email de confirmation. Les tests doivent donc vérifier le contrat HTTP applicatif, pas un appel direct à `supabase.auth.signUp` côté client.

### Publication Annonceur

Un annonceur doit avoir:

- une identité vérifiée;
- un onboarding Stripe terminé;
- un compte Stripe Connect capable de recevoir charges et virements.

La création d'opportunité est validée par `createOpportunitySchema`, puis l'opportunité est insérée en statut `en_attente` et une notification admin est envoyée.

### Réservation et Paiement

Le comédien crée une session Checkout via `/api/checkout/session`. La confirmation finale se fait dans le webhook Stripe avec idempotence via `stripe_events` et RPC Postgres. Les courses sur les places restantes doivent être réglées côté base, pas seulement côté UI.

### Stripe Connect

Les routes `app/api/stripe/connect/*` créent, synchronisent et exposent l'état Connect d'un annonceur. Le webhook Stripe traite notamment `account.updated` pour persister l'état live du compte.

## Variables D'environnement

Variables publiques:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_URL`

Variables serveur:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PLATFORM_FEE_PERCENT`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `ADMIN_NOTIFICATION_EMAIL`
- `ADMIN_CREATION_SECRET_KEY`
- `CRON_SECRET`
- `APP_URL`

Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `ADMIN_CREATION_SECRET_KEY` ou `CRON_SECRET` côté client.

## Données et Migrations

Les scripts SQL existants sont dans `scripts/`. Ils doivent être traités comme des migrations applicatives: documenter l'ordre d'application, rendre chaque script idempotent quand c'est possible, et éviter les modifications manuelles non tracées dans Supabase.

Voir `scripts/MIGRATIONS.md` pour l'inventaire et les règles de migration.

## Tests

Les tests sont répartis entre:

- `components/__tests__`: formulaires et composants client.
- `app/**/__tests__`: pages App Router.
- `__tests__/api`: API routes et webhooks.
- `__tests__/lib`: logique métier isolée.
- `__tests__/integration`: parcours utilisateur transverses.

Les zones les plus critiques à couvrir sont l'auth, la publication, la réservation, les webhooks Stripe, les suppressions de compte et les règles de visibilité des opportunités.

## Règles D'implémentation

- Centraliser les contrôles d'accès serveur dans `app/server/auth.ts`.
- Garder les API routes fines: auth, parsing HTTP, appel à un service métier, réponse.
- Mettre les règles métier testables dans `app/lib` ou une couche serveur dédiée.
- Éviter les nouveaux `as never`; corriger les types Supabase ou isoler l'adapter typé.
- Ne pas utiliser le client service-role pour contourner une règle métier. Chaque usage doit être justifié par une opération serveur privilégiée.
- Toute modification Stripe doit être idempotente et couverte par tests.
