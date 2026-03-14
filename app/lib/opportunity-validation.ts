import { z } from "zod"
import { sanitizeOpportunityHtml } from "./opportunity-html"

const opportunityTypeSchema = z.enum([
  "stages_ateliers",
  "ecoles_formations",
  "coachs_independants",
  "communication",
])

const opportunityModelSchema = z.enum(["derniere_minute", "pre_vente"])

const optionalHttpUrlSchema = z
  .preprocess(
    (value) => {
      if (value === null || value === undefined) return ""
      return typeof value === "string" ? value : value
    },
    z
      .string()
      .trim()
      .max(500, "Le lien est trop long")
      .transform((value) => value || "")
  )
  .refine((value) => {
    if (!value) return true
    const result = z.string().url().safeParse(value)
    return result.success && /^https?:\/\//.test(value)
  }, "Le lien d'informations doit être une URL http(s) valide")

const optionalHttpImageUrlSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return null
    return typeof value === "string" ? value : value
  },
  z
    .string()
    .trim()
    .url("L'image doit être une URL http(s) valide")
    .refine((value) => /^https?:\/\//.test(value), "L'image doit être une URL http(s) valide")
    .nullable()
)

const optionalContactPhoneSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return null
    return typeof value === "string" ? value : value
  },
  z
    .string()
    .trim()
    .max(30, "Le téléphone est trop long")
    .nullable()
)

export const createOpportunitySchema = z
  .object({
    type: opportunityTypeSchema,
    modele: opportunityModelSchema,
    titre: z.string().trim().min(5, "Le titre est trop court").max(120, "Le titre est trop long"),
    resume: z
      .string()
      .transform((value) => sanitizeOpportunityHtml(value))
      .refine((value) => value.length > 0, "La description est obligatoire")
      .refine((value) => value.replace(/<[^>]+>/g, "").trim().length >= 20, "La description est trop courte"),
    image_url: optionalHttpImageUrlSchema,
    lien_infos: optionalHttpUrlSchema,
    prix_base: z.coerce.number().finite().positive("Le prix de base doit être supérieur à 0"),
    prix_reduit: z.coerce.number().finite().nonnegative("Le prix réduit doit être positif"),
    nombre_places: z.coerce.number().int().min(1, "Le nombre de places doit être supérieur à 0"),
    date_evenement: z.iso.datetime({ offset: true }),
    contact_telephone: optionalContactPhoneSchema,
    contact_email: z.email("L'email de contact est invalide").max(255, "L'email est trop long"),
  })
  .superRefine((value, ctx) => {
    if (value.prix_reduit >= value.prix_base) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prix_reduit"],
        message: "Le prix réduit doit être inférieur au prix de base",
      })
    }

    if (new Date(value.date_evenement) <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date_evenement"],
        message: "La date de l'événement doit être dans le futur",
      })
    }

    const reduction = ((value.prix_base - value.prix_reduit) / value.prix_base) * 100
    if (reduction < 25) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prix_reduit"],
        message: "La réduction doit être d'au moins 25%",
      })
    }

    const diffMs = new Date(value.date_evenement).getTime() - Date.now()
    const hoursUntilEvent = diffMs / (1000 * 60 * 60)
    const daysUntilEvent = diffMs / (1000 * 60 * 60 * 24)

    if (value.modele === "derniere_minute" && hoursUntilEvent > 72) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modele"],
        message: "Le mode dernière minute est réservé aux événements dans les 72h",
      })
    }

    if (value.modele === "pre_vente" && daysUntilEvent < 56) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["modele"],
        message: "Le mode prévente est réservé aux événements à au moins 8 semaines",
      })
    }
  })
