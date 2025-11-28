import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ============================================
// UTILITAIRE POUR LES CLASSES TAILWIND
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// FORMATAGE DES PRIX
// ============================================

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

// ============================================
// FORMATAGE DES DATES
// ============================================

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

// ============================================
// CALCUL DES JOURS RESTANTS
// ============================================

export function daysUntil(date: string): number {
  const now = new Date()
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatDaysRemaining(date: string): string {
  const days = daysUntil(date)
  
  if (days < 0) return 'Expiré'
  if (days === 0) return "Dernier jour !"
  if (days === 1) return 'Plus que 1 jour'
  if (days <= 7) return `Plus que ${days} jours`
  
  return `${days} jours restants`
}

// ============================================
// FORMATAGE DU POURCENTAGE
// ============================================

export function formatReduction(percentage: number): string {
  return `-${Math.round(percentage)} %`
}

// ============================================
// VALIDATION EMAIL
// ============================================

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// ============================================
// GÉNÉRATION D'INITIALES
// ============================================

export function getInitials(nom: string, prenom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

// ============================================
// TRONCATURE DE TEXTE
// ============================================

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}
