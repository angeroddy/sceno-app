/**
 * Calculs métier liés aux prix, réductions et frais Stripe.
 *
 * Ces formules étaient auparavant dupliquées dans la validation d'opportunité,
 * les notifications email et la création de session de paiement. Les centraliser
 * ici garantit une source unique de vérité (un seul endroit à modifier si le taux
 * de commission ou la règle de réduction change).
 */

/**
 * Pourcentage de réduction brut (non arrondi) entre le prix de base et le prix réduit.
 * Le prix de base est supposé strictement positif ; l'appelant doit le garantir.
 *
 * @returns Réduction en pourcentage (ex. 25 pour -25 %).
 */
export function calculateDiscountPercent(prixBase: number, prixReduit: number): number {
  return ((prixBase - prixReduit) / prixBase) * 100
}

/**
 * Pourcentage de réduction arrondi à l'entier le plus proche.
 * Renvoie `null` si les prix sont invalides (prix de base non strictement positif).
 */
export function calculateRoundedDiscountPercent(
  prixBase: number,
  prixReduit: number
): number | null {
  if (!(prixBase > 0)) {
    return null
  }
  return Math.round(calculateDiscountPercent(prixBase, prixReduit))
}

/**
 * Convertit un montant en euros vers des centimes (unité attendue par Stripe).
 */
export function toStripeCents(euros: number): number {
  return Math.round(euros * 100)
}

/**
 * Convertit un montant en centimes Stripe vers des euros.
 */
export function fromStripeCents(cents: number): number {
  return cents / 100
}

/**
 * Frais de plateforme (application fee) en centimes, à partir d'un montant en centimes
 * et d'un pourcentage de commission.
 */
export function calculatePlatformFee(amountCents: number, commissionPercent: number): number {
  return Math.round((amountCents * commissionPercent) / 100)
}
