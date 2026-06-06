import { sendMail } from "@/lib/mailer"
import { calculateRoundedDiscountPercent } from "@/lib/pricing"
import {
  OPPORTUNITY_MODEL_LABELS,
  OPPORTUNITY_TYPE_LABELS,
  type OpportunityModel,
  type OpportunityType,
} from "@/app/types"

type OpportunityEmailData = {
  id: string
  titre: string
  type: OpportunityType
  modele: OpportunityModel
  prix_base?: number | null
  prix_reduit?: number | null
  reduction_pourcentage?: number | null
  date_evenement?: string | null
  annonceurNom?: string | null
}

type AdvertiserEmailData = {
  id: string
  email: string
  nom_formation?: string | null
  nom_entreprise?: string | null
}

type ComedianEmailData = {
  email: string
  prenom?: string | null
  nom?: string | null
}

type SignupConfirmationEmailData = {
  email: string
  confirmationUrl: string
}

type PasswordResetEmailData = {
  email: string
  resetUrl: string
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "")
}

function getAdminNotificationEmail(): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL || null
}

// ---------------------------------------------------------------------------
// Identité de marque & helpers de rendu partagés
// ---------------------------------------------------------------------------

const BRAND = {
  red: "#E63832",
  ink: "#111827",
  heading: "#1f2937",
  muted: "#6b7280",
  border: "#e5e7eb",
  cardBg: "#fafafa",
  pageBg: "#f2f2f2",
  logoUrl: "https://formations-artistiques.fr/email-assets/logoApp.png",
  heroUrl: "https://formations-artistiques.fr/email-assets/mainImg.webp",
  siteName: "formations-artistiques.fr",
  siteUrl: "https://formations-artistiques.fr",
  supportEmail: "support@formations-artistiques.fr",
} as const

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatCurrency(value?: number | null): string {
  if (typeof value !== "number") return ""
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value)
}

function formatDateTime(value?: string | null): string {
  if (!value) return ""
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  })
}

