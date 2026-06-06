import { sendMail } from "@/app/lib/mailer"
import { calculateRoundedDiscountPercent } from "@/app/lib/pricing"
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

function buildLayout(title: string, content: string): string {
  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;background:#f6f6f6;padding:24px">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px;border:1px solid #e5e7eb">
        <h1 style="font-size:22px;line-height:1.25;margin:0 0 16px;color:#111827">${escapeHtml(title)}</h1>
        ${content}
      </div>
    </div>
  `
}

function buildButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:11px 16px;background:#E63832;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700">${escapeHtml(label)}</a>`
}

function getPersonName(person: { prenom?: string | null; nom?: string | null }, fallback: string): string {
  return [person.prenom, person.nom].filter(Boolean).join(" ").trim() || fallback
}

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

export function buildOpportunityAlertSubject(opportunity: OpportunityEmailData): string {
  const modelLabel = getOpportunityAlertModelLabel(opportunity.modele)
  const typeLabel = getOpportunityAlertTypeLabel(opportunity.type)
  const reduction = typeof opportunity.reduction_pourcentage === "number"
    ? opportunity.reduction_pourcentage
    : typeof opportunity.prix_base === "number" && typeof opportunity.prix_reduit === "number"
      ? calculateRoundedDiscountPercent(opportunity.prix_base, opportunity.prix_reduit)
      : null
  const modelWithDiscount = reduction ? `${modelLabel} à - ${reduction} %` : modelLabel

  return `${modelWithDiscount} / ${typeLabel} / ${opportunity.titre}`
}

export async function notifyAdminAdvertiserPending(advertiser: AdvertiserEmailData) {
  const adminEmail = getAdminNotificationEmail()
  if (!adminEmail) return

  const siteUrl = getSiteUrl()
  const advertiserName = advertiser.nom_formation || advertiser.nom_entreprise || advertiser.email
  const adminUrl = `${siteUrl}/admin/annonceurs/${advertiser.id}`

  await sendMail({
    to: adminEmail,
    subject: `Annonceur en attente de validation - ${advertiserName}`,
    html: buildLayout(
      "Annonceur en attente de validation",
      `
        <p>Un annonceur vient de confirmer son adresse email et attend une validation admin.</p>
        <p><strong>Annonceur :</strong> ${escapeHtml(advertiserName)}</p>
        <p><strong>Email :</strong> ${escapeHtml(advertiser.email)}</p>
        <p style="margin-top:20px">${buildButton(adminUrl, "Voir l'annonceur")}</p>
      `
    ),
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
    html: buildLayout(
      "Opportunité en attente de validation",
      `
        <p>Une nouvelle opportunité attend une validation admin.</p>
        <p><strong>Titre :</strong> ${escapeHtml(opportunity.titre)}</p>
        <p><strong>Type :</strong> ${escapeHtml(OPPORTUNITY_TYPE_LABELS[opportunity.type])}</p>
        <p><strong>Modèle :</strong> ${escapeHtml(OPPORTUNITY_MODEL_LABELS[opportunity.modele])}</p>
        <p style="margin-top:20px">${buildButton(adminUrl, "Voir l'opportunité")}</p>
      `
    ),
    text: `Opportunité en attente de validation\n${opportunity.titre}\n${adminUrl}`,
  })
}

export async function sendAdvertiserWelcomeEmail(advertiser: AdvertiserEmailData) {
  const siteUrl = getSiteUrl()
  const advertiserName = advertiser.nom_formation || advertiser.nom_entreprise || "votre organisme"

  await sendMail({
    to: advertiser.email,
    subject: "Bienvenue sur formations-artistiques.fr",
    html: buildLayout(
      "Bienvenue sur formations-artistiques.fr",
      `
        <p>Bonjour ${escapeHtml(advertiserName)},</p>
        <p>Votre adresse email est confirmée. Votre compte annonceur est maintenant en attente de validation par notre équipe.</p>
        <p style="margin-top:20px">${buildButton(siteUrl, "Accéder au site")}</p>
      `
    ),
    text: `Bienvenue sur formations-artistiques.fr\nVotre compte annonceur est en attente de validation.\n${siteUrl}`,
  })
}

