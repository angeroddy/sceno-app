import nodemailer from "nodemailer"

type MailOptions = {
  to: string
  subject: string
  html: string
  text?: string
}

const smtpHost = process.env.SMTP_HOST
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM || "Scenio <no-reply@scenio.local>"

export async function sendMail({ to, subject, html, text }: MailOptions) {
  if (!smtpHost || !smtpPort) {
    throw new Error("SMTP not configured: set SMTP_HOST and SMTP_PORT")
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false,
    auth: smtpUser || smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  })

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    html,
    text,
  })
}
