"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Décrivez votre opportunité...",
  className
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertFormatting = (before: string, after: string = before) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)

    const newText =
      value.substring(0, start) +
      before + selectedText + after +
      value.substring(end)

    onChange(newText)

    // Remettre le focus et la sélection
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const newText =
      value.substring(0, start) +
      text +
      value.substring(start)

    onChange(newText)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + text.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const toolbarButtons = [
    {
      icon: <Bold className="w-4 h-4" />,
      label: "Gras",
      action: () => insertFormatting("**"),
    },
    {
      icon: <Italic className="w-4 h-4" />,
      label: "Italique",
      action: () => insertFormatting("*"),
    },
    {
      icon: <Heading2 className="w-4 h-4" />,
      label: "Titre",
      action: () => insertAtCursor("\n## "),
    },
    {
      icon: <List className="w-4 h-4" />,
      label: "Liste",
      action: () => insertAtCursor("\n- "),
    },
    {
      icon: <ListOrdered className="w-4 h-4" />,
      label: "Liste numérotée",
      action: () => insertAtCursor("\n1. "),
    },
    {
      icon: <Quote className="w-4 h-4" />,
      label: "Citation",
      action: () => insertAtCursor("\n> "),
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
            className="h-8 w-8 p-0"
            onClick={button.action}
            title={button.label}
          >
            {button.icon}
          </Button>
        ))}
      </div>

      {/* Text Area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[300px] p-4 resize-y focus:outline-none font-sans"
        style={{ lineHeight: "1.6" }}
      />

      {/* Preview Helper */}
      <div className="bg-gray-50 border-t px-4 py-2 text-xs text-gray-500">
        <p>
          <strong>Astuce :</strong> Utilisez la barre d&apos;outils pour formater votre texte.
          Markdown supporté : **gras**, *italique*, ## titres, - listes.
        </p>
      </div>
    </div>
  )
}
