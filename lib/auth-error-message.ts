export type AuthErrorContext =
  | "signup"
  | "signin"
  | "password-reset-request"
  | "password-update"
  | "admin-create"

function normalizeAuthErrorMessage(errorMessage: string) {
  return errorMessage.trim().toLowerCase()
}

export function isRateLimitAuthError(errorMessage: string) {
  const normalizedMessage = normalizeAuthErrorMessage(errorMessage)

  return (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("over_email_send_rate_limit") ||
    normalizedMessage.includes("email rate limit exceeded")
  )
}

export function isHandledAuthError(errorMessage: string) {
  const normalizedMessage = normalizeAuthErrorMessage(errorMessage)

  return (
    isRateLimitAuthError(normalizedMessage) ||
    normalizedMessage.includes("already") ||
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("exists") ||
    normalizedMessage.includes("invalid email") ||
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("email not confirmed") ||
    normalizedMessage.includes("password") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("session")
  )
}

export function translateAuthErrorMessage(
  errorMessage: string,
  context: AuthErrorContext
): string {
  const normalizedMessage = normalizeAuthErrorMessage(errorMessage)

  if (isRateLimitAuthError(normalizedMessage)) {
    if (context === "password-reset-request") {
      return "Trop d'e-mails de réinitialisation ont été demandés. Attendez quelques minutes avant de réessayer."
    }

    if (context === "signin") {
      return "Trop de tentatives de connexion ont été détectées. Attendez quelques minutes avant de réessayer."
    }

    return "Trop de tentatives d'envoi d'e-mails ont été détectées. Attendez quelques minutes avant de réessayer."
  }

  if (
    normalizedMessage.includes("already") ||
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("exists")
  ) {
    return "Un compte existe déjà avec cet email."
  }

  if (normalizedMessage.includes("invalid email")) {
    return "L'adresse e-mail n'est pas valide."
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Identifiants incorrects. Vérifiez votre email et mot de passe."
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Veuillez confirmer votre adresse e-mail avant de vous connecter."
  }

  if (normalizedMessage.includes("session")) {
    return "Le lien de réinitialisation est invalide ou expiré. Demandez un nouveau lien."
  }

  if (normalizedMessage.includes("password")) {
    if (context === "password-update") {
      return "Impossible de mettre à jour le mot de passe. Vérifiez qu'il respecte bien les critères demandés."
    }

    return "Le mot de passe ne respecte pas les critères de sécurité."
  }

  if (normalizedMessage.includes("network")) {
    return "Erreur de connexion. Veuillez vérifier votre connexion internet."
  }

  switch (context) {
    case "signin":
      return "Une erreur s'est produite lors de la connexion. Veuillez réessayer."
    case "password-reset-request":
      return "Impossible d'envoyer le lien de réinitialisation. Veuillez réessayer."
    case "password-update":
      return "Impossible de mettre à jour le mot de passe. Veuillez réessayer."
    case "admin-create":
      return "Une erreur s'est produite lors de la création du compte."
    case "signup":
    default:
      return "Une erreur s'est produite lors de l'inscription. Veuillez réessayer."
  }
}
