/**
 * Intégration Stripe Connect (comptes Express des annonceurs).
 *
 * Ce module était auparavant un seul fichier de 667 lignes. Il est désormais
 * découpé par responsabilité, mais l'API publique reste accessible via
 * `@/app/lib/stripe-connect` :
 *   - types.ts            : interfaces, constantes et StripeConnectSyncError
 *   - snapshot.ts         : extraction/construction/persistance des statuts
 *   - payload-builders.ts : construction des payloads Stripe (KYC, société, etc.)
 *   - sync.ts             : orchestration (création/synchronisation de compte)
 */
export * from './types'
export * from './snapshot'
export * from './payload-builders'
export * from './sync'
