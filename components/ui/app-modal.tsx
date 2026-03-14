"use client"

import { useEffect, type ReactNode } from "react"
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ModalTone = "default" | "success" | "error" | "warning" | "info"

interface AppModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  tone?: ModalTone
  closeLabel?: string
  showCloseButton?: boolean
}

const toneStyles: Record<ModalTone, { icon: typeof Info; iconClassName: string; ringClassName: string }> = {
  default: {
    icon: Info,
    iconClassName: "text-gray-600",
    ringClassName: "bg-gray-100",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "text-green-600",
    ringClassName: "bg-green-100",
  },
  error: {
    icon: AlertCircle,
    iconClassName: "text-red-600",
    ringClassName: "bg-red-100",
  },
  warning: {
    icon: TriangleAlert,
    iconClassName: "text-orange-600",
    ringClassName: "bg-orange-100",
  },
  info: {
    icon: Info,
    iconClassName: "text-blue-600",
    ringClassName: "bg-blue-100",
  },
}

export function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = "default",
  closeLabel = "Fermer",
  showCloseButton = true,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const toneStyle = toneStyles[tone]
  const ToneIcon = toneStyle.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mb-4 flex flex-col items-center text-center">
          <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-full", toneStyle.ringClassName)}>
            <ToneIcon className={cn("h-6 w-6", toneStyle.iconClassName)} />
          </div>
          <h2 id="app-modal-title" className="text-xl font-bold text-gray-900">
            {title}
          </h2>
          {description ? <p className="mt-2 text-sm text-gray-600">{description}</p> : null}
        </div>

        {children ? <div className="mb-4">{children}</div> : null}

        {footer ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : (
          <div className="flex justify-center">
            <Button variant="outline" onClick={onClose}>
              {closeLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
