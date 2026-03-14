"use client"

type CountryCode = "FR" | "BE" | "CH" | "CA" | "OTHER"

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim()
}

export function normalizeDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "")
}

export function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/[^\d+()\s.-]/g, "").trim()
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
  const digits = normalizeDigits(value)
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

  const compact = postalCode.replace(/\s+/g, "")
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

export function isValidPhone(value: string | null | undefined): boolean {
  const normalized = normalizePhone(value)
  const digits = normalized.replace(/\D/g, "")
  return digits.length >= 8 && digits.length <= 15
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
