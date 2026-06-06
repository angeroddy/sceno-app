"use client"

import { useMemo, useState } from "react"
import type { MouseEvent } from "react"
import { Check, Share2 } from "lucide-react"

import { buildPublicOpportunityPath } from "@/app/lib/public-opportunity-url"
import { Button } from "@/components/ui/button"

type ShareOpportunityUrlButtonProps = {
  opportunityId: string
  title?: string
  text?: string
  label?: string
  sharedLabel?: string
  className?: string
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

function getOrigin() {
  if (typeof window === "undefined") return ""
  return window.location.origin
}

export function ShareOpportunityUrlButton({
  opportunityId,
  title = "Opportunité formations-artistiques.fr",
  text,
  label = "Partager",
  sharedLabel = "Lien copié",
  className,
  size = "sm",
  variant = "outline",
  onClick,
}: ShareOpportunityUrlButtonProps) {
  const [shared, setShared] = useState(false)
  const publicUrl = useMemo(
    () => `${getOrigin()}${buildPublicOpportunityPath(title, opportunityId)}`,
    [opportunityId, title]
  )

  const shareUrl = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url: publicUrl,
        })
      } else {
        await navigator.clipboard.writeText(publicUrl)
      }

      setShared(true)
      window.setTimeout(() => setShared(false), 1800)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }

      try {
        await navigator.clipboard.writeText(publicUrl)
        setShared(true)
        window.setTimeout(() => setShared(false), 1800)
      } catch {
        setShared(false)
      }
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={shareUrl}
      aria-live="polite"
    >
      {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {shared ? sharedLabel : label}
    </Button>
  )
}
