"use client"

import { AppModal } from "@/components/ui/app-modal"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface DeleteAccountModalProps {
  open: boolean
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Modal de confirmation de suppression définitive du compte comédien. */
export function DeleteAccountModal({ open, deleting, onClose, onConfirm }: DeleteAccountModalProps) {
  return (
    <AppModal
      open={open}
      onClose={() => {
        if (deleting) return
        onClose()
      }}
      title="Supprimer définitivement votre compte ?"
      description="Cette suppression est irréversible. Toutes vos données comédien seront retirées de l'application."
      tone="warning"
      showCloseButton={!deleting}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => void onConfirm()}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              "Supprimer définitivement"
            )}
          </Button>
        </>
      }
    />
  )
}
