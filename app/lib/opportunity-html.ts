import sanitizeHtml from "sanitize-html"

const opportunityHtmlConfig: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
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
    a: ["href", "target", "rel"],
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
