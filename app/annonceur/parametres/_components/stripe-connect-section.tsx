"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CircleQuestionMark, ExternalLink, Loader2 } from "lucide-react"
import type { StripeConnectStatus } from "../_lib/types"

interface StripeConnectSectionProps {
  loading: boolean
  status: StripeConnectStatus | null
  dashboardReady: boolean
  connected: boolean
  actionLoading: boolean
  action: "onboarding" | "dashboard" | null
  error: string
  onStartOnboarding: () => void
  onOpenDashboard: () => void
}

/**
 * Carte de gestion du compte Stripe Connect de l'annonceur (statut + actions
 * onboarding/comedien). Présentationnel : l'état Stripe et les handlers restent
 * dans la page paramètres.
 */
export function StripeConnectSection({
  loading,
  status,
  dashboardReady,
  connected,
  actionLoading,
  action,
  error,
  onStartOnboarding,
  onOpenDashboard,
}: StripeConnectSectionProps) {
  return (
    <div id="stripe-connect" className="scroll-mt-28">
      <Card className="overflow-hidden border-[#635BFF]/30 bg-[linear-gradient(135deg,#F7F5FF_0%,#F6FAFF_45%,#FFFFFF_100%)] shadow-[0_18px_45px_rgba(99,91,255,0.12)]">
        <CardHeader className="border-b border-[#635BFF]/15 bg-white/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[#0A2540]">Paiements Stripe Connect</CardTitle>
              <div className="group relative inline-flex">
                <button
                  type="button"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[#635BFF]/25 bg-white text-[#635BFF] shadow-sm transition hover:bg-[#F7F5FF]"
                  aria-label="Pourquoi Stripe est requis"
                >
                  <CircleQuestionMark className="h-4 w-4" />
                </button>
                <div className="pointer-events-none absolute left-1/2 top-9 z-20 w-72 -translate-x-1/2 rounded-md border border-[#6dd0ff] bg-white p-3 text-left text-sm text-[#0b4054] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:left-0 sm:translate-x-0">
                  Stripe est l&apos;intermédiaire que Scenio utilise pour vendre vos places en ligne et qui vérifie, dans le même temps, votre identité en tant que professionnel.
                </div>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#635BFF] px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
              <span className="font-bold tracking-normal">stripe</span>
              <span className="h-4 w-px bg-white/35" />
              <span className="text-xs font-medium">Connect</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#425466]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Chargement du statut Stripe...</span>
            </div>
          ) : (
            <>
              <div className="grid gap-3 text-sm text-[#425466] sm:grid-cols-2 lg:grid-cols-4">
                <p className="rounded-md border border-[#635BFF]/15 bg-white/75 p-3">
                  <span className="block text-xs font-medium uppercase text-[#697386]">Compte Connect</span>
                  <span className={status?.connected ? "text-[#00856F] font-semibold" : "text-[#B54708] font-semibold"}>
                    {status?.connected ? "Créé" : "Non créé"}
                  </span>
                </p>
                <p className="rounded-md border border-[#635BFF]/15 bg-white/75 p-3">
                  <span className="block text-xs font-medium uppercase text-[#697386]">Onboarding</span>
                  <span className={status?.stripe_onboarding_complete ? "text-[#00856F] font-semibold" : "text-[#B54708] font-semibold"}>
                    {status?.stripe_onboarding_complete ? "Terminé" : "Incomplet"}
                  </span>
                </p>
                <p className="rounded-md border border-[#635BFF]/15 bg-white/75 p-3">
                  <span className="block text-xs font-medium uppercase text-[#697386]">Paiements entrants</span>
                  <span className={status?.stripe_charges_enabled ? "text-[#00856F] font-semibold" : "text-[#B54708] font-semibold"}>
                    {status?.stripe_charges_enabled ? "Activés" : "Désactivés"}
                  </span>
                </p>
                <p className="rounded-md border border-[#635BFF]/15 bg-white/75 p-3">
                  <span className="block text-xs font-medium uppercase text-[#697386]">Virements</span>
                  <span className={status?.stripe_payouts_enabled ? "text-[#00856F] font-semibold" : "text-[#B54708] font-semibold"}>
                    {status?.stripe_payouts_enabled ? "Activés" : "Désactivés"}
                  </span>
                </p>
              </div>
              <div className="text-sm text-[#425466]">
                {status?.stripe_account_id && (
                  <p className="inline-flex rounded-md border border-[#635BFF]/15 bg-white/80 px-2.5 py-1 text-xs font-mono text-[#697386]">
                    {status.stripe_account_id}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                {dashboardReady ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-[#635BFF]/30 text-[#635BFF] hover:bg-[#F7F5FF] hover:text-[#4F46E5] sm:w-auto"
                    onClick={onOpenDashboard}
                    disabled={actionLoading}
                  >
                    {action === "dashboard" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ouverture de Stripe...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ouvrir mon dashboard Stripe
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full bg-[#635BFF] text-white shadow-sm hover:bg-[#4F46E5] sm:w-auto"
                    onClick={onStartOnboarding}
                    disabled={actionLoading}
                  >
                    {action === "onboarding" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirection vers Stripe...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Configurer Stripe
                      </>
                    )}
                  </Button>
                )}
              </div>

              {dashboardReady ? (
                <div className="rounded-md border border-[#00D924]/25 bg-[#F0FFF4] p-3 text-sm text-[#006B5B]">
                  Votre compte Stripe est prêt à recevoir les paiements.
                </div>
              ) : connected ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-[#FFB020]/30 bg-white/80 p-3 text-sm text-[#8A3A00]">
                    Votre compte Stripe est créé mais vous devez renseigner toutes les informations demandées pour terminer sa configuration. Pour ce faire, veuillez cliquer sur le bouton « Configurer Stripe » ci dessus.
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-[#635BFF]/20 bg-white/80 p-3 text-sm text-[#425466]">
                  Aucun compte Stripe n&apos;est encore créé.
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
