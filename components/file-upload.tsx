"use client"

import * as React from "react"
import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Upload, X, FileText, Image as ImageIcon, Loader2, CheckCircle2 } from "lucide-react"

interface FileUploadProps {
  onFileSelect: (file: File | null) => void
  accept?: string
  maxSizeMB?: number
  label?: string
  description?: string
  currentFileUrl?: string | null
  error?: string
  className?: string
}

export function FileUpload({
  onFileSelect,
  accept = "image/jpeg,image/jpg,image/png,application/pdf",
  maxSizeMB = 5,
  label = "Pièce d'identité",
  description = "Formats acceptés : JPG, PNG, PDF (max 5 MB)",
  currentFileUrl = null,
  error = "",
  className
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Valider le fichier
  const validateFile = (file: File): string | null => {
    // Vérifier le type
    const acceptedTypes = accept.split(',').map(t => t.trim())
    const fileType = file.type

    if (!acceptedTypes.includes(fileType)) {
      return `Type de fichier non accepté. Formats autorisés : ${acceptedTypes.join(', ')}`
    }

    // Vérifier la taille
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `Le fichier est trop volumineux. Taille maximale : ${maxSizeMB} MB`
    }

    return null
  }

  // Gérer la sélection du fichier
  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      setPreview(null)
      setUploadError("")
      onFileSelect(null)
      return
    }

    // Valider le fichier
    const validationError = validateFile(file)
    if (validationError) {
      setUploadError(validationError)
      setSelectedFile(null)
      setPreview(null)
      onFileSelect(null)
      return
    }

    setUploadError("")
    setSelectedFile(file)
    onFileSelect(file)

    // Créer un preview si c'est une image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  // Gérer le drag & drop
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileChange(files[0])
    }
  }

  // Gérer le clic sur la zone de drop
  const handleClick = () => {
    fileInputRef.current?.click()
  }

  // Supprimer le fichier sélectionné
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleFileChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayError = error || uploadError

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      {/* Zone de drop / upload */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
          isDragging && "border-[#E63832] bg-[#E63832]/5",
          displayError && "border-red-500 bg-red-50",
          !displayError && !isDragging && "border-gray-300 hover:border-[#E63832] hover:bg-gray-50",
          selectedFile && "border-green-500 bg-green-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            const files = e.target.files
            if (files && files.length > 0) {
              handleFileChange(files[0])
            }
          }}
          className="hidden"
        />

        {/* Pas de fichier sélectionné */}
        {!selectedFile && !currentFileUrl && (
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Cliquez pour sélectionner ou glissez-déposez
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {description}
              </p>
            </div>
          </div>
        )}

        {/* Fichier sélectionné */}
        {selectedFile && (
          <div className="flex items-start space-x-4">
            {/* Preview ou icône */}
            <div className="flex-shrink-0">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded border border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Informations du fichier */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center mt-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mr-1" />
                <span className="text-xs text-green-600">Fichier prêt</span>
              </div>
            </div>
          </div>
        )}

        {/* Fichier actuel (depuis l'URL) */}
        {!selectedFile && currentFileUrl && (
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">
                Document actuel
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cliquez pour remplacer
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Message d'erreur */}
      {displayError && (
        <p className="text-sm text-red-600">
          {displayError}
        </p>
      )}

      {/* Description supplémentaire */}
      {description && !displayError && !selectedFile && (
        <p className="text-xs text-gray-500">
          {description}
        </p>
      )}
    </div>
  )
}
