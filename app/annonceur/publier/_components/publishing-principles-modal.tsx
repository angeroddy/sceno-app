"use client"

import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Clock3, Percent } from "lucide-react"
import { cn } from "@/lib/utils"

const publishingPrinciples = [
  {
    title: "Prévente",
    icon: Calendar,
    copy: "Vos places doivent être vendues au moins 1 mois avant l'événement.",
    hint: "Idéal pour remplir tôt une formation déjà planifiée.",
  },
  {
    title: "Dernière minute",
    icon: Clock3,
    copy: "Vos places doivent être vendues au maximum 3 jours avant l'événement.",
    hint: "Parfait pour compléter une session imminente.",
  },
  {
    title: "Réduction",
    icon: Percent,
    copy: "Dans les deux cas, le prix réduit doit être au moins 25 % moins cher.",
    hint: "C'est ce qui rend l'offre vraiment attractive pour les comédiens.",
  },
]

interface PublishingPrinciplesModalProps {
  open: boolean
  step: number
  onStepChange: (step: number | ((prev: number) => number)) => void
  onAccept: () => void
}

/**
 * Carousel modal « Avant de publier » présentant les règles (prévente, dernière
 * minute, réduction). Présentationnel : l'état (étape, ouverture) reste dans la page.
 */
export function PublishingPrinciplesModal({
  open,
  step,
  onStepChange,
  onAccept,
}: PublishingPrinciplesModalProps) {
  if (!open) return null

  const activePublishingPrinciple = publishingPrinciples[step]
  const ActivePublishingPrincipleIcon = activePublishingPrinciple.icon
  const isLastPublishingPrincipleStep = step === publishingPrinciples.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publishing-principles-title"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E6DAD0] bg-white shadow-2xl">
        <div className="grid gap-6 p-6 sm:grid-cols-[220px_1fr] sm:p-8">
          <div className="flex items-center justify-center rounded-xl bg-[#F5F0EB] p-5">
            <svg
              viewBox="0 0 220 220"
              className="h-44 w-44"
              aria-hidden="true"
            >
              <circle cx="110" cy="110" r="82" fill="#fff" stroke="#E6DAD0" strokeWidth="3" />
              <circle cx="110" cy="110" r="68" fill="none" stroke="#E63832" strokeWidth="4" strokeLinecap="round" strokeDasharray="28 18">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 110 110"
                  to="360 110 110"
                  dur="9s"
                  repeatCount="indefinite"
                />
              </circle>
              <path d="M72 138 C88 112 100 128 112 100 C124 72 145 79 152 58" fill="none" stroke="#111827" strokeWidth="6" strokeLinecap="round">
                <animate
                  attributeName="stroke-dasharray"
                  values="0 180;180 0;180 0"
                  dur="3.2s"
                  repeatCount="indefinite"
                />
              </path>
              <circle cx="72" cy="138" r="7" fill="#E63832">
                <animate attributeName="r" values="6;9;6" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="112" cy="100" r="7" fill="#E63832">
                <animate attributeName="r" values="7;10;7" dur="1.8s" begin=".35s" repeatCount="indefinite" />
              </circle>
              <circle cx="152" cy="58" r="7" fill="#E63832">
                <animate attributeName="r" values="6;9;6" dur="1.8s" begin=".7s" repeatCount="indefinite" />
              </circle>
              <rect x="70" y="150" width="80" height="16" rx="8" fill="#E6DAD0" />
              <rect x="84" y="172" width="52" height="10" rx="5" fill="#E63832">
                <animate attributeName="width" values="30;68;30" dur="2.4s" repeatCount="indefinite" />
              </rect>
            </svg>
          </div>

          <div className="flex min-h-[340px] flex-col">
            <div className="mb-5 flex items-center gap-2">
              {publishingPrinciples.map((principle, index) => (
                <button
                  key={principle.title}
                  type="button"
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    index === step
                      ? "w-8 bg-[#E63832]"
                      : "w-2.5 bg-[#E6DAD0] hover:bg-[#E63832]/50"
                  )}
                  aria-label={`Voir l'étape ${index + 1}`}
                  onClick={() => onStepChange(index)}
                />
              ))}
            </div>

            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#E63832]">
                Étape {step + 1} sur {publishingPrinciples.length}
              </p>
              <h2 id="publishing-principles-title" className="text-2xl font-bold text-gray-950 sm:text-3xl">
                Avant de publier
              </h2>
            </div>

            <div className="flex flex-1 flex-col justify-center rounded-xl border border-[#E6DAD0] bg-[#F5F0EB] p-5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <ActivePublishingPrincipleIcon className="h-6 w-6 text-[#E63832]" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-950">
                {activePublishingPrinciple.title}
              </h3>
              <p className="text-base leading-7 text-gray-800">
                {activePublishingPrinciple.copy}
              </p>
              <p className="mt-4 rounded-lg border border-[#E63832]/20 bg-white/70 p-3 text-sm font-medium text-gray-900">
                {activePublishingPrinciple.hint}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onStepChange((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Précédent
              </Button>

              <Button
                type="button"
                className="w-full bg-[#E63832] hover:bg-[#E63832]/90 sm:w-auto"
                onClick={() => {
                  if (isLastPublishingPrincipleStep) {
                    onAccept()
                    return
                  }

                  onStepChange((s) => Math.min(s + 1, publishingPrinciples.length - 1))
                }}
              >
                {isLastPublishingPrincipleStep ? "J'ai compris !" : "Suivant"}
                {!isLastPublishingPrincipleStep && <ChevronRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
