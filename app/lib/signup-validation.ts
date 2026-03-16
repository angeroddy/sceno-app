type CountryCode = "FR" | "BE" | "CH" | "CA" | "OTHER"

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim()
}

export function normalizeHumanText(value: string | null | undefined): string {
  return normalizeText(value).replace(/\s+/g, " ")
}

export function normalizeDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "")
}

export function normalizeBusinessId(value: string | null | undefined): string {
  return normalizeDigits(value)
}

export function normalizePhone(value: string | null | undefined): string {
  const raw = normalizeText(value)
  if (!raw) return ""

  const sanitized = raw.replace(/[^\d+]/g, "")
  if (!sanitized) return ""

  if (sanitized.startsWith("+")) {
    const digits = sanitized.slice(1).replace(/\D/g, "")
    return digits ? `+${digits}` : ""
  }

  if (sanitized.startsWith("00")) {
    const digits = sanitized.slice(2).replace(/\D/g, "")
    return digits ? `+${digits}` : ""
  }

  const digits = normalizeDigits(sanitized)
  if (!digits) return ""

  // Normalise les numéros français saisis localement vers un format compatible Stripe.
  if (digits.startsWith("33") && digits.length === 11) {
    return `+${digits}`
  }

  if (digits.length === 10 && digits.startsWith("0")) {
    return `+33${digits.slice(1)}`
  }

  if (digits.length === 9 && !digits.startsWith("0")) {
    return `+33${digits}`
  }

  return `+${digits}`
}

export function normalizeEmail(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase()
}

export function normalizeIban(value: string | null | undefined): string {
  return normalizeText(value).replace(/\s/g, "").toUpperCase()
}

export function normalizeBic(value: string | null | undefined): string {
  return normalizeText(value).replace(/\s/g, "").toUpperCase()
}

export function normalizeCountry(value: string | null | undefined): string {
  const normalized = normalizeHumanText(value).toLowerCase()

  if (!normalized || normalized === "fr" || normalized === "france") return "France"
  if (normalized === "be" || normalized === "belgique" || normalized === "belgium") return "Belgique"
  if (normalized === "ch" || normalized === "suisse" || normalized === "switzerland") return "Suisse"
  if (normalized === "ca" || normalized === "canada") return "Canada"

  return normalizeHumanText(value)
}

export function isValidEmail(value: string | null | undefined): boolean {
  const email = normalizeEmail(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isStrongEnoughPassword(value: string | null | undefined): boolean {
  const password = value ?? ""
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
}

export function getPasswordChecks(value: string | null | undefined) {
  const password = value ?? ""

  return {
    minLength: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    digit: /\d/.test(password),
  }
}

export function getPasswordStrength(value: string | null | undefined): {
  label: "Faible" | "Moyen" | "Fort"
  level: 1 | 2 | 3
} {
  const password = value ?? ""
  const checks = getPasswordChecks(password)
  const score =
    Number(checks.minLength) +
    Number(checks.letter) +
    Number(checks.digit) +
    Number(/[A-Z]/.test(password) && /[a-z]/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password))

  if (score >= 4) {
    return { label: "Fort", level: 3 }
  }

  if (score >= 2) {
    return { label: "Moyen", level: 2 }
  }

  return { label: "Faible", level: 1 }
}

export function isValidFrenchBusinessId(value: string | null | undefined): boolean {
  const digits = normalizeBusinessId(value)
  return digits.length === 9 || digits.length === 14
}

export function isValidIban(value: string | null | undefined): boolean {
  const iban = normalizeIban(value)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return false
  }

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55))
  let remainder = 0

  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }

  return remainder === 1
}

export function isValidBic(value: string | null | undefined): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalizeBic(value))
}

export function isValidUrl(value: string | null | undefined): boolean {
  const url = normalizeText(value)
  if (!url) return true

  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function getCountryCode(country: string | null | undefined): CountryCode {
  const normalized = normalizeText(country).toLowerCase()
  if (!normalized || normalized === "france" || normalized === "fr") return "FR"
  if (normalized === "belgique" || normalized === "be") return "BE"
  if (normalized === "suisse" || normalized === "ch") return "CH"
  if (normalized === "canada" || normalized === "ca") return "CA"
  return "OTHER"
}

export function isValidPostalCode(value: string | null | undefined, country: string | null | undefined): boolean {
  const postalCode = normalizeText(value)
  if (!postalCode) return false

  const compact = postalCode.replace(/\s+/g, "").toUpperCase()
  switch (getCountryCode(country)) {
    case "FR":
      return /^\d{5}$/.test(compact)
    case "BE":
      return /^\d{4}$/.test(compact)
    case "CH":
      return /^\d{4}$/.test(compact)
    case "CA":
      return /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/.test(compact)
    default:
      return compact.length >= 3 && compact.length <= 12
  }
}

export function normalizePostalCode(value: string | null | undefined, country: string | null | undefined): string {
  const postalCode = normalizeText(value)
  if (!postalCode) return ""

  const compact = postalCode.replace(/\s+/g, "").toUpperCase()
  switch (getCountryCode(country)) {
    case "FR":
    case "BE":
    case "CH":
      return compact
    case "CA":
      if (compact.length === 6) {
        return `${compact.slice(0, 3)} ${compact.slice(3)}`
      }
      return compact
    default:
      return normalizeHumanText(value).toUpperCase()
  }
}

export function isValidPhone(value: string | null | undefined): boolean {
  const normalized = normalizePhone(value)
  if (!normalized) return false

  const digits = normalized.slice(1)
  if (!/^\+\d{8,15}$/.test(normalized)) {
    return false
  }

  if (digits.startsWith("0")) {
    return false
  }

  if (digits.startsWith("33")) {
    return /^33[1-9]\d{8}$/.test(digits)
  }

  return true
}

export function getAgeFromDate(value: string | null | undefined): number | null {
  const date = normalizeText(value)
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const birthDate = new Date(`${date}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  const dayDiff = today.getDate() - birthDate.getDate()

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1
  }

  return age
}

export function isPastOrToday(value: string | null | undefined): boolean {
  const date = normalizeText(value)
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false

  const selectedDate = new Date(`${date}T00:00:00`)
  if (Number.isNaN(selectedDate.getTime())) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return selectedDate <= today
}
