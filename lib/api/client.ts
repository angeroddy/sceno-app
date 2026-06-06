/**
 * Client HTTP léger et typé pour les appels aux routes API internes depuis le
 * navigateur. Centralise la sérialisation JSON, la gestion d'erreur et le typage
 * du retour, là où les pages faisaient auparavant des `fetch()` ad hoc avec une
 * gestion d'erreur incohérente.
 */

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Corps JSON ; sérialisé automatiquement avec le bon Content-Type. */
  json?: unknown
  /** Corps brut (FormData, string…) si `json` n'est pas adapté. */
  body?: BodyInit | null
}

/**
 * Effectue une requête vers une route API interne et renvoie le JSON typé.
 *
 * - Sérialise `json` et pose l'en-tête `Content-Type: application/json`.
 * - En cas de statut non-2xx, lève une `ApiError` contenant le message
 *   (`data.error` si présent), le statut et le corps de réponse.
 * - Renvoie `undefined` (typé `T`) pour les réponses sans corps (204).
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { json, headers, body, ...rest } = options

  const finalHeaders = new Headers(headers)
  let finalBody = body ?? null

  if (typeof json !== 'undefined') {
    finalHeaders.set('Content-Type', 'application/json')
    finalBody = JSON.stringify(json)
  }

  const response = await fetch(path, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: unknown }).error)
        : null) || `Requête échouée (${response.status})`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}
