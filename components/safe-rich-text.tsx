"use client"

import { sanitizeOpportunityHtml } from "@/app/lib/opportunity-html"

type SafeRichTextProps = {
  html: string | null | undefined
  className?: string
}

export function SafeRichText({ html, className }: SafeRichTextProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeOpportunityHtml(html) }} />
}
