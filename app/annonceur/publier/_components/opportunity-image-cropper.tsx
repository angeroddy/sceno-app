"use client"

import type { Dispatch, RefObject, SetStateAction } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Crop, RefreshCcw, RotateCcw, RotateCw, Upload } from "lucide-react"

type CropArea = { width: number; height: number; x: number; y: number }

interface OpportunityImageCropperProps {
  open: boolean
  rawImageSrc: string
  crop: { x: number; y: number }
  zoom: number
  rotation: number
  cropAspect: number
  cropperContainerRef: RefObject<HTMLDivElement | null>
  setCrop: Dispatch<SetStateAction<{ x: number; y: number }>>
  setZoom: Dispatch<SetStateAction<number>>
  setRotation: Dispatch<SetStateAction<number>>
  onCropComplete: (_: unknown, croppedPixels: CropArea) => void
  applyCrop: () => void
  resetCropper: () => void
  onResetAdjustments: () => void
  onChooseImage: () => void
}

/**
 * Modal de recadrage 16:9 utilisée par la page « Publier une opportunité ».
 * Purement présentationnel : l'état de recadrage reste géré par la page parente.
 */
export function OpportunityImageCropper({
  open,
  rawImageSrc,
  crop,
  zoom,
  rotation,
  cropAspect,
  cropperContainerRef,
  setCrop,
  setZoom,
  setRotation,
  onCropComplete,
  applyCrop,
  resetCropper,
  onResetAdjustments,
  onChooseImage,
}: OpportunityImageCropperProps) {
  if (!open || !rawImageSrc) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl max-h-[85vh] sm:max-h-[88vh] bg-white rounded-lg overflow-y-auto shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Recadrer l&apos;image
            </h2>
            <span className="text-xs font-medium bg-[#E6DAD0] text-gray-900 px-2 py-1 rounded-full">
              16:9
            </span>
          </div>
          <Button type="button" variant="outline" onClick={resetCropper}>
            Fermer
          </Button>
        </div>

        <div className="p-5 space-y-4">
          <div
            ref={cropperContainerRef}
            className="relative w-full max-w-2xl mx-auto rounded-md overflow-hidden border bg-black"
            style={{ aspectRatio: "16 / 9" }}
          >
            <Cropper
              image={rawImageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={cropAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="horizontal-cover"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-40"
                />
                <span className="text-xs text-gray-500">{zoom.toFixed(1)}x</span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">Rotation</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setRotation((prev) => prev - 90)}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setRotation((prev) => prev + 90)}>
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-40"
                />
                <span className="text-xs text-gray-500">{rotation}°</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={onChooseImage}>
              <Upload className="w-4 h-4 mr-2" />
              Choisir une image
            </Button>
            <Button type="button" className="bg-[#E63832] hover:bg-[#E63832]/90" onClick={applyCrop}>
              <Crop className="w-4 h-4 mr-2" />
              Appliquer le recadrage
            </Button>
            <Button type="button" variant="outline" onClick={onResetAdjustments}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