export async function sendComedianWelcomeEmail(comedian: ComedianEmailData) {
  const siteUrl = getSiteUrl()
  const name = getPersonName(comedian, "et bienvenue")

  await sendMail({
    to: comedian.email,
    subject: "Bienvenue sur formations-artistiques.fr",
    html: buildLayout(
      "Bienvenue sur formations-artistiques.fr",
      `
        <p>Bonjour ${escapeHtml(name)},</p>
        <p>Votre adresse email est confirmée. Vous pouvez maintenant accéder à votre espace comédien.</p>
        <p style="margin-top:20px">${buildButton(siteUrl, "Accéder au site")}</p>
      `
    ),
    text: `Bienvenue sur formations-artistiques.fr\nVotre compte comédien est actif.\n${siteUrl}`,
  })
}

export async function sendSignupConfirmationEmail(data: SignupConfirmationEmailData) {
  await sendMail({
    to: data.email,
    subject: "Confirmez votre inscription - formations-artistiques.fr",
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmez votre inscription - formations-artistiques.fr</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f2f2f2;">
          <tr>
            <td align="center" style="padding:28px 14px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background-color:#ffffff;">
                <tr>
                  <td style="padding:28px 32px 24px;background-color:#ffffff;">
                    <img src="https://formations-artistiques.fr/email-assets/logoApp.png" alt="formations-artistiques.fr" width="260" style="display:block;width:260px;max-width:260px;height:auto;border:0;">
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;">
                      <tr>
                        <td style="background-color:#ffffff;">
                          <img src="https://formations-artistiques.fr/email-assets/mainImg.webp" alt="formations artistiques" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;">
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:18px 22px;background-color:#E63832;">
                          <p style="margin:0;color:#ffffff;font-size:18px;line-height:24px;font-weight:800;">Inscription réussie</p>
                          <p style="margin:5px 0 0;color:#ffffff;font-size:14px;line-height:20px;">Votre espace formations-artistiques.fr vous attend.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:44px 54px 20px;background-color:#ffffff;">
                    <h1 style="margin:0 0 22px;color:#1f2937;font-size:30px;line-height:38px;font-weight:700;">Bienvenue sur formations-artistiques.fr,</h1>
                    <p style="margin:0 0 18px;color:#111827;font-size:16px;line-height:25px;">Votre compte vient d'être créé avec succès. Il ne reste qu'une dernière étape pour accéder à votre espace : confirmer votre adresse e-mail.</p>
                    <p style="margin:0 0 26px;color:#111827;font-size:16px;line-height:25px;">Cliquez sur le bouton ci-dessous pour finaliser votre inscription et rejoindre la plateforme.</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius:6px;background-color:#E63832;">
                          <a href="${escapeHtml(data.confirmationUrl)}" style="display:inline-block;padding:15px 26px;color:#ffffff;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;border-radius:6px;">Confirmer mon adresse e-mail</a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:28px 0 10px;color:#6b7280;font-size:13px;line-height:20px;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
                    <p style="margin:0;word-break:break-all;color:#E63832;font-size:13px;line-height:20px;">
                      <a href="${escapeHtml(data.confirmationUrl)}" style="color:#E63832;text-decoration:underline;">${escapeHtml(data.confirmationUrl)}</a>
                    </p>
                    <p style="margin:28px 0 0;color:#6b7280;font-size:14px;line-height:22px;">Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail.</p>
                    <p style="margin:24px 0 0;color:#6b7280;font-size:15px;line-height:24px;">À très vite,<br><span style="color:#111827;">L'équipe formations-artistiques.fr</span></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 54px;background-color:#E63832;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td valign="top" style="color:#ffffff;font-size:12px;line-height:17px;font-weight:600;">formations-artistiques.fr<br>Plateforme dédiée aux opportunités<br>pour comédiens et annonceurs</td>
                        <td valign="top" align="right" style="color:#ffffff;font-size:12px;line-height:17px;">
                          <a href="mailto:support@formations-artistiques.fr" style="color:#ffffff;text-decoration:none;">support@formations-artistiques.fr</a><br>
                          <a href="https://formations-artistiques.fr" style="color:#ffffff;text-decoration:none;">formations-artistiques.fr</a>
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
      </html>
    `,
    text: [
      "Bienvenue sur formations-artistiques.fr",
      "Confirmez votre adresse e-mail pour finaliser votre inscription.",
      data.confirmationUrl,
    ].join("\n"),
  })
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData) {
  await sendMail({
    to: data.email,
    subject: "Réinitialisez votre mot de passe - formations-artistiques.fr",
    html: buildLayout(
      "Réinitialisation de mot de passe",
      `
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.</p>
        <p style="margin-top:20px">${buildButton(data.resetUrl, "Réinitialiser mon mot de passe")}</p>
        <p style="margin:28px 0 10px;color:#6b7280;font-size:13px">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
        <p style="margin:0;word-break:break-all;font-size:13px"><a href="${escapeHtml(data.resetUrl)}" style="color:#E63832">${escapeHtml(data.resetUrl)}</a></p>
        <p style="margin-top:24px;color:#6b7280">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
      `
    ),
    text: [
      "Réinitialisation de mot de passe",
      "Cliquez sur ce lien pour créer un nouveau mot de passe :",
      data.resetUrl,
    ].join("\n"),
  })
}

export async function sendAdvertiserValidatedEmail(advertiser: AdvertiserEmailData) {
  const siteUrl = getSiteUrl()
  const advertiserName = advertiser.nom_formation || advertiser.nom_entreprise || "votre organisme"

  await sendMail({
    to: advertiser.email,
    subject: "Votre compte annonceur a été validé",
    html: buildLayout(
      "Votre compte annonceur a été validé",
      `
        <p>Bonjour ${escapeHtml(advertiserName)},</p>
        <p>Votre compte annonceur a été validé par notre équipe. Vous pouvez publier et gérer vos opportunités.</p>
        <p style="margin-top:20px">${buildButton(`${siteUrl}/annonceur`, "Accéder à mon espace")}</p>
      `
    ),
    text: `Votre compte annonceur a été validé.\n${siteUrl}/annonceur`,
  })
}

export async function sendOpportunityAlertEmail(to: string, opportunity: OpportunityEmailData) {
  const siteUrl = getSiteUrl()
  const opportunityUrl = `${siteUrl}/dashboard/opportunites/${opportunity.id}`
  const subject = buildOpportunityAlertSubject(opportunity)
  const dateLabel = formatDateTime(opportunity.date_evenement)

  await sendMail({
    to,
    subject,
    html: buildLayout(
      subject,
      `
        <p>Une opportunité correspondant à vos alertes vient d'être publiée.</p>
        <p><strong>Organisme :</strong> ${escapeHtml(opportunity.annonceurNom || "Organisme")}</p>
        ${dateLabel ? `<p><strong>Date :</strong> ${escapeHtml(dateLabel)}</p>` : ""}
        <p><strong>Prix :</strong> ${escapeHtml(formatCurrency(opportunity.prix_reduit))}${opportunity.prix_base ? ` au lieu de ${escapeHtml(formatCurrency(opportunity.prix_base))}` : ""}</p>
        <p style="margin-top:20px">${buildButton(opportunityUrl, "Voir l'opportunité")}</p>
      `
    ),
    text: `${subject}\n${opportunityUrl}`,
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
    html: buildLayout(
      "Nouvelle place achetée",
      `
        <p>Bonjour ${escapeHtml(params.advertiserName || "votre organisme")},</p>
        <p>Une place vient d'être achetée par <strong>${escapeHtml(params.comedianName)}</strong>.</p>
        <p><strong>Opportunité :</strong> ${escapeHtml(params.opportunityTitle)}</p>
        <p><strong>Montant :</strong> ${escapeHtml(formatCurrency(params.paidPrice))}</p>
        <p><strong>Date d'achat :</strong> ${escapeHtml(formatDateTime(params.purchaseDate))}</p>
        <p style="margin-top:20px">${buildButton(`${siteUrl}/annonceur/opportunites`, "Voir mes opportunités")}</p>
      `
    ),
    text: `Nouvelle place achetée\n${params.opportunityTitle}\n${params.comedianName}\n${formatCurrency(params.paidPrice)}`,
  })
}
