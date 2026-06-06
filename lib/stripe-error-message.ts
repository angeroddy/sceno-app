import Stripe from 'stripe'

export function getStripeErrorParam(error: unknown): string | null {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return null
  }

  const raw =
    typeof error.raw === 'object' && error.raw !== null
      ? (error.raw as { param?: string })
      : null

  return error.param ?? raw?.param ?? null
}

export function getReadableStripeError(error: unknown): string {
  if (error instanceof Stripe.errors.StripeError) {
    const raw =
      typeof error.raw === 'object' && error.raw !== null
        ? (error.raw as { code?: string; message?: string; param?: string })
        : null
    const errorParam = getStripeErrorParam(error)

    if (
      error.code === 'invalid_phone_number' ||
      raw?.code === 'invalid_phone_number' ||
      /is not a valid phone number/i.test(error.message) ||
      /is not a valid phone number/i.test(raw?.message ?? '')
    ) {
      if (errorParam === 'representative.phone') {
        return "Stripe refuse le téléphone du représentant légal. Vérifiez le champ « Téléphone du représentant » et utilisez son numéro personnel au format international (par exemple +33 suivi de 9 chiffres)."
      }

      if (errorParam === 'company.phone') {
        return "Stripe refuse le téléphone de l'organisme. Vérifiez le champ « Téléphone de l'organisme » et utilisez un numéro réel au format international (par exemple +33 suivi de 9 chiffres)."
      }

      return "Stripe refuse ce numéro de téléphone. Utilisez un numéro réel au format international (par exemple +33 suivi de 9 chiffres). Pour le représentant légal, utilisez son numéro personnel plutôt que celui de l'organisme."
    }

    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Erreur serveur interne'
}

export function getStripeErrorStatus(error: unknown): number {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return 500
  }

  const raw =
    typeof error.raw === 'object' && error.raw !== null
      ? (error.raw as { code?: string; message?: string })
      : null

  if (
    error.code === 'invalid_phone_number' ||
    raw?.code === 'invalid_phone_number' ||
    /is not a valid phone number/i.test(error.message) ||
    /is not a valid phone number/i.test(raw?.message ?? '')
  ) {
    return 422
  }

  return 500
}
