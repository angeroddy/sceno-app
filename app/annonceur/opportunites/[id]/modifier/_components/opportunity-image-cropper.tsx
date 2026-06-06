"use client"

import type { Dispatch, RefObject, SetStateAction } from "react"
import Cropper from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Crop, RefreshCcw, RotateCcw, RotateCw } from "lucide-react"

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
}

/**
 * Modal de recadrage 16:9 utilisée par la page « Modifier une opportunité ».
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
}: OpportunityImageCropperProps) {
  if (!open || !rawImageSrc) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl max-h-[85vh] sm:max-h-[88vh] bg-white rounded-lg overflow-y-auto shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
            Recadrer l&apos;image
            </h3>
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
              cropShape="rect"
              showGrid={true}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              objectFit="horizontal-cover"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Zoom</Label>
                <span className="text-xs text-gray-500">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setZoom(1)}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Reset zoom
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rotation</Label>
                <span className="text-xs text-gray-500">{rotation}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setRotation((r) => r - 90)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  -90°
                </Button>
                <Button type="button" variant="outline" onClick={() => setRotation((r) => r + 90)}>
                  <RotateCw className="w-4 h-4 mr-2" />
                  +90°
                </Button>
                <Button type="button" variant="outline" onClick={() => setRotation(0)}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={resetCropper}>
            Annuler
          </Button>
          <Button type="button" className="bg-[#E63832] hover:bg-[#E63832]/90" onClick={applyCrop}>
            <Crop className="w-4 h-4 mr-2" />
            Appliquer le recadrage
          </Button>
        </div>
      </div>
    </div>
  )
}
