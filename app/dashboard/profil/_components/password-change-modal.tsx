"use client"

import { AppModal } from "@/components/ui/app-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordStrengthPanel } from "@/components/ui/password-strength-panel"
import { Loader2 } from "lucide-react"

interface PasswordChangeModalProps {
  open: boolean
  saving: boolean
  error: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

/** Modal de changement de mot de passe (espace comédien). */
export function PasswordChangeModal({
  open,
  saving,
  error,
  currentPassword,
  newPassword,
  confirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onClose,
  onSave,
}: PasswordChangeModalProps) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Changer votre mot de passe"
      description="Entrez d'abord votre mot de passe actuel, puis choisissez le nouveau."
      tone="info"
      showCloseButton={!saving}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-[#E63832] text-white hover:bg-[#E63832]/90"
            onClick={() => void onSave()}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              "Mettre à jour"
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-left">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="currentPassword">Mot de passe actuel</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => onCurrentPasswordChange(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">Nouveau mot de passe</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => onNewPasswordChange(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        <PasswordStrengthPanel password={newPassword} />
      </div>
    </AppModal>
  )
}
