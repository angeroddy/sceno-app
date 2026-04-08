"use client"

import Image from "next/image"
import { SafeRichText } from "@/components/safe-rich-text"
import { cn } from "@/lib/utils"

type OpportunityBodyContentProps = {
  title: string
  resume: string | null | undefined
  bodyImageUrl?: string | null
  contentMode?: "text" | "image" | "text_image" | "image_text" | null
  className?: string
}

export function OpportunityBodyContent({
  title,
  resume,
  bodyImageUrl,
  contentMode = "text",
  className,
}: OpportunityBodyContentProps) {
  const hasText = Boolean(resume?.trim())
  const hasImage = Boolean(bodyImageUrl)

  const imageBlock = hasImage ? (
    <div className="mx-auto w-full max-w-md">
      <div className="relative overflow-hidden rounded-3xl border border-black/5 bg-[#F5F0EB] shadow-sm aspect-[4/5]">
        <Image
          src={bodyImageUrl as string}
          alt={`Visuel détaillé de ${title}`}
          fill
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover"
        />
      </div>
    </div>
  ) : null

  const textBlock = hasText ? <SafeRichText html={resume} className={className} /> : null

  if (contentMode === "image") {
    return imageBlock
  }

  if (contentMode === "image_text") {
    return (
      <div className="space-y-6">
        {imageBlock}
        {textBlock}
      </div>
    )
  }

  if (contentMode === "text_image") {
    return (
      <div className="space-y-6">
        {textBlock}
        {imageBlock}
      </div>
    )
  }

  return textBlock
}
