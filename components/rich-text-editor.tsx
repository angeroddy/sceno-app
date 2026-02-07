"use client"

import { useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Éditeur WYSIWYG basé sur contentEditable.
 *
 * - Les boutons B / I / S génèrent du HTML natif (<strong>, <em>, <u>)
 *   au lieu de marqueurs markdown (** / * / __).
 * - Le formatage est conservé lors du copier-coller.
 * - La valeur échangée avec le parent est du HTML (<strong>texte</strong>).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Décrivez votre opportunité...",
  className
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  // Drapeau pour éviter une boucle value → innerHTML → onInput → onChange → value
  const isInternalUpdate = useRef(false)

  // Charger le contenu initial UNE seule fois (évite de réinitialiser le curseur)
  useEffect(() => {
    if (editorRef.current && value) {
      editorRef.current.innerHTML = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si le parent pousse une nouvelle valeur de l'extérieur (reset formulaire etc.)
  useEffect(() => {
    if (!editorRef.current) return
    if (isInternalUpdate.current) {
      // Ignorer — on est nous-mêmes à l'origine du changement
      isInternalUpdate.current = false
      return
    }
    editorRef.current.innerHTML = value
  }, [value])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    isInternalUpdate.current = true
    onChange(editorRef.current.innerHTML)
  }, [onChange])

  /**
   * Exécute une commande d'édition sur la sélection courante.
   * document.execCommand est deprecated mais reste le seul moyen simple
   * de manipuler contentEditable sans bibliothèque externe.
   */
  const execCommand = useCallback((command: string, commandValue?: string) => {
    editorRef.current?.focus()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).execCommand(command, false, commandValue ?? null)
    // Synchroniser immédiatement après la commande
    if (editorRef.current) {
      isInternalUpdate.current = true
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const toolbarButtons = [
    {
      icon: <Bold className="w-4 h-4" />,
      label: "Gras (Ctrl+B)",
      action: () => execCommand("bold"),
    },
    {
      icon: <Italic className="w-4 h-4" />,
      label: "Italique (Ctrl+I)",
      action: () => execCommand("italic"),
    },
    {
      icon: <Underline className="w-4 h-4" />,
      label: "Souligné (Ctrl+U)",
      action: () => execCommand("underline"),
    },
    {
      icon: <Heading2 className="w-4 h-4" />,
      label: "Titre",
      action: () => execCommand("formatBlock", "h2"),
    },
    {
      icon: <List className="w-4 h-4" />,
      label: "Liste",
      action: () => execCommand("insertUnorderedList"),
    },
    {
      icon: <ListOrdered className="w-4 h-4" />,
      label: "Liste numérotée",
      action: () => execCommand("insertOrderedList"),
    },
  ]

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b px-2 py-2 flex items-center gap-1 flex-wrap">
        {toolbarButtons.map((button, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 cursor-pointer"
            onClick={button.action}
            title={button.label}
          >
            {button.icon}
          </Button>
        ))}
      </div>

      {/* Éditeur contentEditable */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        className="w-full min-h-[300px] p-4 focus:outline-none font-sans prose prose-sm max-w-none"
        style={{ lineHeight: "1.6" }}
        // Placeholder via attribut data — stylé en CSS (voir globals.css)
        data-placeholder={placeholder}
      />

      {/* Hint bas de page */}
      <div className="bg-gray-50 border-t px-4 py-2 text-xs text-gray-500">
        <p>
          <strong>Astuce :</strong> Utilisez la barre d&apos;outils pour formater votre texte.
          Le formatage est conservé lors du copier-coller.
        </p>
      </div>
    </div>
  )
}
