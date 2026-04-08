"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ImagePlus, Upload, Crop, Trash2 } from "lucide-react"

type OpportunityBodyImageDropzoneProps = {
  previewUrl?: string | null
  fileName?: string | null
  helperText?: string
  onFileSelected: (file: File | null) => void
  onRecrop?: () => void
  onRemove?: () => void
}

export function OpportunityBodyImageDropzone({
  previewUrl,
  fileName,
  helperText = "Maximum 1 image, 5 MB. Format portrait conseillé.",
  onFileSelected,
  onRecrop,
  onRemove,
}: OpportunityBodyImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (file: File | null) => {
    if (!file) return
    onFileSelected(file)
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "group rounded-[28px] border border-dashed px-6 py-10 transition-colors",
          isDragging
            ? "border-[#E63832] bg-[#FFF4F2]"
            : "border-[#E6DAD0] bg-[#FFFCFA] hover:border-[#E63832]/50 hover:bg-[#FFF8F5]"
        )}
        onDragEnter={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setIsDragging(false)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setIsDragging(false)
          handleFile(event.dataTransfer.files?.[0] || null)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] || null)}
        />

        {!previewUrl ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <ImagePlus className="h-7 w-7 text-[#E63832]" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Ajouter une image verticale</h4>
            <p className="mt-2 text-sm text-gray-600">
              Cliquez pour envoyer ou glissez-déposez votre visuel ici.
            </p>
            <p className="mt-1 text-xs text-gray-500">{helperText}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-full border-[#E6DAD0] bg-white px-5"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
            <div className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-[24px] border border-black/5 bg-white aspect-[4/5]">
              <Image
                src={previewUrl}
                alt="Aperçu de l'image verticale"
                fill
                sizes="220px"
                className="object-cover"
              />
            </div>
            <div className="space-y-3 text-center md:text-left">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Image prête</h4>
                <p className="mt-1 text-sm text-gray-600">
                  {fileName || "Visuel vertical sélectionné"}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#E6DAD0] bg-white"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Remplacer
                </Button>
                {onRecrop && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#E6DAD0] bg-white"
                    onClick={onRecrop}
                  >
                    <Crop className="mr-2 h-4 w-4" />
                    Recadrer
                  </Button>
                )}
                {onRemove && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-[#F2D7D2] bg-white text-[#B9412E]"
                    onClick={onRemove}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Retirer
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">{helperText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
