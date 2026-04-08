import sanitizeHtml from "sanitize-html"

const opportunityHtmlConfig: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "p",
    "div",
    "br",
    "img",
    "span",
    "font",
    "strong",
    "em",
    "u",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
  ],
  allowedAttributes: {
    div: ["style"],
    p: ["style"],
    img: ["src", "alt", "style"],
    span: ["style"],
    font: ["face", "size"],
    h1: ["style"],
    h2: ["style"],
    h3: ["style"],
    blockquote: ["style"],
    a: ["href", "target", "rel"],
  },
  allowedStyles: {
    div: {
      "text-align": [/^(left|center|right|justify)$/],
    },
    p: {
      "text-align": [/^(left|center|right|justify)$/],
    },
    img: {
      width: [/^\d+(px|%)$/],
      "max-width": [/^\d+(px|%)$/],
      display: [/^(block)$/],
    },
    span: {
      "font-family": [/^[a-zA-Z0-9\s,"'-]+$/],
      "font-size": [/^\d+(px|em|rem|%)$/],
      "text-align": [/^(left|center|right|justify)$/],
    },
    h1: {
      "text-align": [/^(left|center|right|justify)$/],
    },
    h2: {
      "text-align": [/^(left|center|right|justify)$/],
    },
    h3: {
      "text-align": [/^(left|center|right|justify)$/],
    },
    blockquote: {
      "text-align": [/^(left|center|right|justify)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer",
    }),
  },
}

export function sanitizeOpportunityHtml(input: string | null | undefined): string {
  return sanitizeHtml(input ?? "", opportunityHtmlConfig).trim()
}
