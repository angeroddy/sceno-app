"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { getPasswordChecks, getPasswordStrength } from "@/app/lib/signup-validation"

interface PasswordStrengthPanelProps {
  password: string
}

export function PasswordStrengthPanel({ password }: PasswordStrengthPanelProps) {
  const checks = getPasswordChecks(password)
  const strength = getPasswordStrength(password)

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
      <p className="text-sm font-medium text-stone-900">Votre mot de passe doit inclure</p>

      <div className="mt-3 space-y-2">
        <PasswordCriterion met={checks.minLength} label="Au moins 8 caractères" />
        <PasswordCriterion met={checks.letter} label="Au moins une lettre" />
        <PasswordCriterion met={checks.digit} label="Au moins un chiffre" />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-stone-900">Solidité du mot de passe</span>
          <span
            className={cn(
              "font-semibold",
              strength.level === 3 && "text-lime-700",
              strength.level === 2 && "text-amber-700",
              strength.level === 1 && "text-stone-500"
            )}
          >
            {strength.label}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full bg-stone-200 transition-colors",
                index < strength.level && strength.level === 1 && "bg-stone-400",
                index < strength.level && strength.level === 2 && "bg-amber-500",
                index < strength.level && strength.level === 3 && "bg-lime-600"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function PasswordCriterion({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
          met
            ? "border-lime-600 bg-lime-100 text-lime-700"
            : "border-stone-300 bg-white text-stone-300"
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </div>
      <span className={cn(met ? "text-stone-900" : "text-stone-500")}>{label}</span>
    </div>
  )
}
