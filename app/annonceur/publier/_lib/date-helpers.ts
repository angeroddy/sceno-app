import type { OpportunityModel } from "@/types"

export const OPPORTUNITY_DATE_MODEL_ERROR =
  "La date de l'événement doit être soit dans 72h (Dernière minute), soit à au moins 1 mois (Prévente)."

export const FRENCH_WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

export function padTimeUnit(value: number) {
  return String(value).padStart(2, "0")
}

export function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${padTimeUnit(date.getMonth() + 1)}-${padTimeUnit(date.getDate())}`
}

export function combineLocalDateTime(datePart: string, timePart: string) {
  if (!datePart) return ""
  return `${datePart}T${timePart || "19:00"}`
}

export function getOpportunityModelForDate(dateValue: string): OpportunityModel | null {
  const eventDate = new Date(dateValue)
  const diffDays = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)

  if (diffDays <= 3) {
    return "derniere_minute"
  }

  if (diffDays >= 28) {
    return "pre_vente"
  }

  return null
}

export function getCalendarGrid(month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDayOfMonth = new Date(year, monthIndex, 1)
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7
  const gridStartDate = new Date(year, monthIndex, 1 - startOffset)
  const rawDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStartDate)
    date.setDate(gridStartDate.getDate() + index)
    return date
  })

  // Trim completely out-of-month trailing weeks to keep the popover compact.
  while (
    rawDays.length > 35 &&
    rawDays.slice(-7).every((day) => day.getMonth() !== monthIndex)
  ) {
    rawDays.splice(-7, 7)
  }

  return rawDays
}