function formatLongDate(value?: string | null): string {
  if (!value) return ""
  return new Date(value).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatTime(value?: string | null): string {
  if (!value) return ""
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getPersonName(person: { prenom?: string | null; nom?: string | null }, fallback: string): string {
  return [person.prenom, person.nom].filter(Boolean).join(" ").trim() || fallback
}

/**
 * Coquille HTML commune à tous les emails transactionnels.
 * Reprend l'identité de l'email d'inscription : logo, bandeau rouge,
 * corps blanc et pied de page de marque, le tout en tables compatibles Outlook.
 */
function buildEmailShell(opts: {
  preheader?: string
  bannerTitle: string
  bannerSubtitle?: string
  heading: string
  body: string
  showHero?: boolean
  signature?: boolean
}): string {
  const {
    preheader,
    bannerTitle,
    bannerSubtitle,
    heading,
    body,
    showHero = false,
    signature = true,
  } = opts

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(bannerTitle)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;">
          <tr>
            <td style="padding:28px 32px 24px;background-color:#ffffff;">
              <img src="${BRAND.logoUrl}" alt="${BRAND.siteName}" width="260" style="display:block;width:260px;max-width:260px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;">
                ${showHero ? `<tr><td style="background-color:#ffffff;"><img src="${BRAND.heroUrl}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;"></td></tr>` : ""}
                <tr>
                  <td style="padding:18px 22px;background-color:${BRAND.red};">
                    <p style="margin:0;color:#ffffff;font-size:18px;line-height:24px;font-weight:800;">${escapeHtml(bannerTitle)}</p>
                    ${bannerSubtitle ? `<p style="margin:5px 0 0;color:#ffffff;font-size:14px;line-height:20px;">${escapeHtml(bannerSubtitle)}</p>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 54px 24px;background-color:#ffffff;">
              <h1 style="margin:0 0 22px;color:${BRAND.heading};font-size:26px;line-height:34px;font-weight:700;">${escapeHtml(heading)}</h1>
              ${body}
              ${signature ? `<p style="margin:30px 0 0;color:${BRAND.muted};font-size:15px;line-height:24px;">À très vite,<br><span style="color:${BRAND.ink};">L'équipe ${BRAND.siteName}</span></p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:30px 54px;background-color:${BRAND.red};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td valign="top" style="color:#ffffff;font-size:12px;line-height:17px;font-weight:600;">${BRAND.siteName}<br>Plateforme dédiée aux opportunités<br>pour comédiens et annonceurs</td>
                  <td valign="top" align="right" style="color:#ffffff;font-size:12px;line-height:17px;">
                    <a href="mailto:${BRAND.supportEmail}" style="color:#ffffff;text-decoration:none;">${BRAND.supportEmail}</a><br>
                    <a href="${BRAND.siteUrl}" style="color:#ffffff;text-decoration:none;">${BRAND.siteName}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Paragraphe de corps standard. `html` peut contenir du HTML (déjà échappé par l'appelant). */
function p(html: string): string {
  return `<p style="margin:0 0 18px;color:${BRAND.ink};font-size:16px;line-height:25px;">${html}</p>`
}

/** Note secondaire (mentions de sécurité, expiration…). */
function note(html: string): string {
  return `<p style="margin:24px 0 0;color:${BRAND.muted};font-size:14px;line-height:22px;">${html}</p>`
}

/** Bouton d'action principal, en table pour la compatibilité Outlook. */
function buildButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0;"><tr><td style="border-radius:6px;background-color:${BRAND.red};"><a href="${escapeHtml(href)}" style="display:inline-block;padding:15px 28px;color:#ffffff;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a></td></tr></table>`
}

/** Lien de repli affiché sous un bouton (« si le bouton ne fonctionne pas… »). */
function buildFallbackLink(url: string): string {
  return `
    <p style="margin:28px 0 8px;color:${BRAND.muted};font-size:13px;line-height:20px;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
    <p style="margin:0;word-break:break-all;font-size:13px;line-height:20px;"><a href="${escapeHtml(url)}" style="color:${BRAND.red};text-decoration:underline;">${escapeHtml(url)}</a></p>
  `
}

/** Carte récapitulative à lignes label / valeur. Les `value` peuvent contenir du HTML. */
function buildInfoCard(
  rows: Array<{ label: string; value: string }>,
  opts?: { title?: string }
): string {
  const items = rows
    .filter((r) => r.value)
    .map(
      (r) =>
        `<tr><td style="padding:7px 0;color:${BRAND.muted};font-size:14px;line-height:20px;width:42%;vertical-align:top;">${escapeHtml(r.label)}</td><td style="padding:7px 0;color:${BRAND.ink};font-size:14px;line-height:20px;font-weight:600;vertical-align:top;">${r.value}</td></tr>`
    )
    .join("")

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid ${BRAND.border};border-radius:12px;margin:8px 0 24px;background-color:${BRAND.cardBg};"><tr><td style="padding:18px 22px;">${opts?.title ? `<p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${BRAND.red};">${escapeHtml(opts.title)}</p>` : ""}<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${items}</table></td></tr></table>`
}

/** Bloc de mise en avant du prix avec prix barré et badge de réduction. */
function buildPriceHighlight(
  reduit?: number | null,
  base?: number | null,
  reduction?: number | null
): string {
  if (typeof reduit !== "number") return ""
  const struck =
    typeof base === "number" && base > reduit
      ? `<span style="margin-left:10px;color:${BRAND.muted};font-size:16px;text-decoration:line-through;">${escapeHtml(formatCurrency(base))}</span>`
      : ""
  const badge = reduction
    ? `<span style="display:inline-block;margin-left:12px;padding:3px 10px;background-color:${BRAND.red};color:#ffffff;font-size:13px;font-weight:700;border-radius:999px;vertical-align:middle;">-${reduction} %</span>`
    : ""
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:8px 0 24px;"><tr><td style="padding:18px 22px;background-color:#fdecec;border:1px solid #f5c2c0;border-radius:12px;"><p style="margin:0;font-size:13px;color:${BRAND.muted};">Votre tarif réservé</p><p style="margin:6px 0 0;"><span style="color:${BRAND.red};font-size:28px;font-weight:800;vertical-align:middle;">${escapeHtml(formatCurrency(reduit))}</span>${struck}${badge}</p></td></tr></table>`
}

// ---------------------------------------------------------------------------
// Sujets
// ---------------------------------------------------------------------------

function getOpportunityAlertModelLabel(model: OpportunityModel): string {
  return model === "pre_vente" ? "Prévente" : "Dernière minute"
}

function getOpportunityAlertTypeLabel(type: OpportunityType): string {
  const labels: Record<OpportunityType, string> = {
    stages_ateliers: "Stages & Ateliers",
    ecoles_formations: "Écoles & Formations",
    coachs_independants: "Coachs indépendants",
    communication: "Photos / Démo / Communication",
  }

  return labels[type]
}

function getOpportunityReduction(opportunity: OpportunityEmailData): number | null {
  return typeof opportunity.reduction_pourcentage === "number"
    ? opportunity.reduction_pourcentage
    : typeof opportunity.prix_base === "number" && typeof opportunity.prix_reduit === "number"
      ? calculateRoundedDiscountPercent(opportunity.prix_base, opportunity.prix_reduit)
      : null
}

export function buildOpportunityAlertSubject(opportunity: OpportunityEmailData): string {
  const modelLabel = getOpportunityAlertModelLabel(opportunity.modele)
  const typeLabel = getOpportunityAlertTypeLabel(opportunity.type)
  const reduction = getOpportunityReduction(opportunity)
  const modelWithDiscount = reduction ? `${modelLabel} à - ${reduction} %` : modelLabel

  return `${modelWithDiscount} / ${typeLabel} / ${opportunity.titre}`
}

// ---------------------------------------------------------------------------
// Emails admin
// ---------------------------------------------------------------------------

export async function notifyAdminAdvertiserPending(advertiser: AdvertiserEmailData) {
  const adminEmail = getAdminNotificationEmail()
  if (!adminEmail) return

  const siteUrl = getSiteUrl()
  const advertiserName = advertiser.nom_formation || advertiser.nom_entreprise || advertiser.email
  const adminUrl = `${siteUrl}/admin/annonceurs/${advertiser.id}`

  await sendMail({
    to: adminEmail,
    subject: `Annonceur en attente de validation - ${advertiserName}`,
    html: buildEmailShell({
      preheader: `${advertiserName} attend la validation de son compte annonceur.`,
      bannerTitle: "Action requise",
      bannerSubtitle: "Un annonceur attend votre validation.",
      heading: "Annonceur en attente de validation",
      signature: false,
      body: `
        ${p("Un annonceur vient de confirmer son adresse e-mail et attend une validation de l'équipe.")}
        ${buildInfoCard(
          [
            { label: "Annonceur", value: escapeHtml(advertiserName) },
            { label: "E-mail", value: escapeHtml(advertiser.email) },
          ],
          { title: "Compte concerné" }
        )}
        ${buildButton(adminUrl, "Voir l'annonceur")}
      `,
    }),
    text: `Annonceur en attente de validation\n${advertiserName}\n${advertiser.email}\n${adminUrl}`,
  })
}

export async function notifyAdminOpportunityPending(opportunity: OpportunityEmailData) {
  const adminEmail = getAdminNotificationEmail()
  if (!adminEmail) return

  const siteUrl = getSiteUrl()
  const adminUrl = `${siteUrl}/admin/opportunites/${opportunity.id}`

  await sendMail({
    to: adminEmail,
    subject: `Opportunité en attente de validation - ${opportunity.titre}`,
    html: buildEmailShell({
      preheader: `« ${opportunity.titre} » attend la validation.`,
      bannerTitle: "Action requise",
      bannerSubtitle: "Une opportunité attend votre validation.",
      heading: "Opportunité en attente de validation",
      signature: false,
      body: `
        ${p("Une nouvelle opportunité a été publiée et attend une validation de l'équipe avant diffusion.")}
        ${buildInfoCard(
          [
            { label: "Titre", value: escapeHtml(opportunity.titre) },
            { label: "Type", value: escapeHtml(OPPORTUNITY_TYPE_LABELS[opportunity.type]) },
            { label: "Modèle", value: escapeHtml(OPPORTUNITY_MODEL_LABELS[opportunity.modele]) },
          ],
          { title: "Opportunité concernée" }
        )}
        ${buildButton(adminUrl, "Voir l'opportunité")}
      `,
    }),
    text: `Opportunité en attente de validation\n${opportunity.titre}\n${adminUrl}`,
  })
}

// ---------------------------------------------------------------------------
// Emails de bienvenue / validation
// ---------------------------------------------------------------------------

export async function sendAdvertiserWelcomeEmail(advertiser: AdvertiserEmailData) {
  const siteUrl = getSiteUrl()
  const advertiserName = advertiser.nom_formation || advertiser.nom_entreprise || "votre organisme"

  await sendMail({
    to: advertiser.email,
    subject: "Bienvenue sur formations-artistiques.fr",
    html: buildEmailShell({
      preheader: "Votre adresse est confirmée, votre compte annonceur est en cours de validation.",
      bannerTitle: "Compte créé",
      bannerSubtitle: "Bienvenue parmi les annonceurs.",
      heading: "Bienvenue sur formations-artistiques.fr",
      showHero: true,
      body: `
        ${p(`Bonjour ${escapeHtml(advertiserName)},`)}
        ${p("Votre adresse e-mail est confirmée. 🎉")}
        ${p("Votre compte annonceur est désormais <strong>en attente de validation</strong> par notre équipe. Dès qu'il sera validé, vous pourrez publier et gérer vos opportunités auprès de notre communauté de comédiens.")}
        ${p("Nous revenons vers vous très rapidement.")}
        ${buildButton(siteUrl, "Accéder au site")}
      `,
    }),
    text: `Bienvenue sur formations-artistiques.fr\nVotre compte annonceur est en attente de validation.\n${siteUrl}`,
  })
}

export async function sendComedianWelcomeEmail(comedian: ComedianEmailData) {
  const siteUrl = getSiteUrl()
  const name = getPersonName(comedian, "")
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,"

  await sendMail({
    to: comedian.email,
    subject: "Bienvenue sur formations-artistiques.fr",
    html: buildEmailShell({
      preheader: "Votre espace comédien est prêt : découvrez les opportunités du moment.",
      bannerTitle: "Compte activé",
      bannerSubtitle: "Votre espace comédien vous attend.",
      heading: "Bienvenue sur formations-artistiques.fr",
      showHero: true,
      body: `
        ${p(greeting)}
        ${p("Votre adresse e-mail est confirmée et votre compte est actif. 🎬")}
        ${p("Vous pouvez dès maintenant accéder à votre espace comédien, configurer vos alertes et profiter des opportunités (stages, formations, coachs, préventes et dernières minutes) à tarifs réservés.")}
        ${buildButton(`${siteUrl}/comedien`, "Accéder à mon espace")}
      `,
    }),
    text: `Bienvenue sur formations-artistiques.fr\nVotre compte comédien est actif.\n${siteUrl}/comedien`,
  })
}

export async function sendAdvertiserValidatedEmail(advertiser: AdvertiserEmailData) {
  const siteUrl = getSiteUrl()
  const advertiserName = advertiser.nom_formation || advertiser.nom_entreprise || "votre organisme"

  await sendMail({
    to: advertiser.email,
    subject: "Votre compte annonceur a été validé",
    html: buildEmailShell({
      preheader: "Votre compte est validé : vous pouvez publier vos opportunités.",
      bannerTitle: "Compte validé",
      bannerSubtitle: "Vous pouvez désormais publier vos opportunités.",
      heading: "Votre compte annonceur a été validé",
      showHero: true,
      body: `
        ${p(`Bonjour ${escapeHtml(advertiserName)},`)}
        ${p("Bonne nouvelle : votre compte annonceur a été <strong>validé</strong> par notre équipe. ✅")}
        ${p("Vous pouvez maintenant publier et gérer vos opportunités. Chaque opportunité validée sera diffusée aux comédiens dont les alertes correspondent.")}
        ${buildButton(`${siteUrl}/annonceur`, "Accéder à mon espace")}
      `,
    }),
    text: `Votre compte annonceur a été validé.\n${siteUrl}/annonceur`,
  })
}

// ---------------------------------------------------------------------------
// Email d'inscription (confirmation d'adresse)
// ---------------------------------------------------------------------------

export async function sendSignupConfirmationEmail(data: SignupConfirmationEmailData) {
  await sendMail({
    to: data.email,
    subject: "Confirmez votre inscription - formations-artistiques.fr",
    html: buildEmailShell({
      preheader: "Une dernière étape : confirmez votre adresse e-mail pour activer votre compte.",
      bannerTitle: "Inscription réussie",
      bannerSubtitle: "Votre espace formations-artistiques.fr vous attend.",
      heading: "Bienvenue sur formations-artistiques.fr",
      showHero: true,
      body: `
        ${p("Votre compte vient d'être créé avec succès. Il ne reste qu'une dernière étape pour accéder à votre espace : confirmer votre adresse e-mail.")}
        ${p("Cliquez sur le bouton ci-dessous pour finaliser votre inscription et rejoindre la plateforme.")}
        ${buildButton(data.confirmationUrl, "Confirmer mon adresse e-mail")}
        ${buildFallbackLink(data.confirmationUrl)}
        ${note("Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail.")}
      `,
    }),
    text: [
      "Bienvenue sur formations-artistiques.fr",
      "Confirmez votre adresse e-mail pour finaliser votre inscription.",
      data.confirmationUrl,
    ].join("\n"),
  })
}

// ---------------------------------------------------------------------------
// Email de réinitialisation de mot de passe
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail(data: PasswordResetEmailData) {
  await sendMail({
    to: data.email,
    subject: "Réinitialisez votre mot de passe - formations-artistiques.fr",
    html: buildEmailShell({
      preheader: "Réinitialisez votre mot de passe — lien valable temporairement.",
      bannerTitle: "Sécurité de votre compte",
      bannerSubtitle: "Demande de réinitialisation de mot de passe.",
      heading: "Réinitialisation de mot de passe",
      body: `
        ${p("Vous avez demandé à réinitialiser votre mot de passe.")}
        ${p("Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe en toute sécurité.")}
        ${buildButton(data.resetUrl, "Réinitialiser mon mot de passe")}
        ${buildFallbackLink(data.resetUrl)}
        ${note("Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail : votre mot de passe restera inchangé.")}
      `,
    }),
    text: [
      "Réinitialisation de mot de passe",
      "Cliquez sur ce lien pour créer un nouveau mot de passe :",
      data.resetUrl,
    ].join("\n"),
  })
}

// ---------------------------------------------------------------------------
// Alerte opportunité (comédien)
// ---------------------------------------------------------------------------

export async function sendOpportunityAlertEmail(to: string, opportunity: OpportunityEmailData) {
  const siteUrl = getSiteUrl()
  const opportunityUrl = `${siteUrl}/comedien/opportunites/${opportunity.id}`
  const subject = buildOpportunityAlertSubject(opportunity)
  const dateLabel = formatDateTime(opportunity.date_evenement)
  const reduction = getOpportunityReduction(opportunity)
  const modelLabel = getOpportunityAlertModelLabel(opportunity.modele)
  const typeLabel = getOpportunityAlertTypeLabel(opportunity.type)

  await sendMail({
    to,
    subject,
    html: buildEmailShell({
      preheader: `${opportunity.titre} — ${modelLabel}${reduction ? ` à -${reduction} %` : ""}.`,
      bannerTitle: reduction ? `${modelLabel} · -${reduction} %` : modelLabel,
      bannerSubtitle: "Une nouvelle opportunité correspond à vos alertes.",
      heading: opportunity.titre,
      body: `
        ${p("Une opportunité correspondant à vos préférences d'alerte vient d'être publiée. Les places sont limitées, profitez-en vite. ⚡")}
        ${buildInfoCard(
          [
            { label: "Organisme", value: escapeHtml(opportunity.annonceurNom || "Organisme") },
            { label: "Catégorie", value: escapeHtml(typeLabel) },
            { label: "Format", value: escapeHtml(modelLabel) },
            ...(dateLabel ? [{ label: "Date", value: escapeHtml(dateLabel) }] : []),
          ],
          { title: "L'opportunité en bref" }
        )}
        ${buildPriceHighlight(opportunity.prix_reduit, opportunity.prix_base, reduction)}
        ${buildButton(opportunityUrl, "Voir l'opportunité")}
      `,
    }),
    text: `${subject}\n${opportunityUrl}`,
  })
}

// ---------------------------------------------------------------------------
// Emails d'achat
// ---------------------------------------------------------------------------

export async function sendComedianPurchaseEmail(params: {
  to: string
  comedianName?: string | null
  receiptReference: string
  opportunityTitle: string
  organizer: string
  eventDate?: string | null
  paidPrice: number
  purchaseDate: string
  contactEmail?: string | null
}) {
  const siteUrl = getSiteUrl()
  const greeting = params.comedianName ? `Bonjour ${escapeHtml(params.comedianName)},` : "Bonjour,"
  const eventDay = formatLongDate(params.eventDate)
  const eventTime = formatTime(params.eventDate)

  await sendMail({
    to: params.to,
    subject: `Votre place est confirmée - ${params.opportunityTitle}`,
    html: buildEmailShell({
      preheader: `Réservation confirmée pour « ${params.opportunityTitle} » — reçu ${params.receiptReference}.`,
      bannerTitle: "Réservation confirmée",
      bannerSubtitle: "Votre place est réservée. 🎟️",
      heading: "Réservation confirmée",
      body: `
        ${p(greeting)}
        ${p("Votre réservation a bien été confirmée sur formations-artistiques.fr. Merci pour votre confiance !")}
        ${buildInfoCard(
          [
            { label: "Référence / reçu", value: escapeHtml(params.receiptReference) },
            { label: "Opportunité", value: escapeHtml(params.opportunityTitle) },
            { label: "Organisme", value: escapeHtml(params.organizer) },
            ...(eventDay ? [{ label: "Date", value: escapeHtml(eventDay) }] : []),
            ...(eventTime ? [{ label: "Heure", value: escapeHtml(eventTime) }] : []),
            { label: "Montant payé", value: escapeHtml(formatCurrency(params.paidPrice)) },
            { label: "Date d'achat", value: escapeHtml(formatDateTime(params.purchaseDate)) },
            ...(params.contactEmail
              ? [{ label: "Contact", value: `<a href="mailto:${escapeHtml(params.contactEmail)}" style="color:${BRAND.red};text-decoration:underline;">${escapeHtml(params.contactEmail)}</a>` }]
              : []),
          ],
          { title: "Détails de votre réservation" }
        )}
        ${p("Vous retrouvez également ce billet dans votre espace comédien, onglet <strong>Mes Places</strong>.")}
        ${buildButton(`${siteUrl}/comedien`, "Accéder à mon espace")}
      `,
    }),
    text: [
      "Réservation confirmée",
      `Référence / reçu : ${params.receiptReference}`,
      `Opportunité : ${params.opportunityTitle}`,
      `Organisme : ${params.organizer}`,
      eventDay ? `Date : ${eventDay} ${eventTime}`.trim() : "",
      `Montant payé : ${formatCurrency(params.paidPrice)}`,
      params.contactEmail ? `Contact : ${params.contactEmail}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  })
}

export async function sendAdvertiserPurchaseEmail(params: {
  advertiserEmail: string
  advertiserName?: string | null
  opportunityTitle: string
  comedianName: string
  paidPrice: number
  purchaseDate: string
}) {
  const siteUrl = getSiteUrl()

  await sendMail({
    to: params.advertiserEmail,
    subject: `Nouvelle place achetée - ${params.opportunityTitle}`,
    html: buildEmailShell({
      preheader: `${params.comedianName} vient de réserver une place pour « ${params.opportunityTitle} ».`,
      bannerTitle: "Nouvelle vente",
      bannerSubtitle: "Une place vient d'être achetée.",
      heading: "Nouvelle place achetée",
      body: `
        ${p(`Bonjour ${escapeHtml(params.advertiserName || "votre organisme")},`)}
        ${p(`Une place vient d'être achetée par <strong>${escapeHtml(params.comedianName)}</strong>. 🎉`)}
        ${buildInfoCard(
          [
            { label: "Opportunité", value: escapeHtml(params.opportunityTitle) },
            { label: "Comédien", value: escapeHtml(params.comedianName) },
            { label: "Montant", value: escapeHtml(formatCurrency(params.paidPrice)) },
            { label: "Date d'achat", value: escapeHtml(formatDateTime(params.purchaseDate)) },
          ],
          { title: "Détails de la vente" }
        )}
        ${buildButton(`${siteUrl}/annonceur/opportunites`, "Voir mes opportunités")}
      `,
    }),
    text: `Nouvelle place achetée\n${params.opportunityTitle}\n${params.comedianName}\n${formatCurrency(params.paidPrice)}`,
  })
}
