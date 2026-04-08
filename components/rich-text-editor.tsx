"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Eraser,
  Heading1,
  ImagePlus,
  Italic,
  Loader2,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Underline,
  Undo2,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading2,
  Heading3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { sanitizeOpportunityHtml } from "@/app/lib/opportunity-html"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  onImageUpload?: (file: File) => Promise<string | null>
  placeholder?: string
  className?: string
}

type ToolbarState = {
  bold: boolean
  italic: boolean
  underline: boolean
  unorderedList: boolean
  orderedList: boolean
  align: "left" | "center" | "right"
  link: boolean
  block: "" | "h1" | "h2" | "h3" | "blockquote"
  fontName: string
  fontSize: string
}

const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  unorderedList: false,
  orderedList: false,
  align: "left",
  link: false,
  block: "",
  fontName: "",
  fontSize: "",
}

const FONT_NAME_OPTIONS = [
  { label: "Arial", value: "Arial" },
  { label: "Georgia", value: "Georgia" },
  { label: "Tahoma", value: "Tahoma" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Trebuchet MS", value: "Trebuchet MS" },
  { label: "Verdana", value: "Verdana" },
]

const FONT_SIZE_OPTIONS = [
  { label: "12", value: "12", commandValue: "2" },
  { label: "14", value: "14", commandValue: "3" },
  { label: "16", value: "16", commandValue: "4" },
  { label: "18", value: "18", commandValue: "5" },
  { label: "24", value: "24", commandValue: "6" },
  { label: "32", value: "32", commandValue: "7" },
]

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
  onImageUpload,
  placeholder = "Décrivez votre opportunité...",
  className
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Range | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [toolbarState, setToolbarState] = useState<ToolbarState>(DEFAULT_TOOLBAR_STATE)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  // Drapeau pour éviter une boucle value → innerHTML → onInput → onChange → value
  const isInternalUpdate = useRef(false)

  // Charger le contenu initial UNE seule fois (évite de réinitialiser le curseur)
  useEffect(() => {
    if (editorRef.current && value) {
      editorRef.current.innerHTML = sanitizeOpportunityHtml(value)
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
    editorRef.current.innerHTML = sanitizeOpportunityHtml(value)
  }, [value])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    saveSelection()
    isInternalUpdate.current = true
    onChange(sanitizeOpportunityHtml(editorRef.current.innerHTML))
  }, [onChange])

  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)

    if (!editorRef.current?.contains(range.commonAncestorContainer)) return
    selectionRef.current = range.cloneRange()
  }, [])

  const updateToolbarState = useCallback(() => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) {
      setToolbarState(DEFAULT_TOOLBAR_STATE)
      return
    }

    const range = selection.getRangeAt(0)
    const anchorNode = selection.anchorNode
    if (!anchorNode || !editor.contains(range.commonAncestorContainer)) {
      setToolbarState(DEFAULT_TOOLBAR_STATE)
      return
    }

    const baseElement =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode.parentElement

    if (!baseElement) {
      setToolbarState(DEFAULT_TOOLBAR_STATE)
      return
    }

    const closestBlock = baseElement.closest("h1, h2, h3, blockquote")
    const closestList = baseElement.closest("ul, ol")
    const closestLink = baseElement.closest("a")
    const nearestStyledElement = baseElement.closest("span, font, p, div, h1, h2, h3, blockquote") || baseElement
    const computedStyle = window.getComputedStyle(nearestStyledElement)
    const fontFace = (baseElement.closest("font")?.getAttribute("face") || "").replace(/['"]/g, "")
    const fontSizeAttr = baseElement.closest("font")?.getAttribute("size") || ""
    const matchingFont = FONT_NAME_OPTIONS.find((option) =>
      computedStyle.fontFamily.toLowerCase().includes(option.value.toLowerCase())
        || fontFace.toLowerCase() === option.value.toLowerCase()
    )

    const fontSizePx = Number.parseFloat(computedStyle.fontSize)
    const fontSizeFromAttr = FONT_SIZE_OPTIONS.find((option) => option.commandValue === fontSizeAttr)?.value
    const activeSize = fontSizeFromAttr || FONT_SIZE_OPTIONS.reduce((closest, option) => {
      const currentDistance = Math.abs(Number(option.value) - fontSizePx)
      const closestDistance = Math.abs(Number(closest.value) - fontSizePx)
      return currentDistance < closestDistance ? option : closest
    }, FONT_SIZE_OPTIONS[0]).value

    const textAlign = computedStyle.textAlign
    const activeAlign = textAlign === "center" || textAlign === "right" ? textAlign : "left"

    setToolbarState({
      bold: document.queryCommandState("bold") || Number.parseInt(computedStyle.fontWeight, 10) >= 600,
      italic: document.queryCommandState("italic") || computedStyle.fontStyle === "italic",
      underline: document.queryCommandState("underline") || computedStyle.textDecorationLine.includes("underline"),
      unorderedList: closestList?.tagName === "UL",
      orderedList: closestList?.tagName === "OL",
      align: activeAlign,
      link: Boolean(closestLink),
      block: (closestBlock?.tagName.toLowerCase() as ToolbarState["block"]) || "",
      fontName: matchingFont?.value || "",
      fontSize: FONT_SIZE_OPTIONS.some((option) => option.value === activeSize) ? activeSize : "",
    })
  }, [])

  const restoreSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || !selectionRef.current) return
    selection.removeAllRanges()
    selection.addRange(selectionRef.current)
  }, [])

  const syncEditorValue = useCallback(() => {
    if (!editorRef.current) return
    isInternalUpdate.current = true
    onChange(sanitizeOpportunityHtml(editorRef.current.innerHTML))
    updateToolbarState()
  }, [onChange, updateToolbarState])

  /**
   * Exécute une commande d'édition sur la sélection courante.
   * document.execCommand est deprecated mais reste le seul moyen simple
   * de manipuler contentEditable sans bibliothèque externe.
   */
  const execCommand = useCallback((command: string, commandValue?: string) => {
    editorRef.current?.focus()
    restoreSelection()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).execCommand(command, false, commandValue ?? null)
    saveSelection()
    syncEditorValue()
  }, [restoreSelection, saveSelection, syncEditorValue])

  const applyFontName = useCallback((fontName: string) => {
    if (!fontName) return
    editorRef.current?.focus()
    restoreSelection()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).execCommand("styleWithCSS", false, true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).execCommand("fontName", false, fontName)
    saveSelection()
    syncEditorValue()
  }, [restoreSelection, saveSelection, syncEditorValue])

  const applyFontSize = useCallback((fontSize: string) => {
    if (!fontSize) return
    const matchingSize = FONT_SIZE_OPTIONS.find((option) => option.value === fontSize)
    if (!matchingSize) return
    editorRef.current?.focus()
    restoreSelection()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).execCommand("styleWithCSS", false, true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).execCommand("fontSize", false, matchingSize.commandValue)
    saveSelection()
    syncEditorValue()
  }, [restoreSelection, saveSelection, syncEditorValue])

  const createLink = useCallback(() => {
    const href = window.prompt("Ajouter un lien", "https://")
    if (!href) return
    execCommand("createLink", href)
  }, [execCommand])

  const insertImage = useCallback((imageUrl: string) => {
    const imageHtml = `
      <p>
        <img
          src="${imageUrl}"
          alt="Image inseree dans la description"
          style="max-width: 420px; width: 100%; display: block;"
        />
      </p>
      <p><br></p>
    `
    execCommand("insertHTML", imageHtml)
  }, [execCommand])

  const handleImageSelection = useCallback(async (file: File | null) => {
    if (!file || !onImageUpload) return
    setIsUploadingImage(true)
    try {
      const imageUrl = await onImageUpload(file)
      if (imageUrl) {
        insertImage(imageUrl)
      }
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ""
      }
    }
  }, [insertImage, onImageUpload])

  const toolbarButtons = [
    {
      key: "bold",
      icon: <Bold className="w-4 h-4" />,
      label: "Gras (Ctrl+B)",
      action: () => execCommand("bold"),
      active: toolbarState.bold,
    },
    {
      key: "italic",
      icon: <Italic className="w-4 h-4" />,
      label: "Italique (Ctrl+I)",
      action: () => execCommand("italic"),
      active: toolbarState.italic,
    },
    {
      key: "underline",
      icon: <Underline className="w-4 h-4" />,
      label: "Souligné (Ctrl+U)",
      action: () => execCommand("underline"),
      active: toolbarState.underline,
    },
    {
      key: "h1",
      icon: <Heading1 className="w-4 h-4" />,
      label: "Titre 1",
      action: () => execCommand("formatBlock", "h1"),
      active: toolbarState.block === "h1",
    },
    {
      key: "h2",
      icon: <Heading2 className="w-4 h-4" />,
      label: "Titre 2",
      action: () => execCommand("formatBlock", "h2"),
      active: toolbarState.block === "h2",
    },
    {
      key: "h3",
      icon: <Heading3 className="w-4 h-4" />,
      label: "Titre 3",
      action: () => execCommand("formatBlock", "h3"),
      active: toolbarState.block === "h3",
    },
    {
      key: "blockquote",
      icon: <Quote className="w-4 h-4" />,
      label: "Citation",
      action: () => execCommand("formatBlock", "blockquote"),
      active: toolbarState.block === "blockquote",
    },
    {
      key: "ul",
      icon: <List className="w-4 h-4" />,
      label: "Liste",
      action: () => execCommand("insertUnorderedList"),
      active: toolbarState.unorderedList,
    },
    {
      key: "ol",
      icon: <ListOrdered className="w-4 h-4" />,
      label: "Liste numérotée",
      action: () => execCommand("insertOrderedList"),
      active: toolbarState.orderedList,
    },
    {
      key: "left",
      icon: <AlignLeft className="w-4 h-4" />,
      label: "Aligner à gauche",
      action: () => execCommand("justifyLeft"),
      active: toolbarState.align === "left",
    },
    {
      key: "center",
      icon: <AlignCenter className="w-4 h-4" />,
      label: "Centrer",
      action: () => execCommand("justifyCenter"),
      active: toolbarState.align === "center",
    },
    {
      key: "right",
      icon: <AlignRight className="w-4 h-4" />,
      label: "Aligner à droite",
      action: () => execCommand("justifyRight"),
      active: toolbarState.align === "right",
    },
    {
      key: "link",
      icon: <Link2 className="w-4 h-4" />,
      label: "Ajouter un lien",
      action: createLink,
      active: toolbarState.link,
    },
    {
      key: "unlink",
      icon: <Unlink className="w-4 h-4" />,
      label: "Retirer le lien",
      action: () => execCommand("unlink"),
      active: false,
    },
    {
      key: "removeFormat",
      icon: <Eraser className="w-4 h-4" />,
      label: "Effacer le formatage",
      action: () => execCommand("removeFormat"),
      active: false,
    },
    {
      key: "undo",
      icon: <Undo2 className="w-4 h-4" />,
      label: "Annuler",
      action: () => execCommand("undo"),
      active: false,
    },
    {
      key: "redo",
      icon: <Redo2 className="w-4 h-4" />,
      label: "Rétablir",
      action: () => execCommand("redo"),
      active: false,
    },
  ]

  useEffect(() => {
    const handleSelectionChange = () => {
      updateToolbarState()
    }

    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [updateToolbarState])

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div
        className="bg-gray-50 border-b px-2 py-2 flex items-center gap-1 flex-wrap"
        onMouseDownCapture={saveSelection}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleImageSelection(event.target.files?.[0] || null)
          }}
        />
        <select
          className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700"
          value={toolbarState.fontName}
          onChange={(event) => {
            applyFontName(event.target.value)
          }}
          aria-label="Police"
        >
          <option value="">Police</option>
          {FONT_NAME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700"
          value={toolbarState.fontSize}
          onChange={(event) => {
            applyFontSize(event.target.value)
          }}
          aria-label="Taille du texte"
        >
          <option value="">Taille</option>
          {FONT_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}px</option>
          ))}
        </select>

        {toolbarButtons.map((button, index) => (
          <Button
            key={button.key || index}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={button.active}
            className={cn(
              "h-8 w-8 p-0 cursor-pointer",
              button.active && "bg-[#FFF0EE] text-[#E63832] ring-1 ring-[#E63832]/30"
            )}
            onMouseDown={(event) => {
              event.preventDefault()
              button.action()
            }}
            title={button.label}
          >
            {button.icon}
          </Button>
        ))}

        {onImageUpload ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-2 rounded-full px-3 text-sm"
            disabled={isUploadingImage}
            onMouseDown={(event) => {
              event.preventDefault()
              saveSelection()
              imageInputRef.current?.click()
            }}
            title="Ajouter une image"
          >
            {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Ajouter
          </Button>
        ) : null}
      </div>

      {/* Éditeur contentEditable */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={() => {
          saveSelection()
          updateToolbarState()
        }}
        onFocus={updateToolbarState}
        onKeyUp={() => {
          saveSelection()
          updateToolbarState()
        }}
        onMouseUp={() => {
          saveSelection()
          updateToolbarState()
        }}
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
