import {
  isHandledAuthError,
  isRateLimitAuthError,
  translateAuthErrorMessage,
} from '@/app/lib/auth-error-message'

describe('auth-error-message helpers', () => {
  it("reconnaît les erreurs de rate limit envoyées par Supabase", () => {
    expect(isRateLimitAuthError('email rate limit exceeded')).toBe(true)
    expect(isRateLimitAuthError('over_email_send_rate_limit')).toBe(true)
    expect(isHandledAuthError('Too many requests')).toBe(true)
  })

  it("traduit un rate limit de signup avec un message utilisateur clair", () => {
    expect(translateAuthErrorMessage('email rate limit exceeded', 'signup')).toBe(
      "Trop de tentatives d'envoi d'e-mails ont été détectées. Attendez quelques minutes avant de réessayer."
    )
  })

  it("traduit un rate limit de réinitialisation de mot de passe avec un message dédié", () => {
    expect(translateAuthErrorMessage('over_email_send_rate_limit', 'password-reset-request')).toBe(
      "Trop d'e-mails de réinitialisation ont été demandés. Attendez quelques minutes avant de réessayer."
    )
  })

  it("traduit les identifiants invalides côté connexion", () => {
    expect(translateAuthErrorMessage('Invalid login credentials', 'signin')).toBe(
      'Identifiants incorrects. Vérifiez votre email et mot de passe.'
    )
  })
})
