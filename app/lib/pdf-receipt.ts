import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from 'pdf-lib'

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const BG = rgb(0.07, 0.07, 0.07)
const WHITE = rgb(1, 1, 1)
const TEXT_DARK = rgb(0.13, 0.13, 0.13)
const TEXT_GRAY = rgb(0.4, 0.4, 0.4)
const CYAN = rgb(0.09, 0.71, 0.92)
const BORDER = rgb(0.86, 0.86, 0.86)
const HERO_FALLBACK_TOP = rgb(0.9, 0.84, 0.78)
const HERO_FALLBACK_BOTTOM = rgb(0.96, 0.94, 0.91)

function toAscii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
}

function topY(topOffset: number, height = 0) {
  return PAGE_HEIGHT - topOffset - height
}

function fitText(value: string, font: PDFFont, size: number, maxWidth: number) {
  const safeValue = toAscii(value)
  if (font.widthOfTextAtSize(safeValue, size) <= maxWidth) {
    return safeValue
  }

  let current = safeValue
  while (current.length > 1 && font.widthOfTextAtSize(`${current}...`, size) > maxWidth) {
    current = current.slice(0, -1)
  }

  return `${current.trimEnd()}...`
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number, maxLines = 3) {
  const words = toAscii(value).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }

    if (current) {
      lines.push(current)
    }
    current = word
  }

  if (current) {
    lines.push(current)
  }

  if (lines.length <= maxLines) {
    return lines
  }

  return [
    ...lines.slice(0, maxLines - 1),
    fitText(lines.slice(maxLines - 1).join(' '), font, size, maxWidth),
  ]
}

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)
  const right = x + width
  const top = y + height

  return [
    `M ${x + r} ${y}`,
    `L ${right - r} ${y}`,
    `Q ${right} ${y} ${right} ${y + r}`,
    `L ${right} ${top - r}`,
    `Q ${right} ${top} ${right - r} ${top}`,
    `L ${x + r} ${top}`,
    `Q ${x} ${top} ${x} ${top - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ')
}

async function fetchImageBuffer(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

async function normalizeImageToPng(bytes: Buffer | null) {
  if (!bytes || bytes.length < 4) {
    return null
  }

  try {
    return await sharp(bytes)
      .png()
      .toBuffer()
  } catch {
    return null
  }
}

async function embedImage(pdfDoc: PDFDocument, bytes: Buffer | null) {
  const pngBuffer = await normalizeImageToPng(bytes)
  if (!pngBuffer) {
    return null
  }

  return pdfDoc.embedPng(pngBuffer)
}

function drawCoverImage(page: PDFPage, image: PDFImage, x: number, y: number, width: number, height: number) {
  const scaled = image.scale(1)
  const imageRatio = scaled.width / scaled.height
  const frameRatio = width / height

  let drawWidth = width
  let drawHeight = height
  let drawX = x
  let drawY = y

  if (imageRatio > frameRatio) {
    drawHeight = height
    drawWidth = height * imageRatio
    drawX = x - (drawWidth - width) / 2
  } else {
    drawWidth = width
    drawHeight = width / imageRatio
    drawY = y - (drawHeight - height) / 2
  }

  page.drawImage(image, {
    x: drawX,
    y: drawY,
    width: drawWidth,
    height: drawHeight,
  })
}

function drawDivider(page: PDFPage, x: number, topOffset: number, width: number) {
  const y = topY(topOffset)
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 1.6,
    color: BORDER,
    dashArray: [5, 5],
  })

  page.drawCircle({
    x: x - 16,
    y,
    size: 11,
    color: BG,
  })

  page.drawCircle({
    x: x + width + 16,
    y,
    size: 11,
    color: BG,
  })
}

function drawLabelValueRow(
  page: PDFPage,
  regularFont: PDFFont,
  boldFont: PDFFont,
  label: string,
  value: string,
  x: number,
  topOffset: number,
  width: number,
) {
  const y = topY(topOffset)
  page.drawText(toAscii(label), {
    x,
    y,
    size: 11,
    font: regularFont,
    color: TEXT_GRAY,
  })

  const safeValue = fitText(value, boldFont, 11, width * 0.56)
  const valueWidth = boldFont.widthOfTextAtSize(safeValue, 11)
  page.drawText(safeValue, {
    x: x + width - valueWidth,
    y,
    size: 11,
    font: boldFont,
    color: TEXT_DARK,
  })
}

export function formatReceiptReference(achatId: string) {
  return `SCN-${achatId.replace(/-/g, '').slice(0, 12).toUpperCase()}`
}

export async function buildReceiptPdf(params: {
  receiptReference: string
  comedianName: string
  comedianEmail: string
  opportunityTitle: string
  organizer: string
  eventDate: string
  purchaseDate: string
  amount: string
  status: string
  contactEmail: string
  eventImageUrl?: string | null
}) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const logoBytes = await readFile(path.join(process.cwd(), 'app/assets/images/logoApp2.png'))
  const logoImage = await embedImage(pdfDoc, logoBytes)
  const eventImage = await embedImage(
    pdfDoc,
    params.eventImageUrl ? await fetchImageBuffer(params.eventImageUrl) : null,
  )

  const ticketX = 58
  const ticketWidth = 478
  const mainTop = 42
  const heroHeight = 226
  const mainHeight = 518
  const stubTop = 576
  const stubHeight = 92
  const innerX = ticketX + 28
  const innerWidth = ticketWidth - 56
  const mainY = topY(mainTop, mainHeight)
  const bodyHeight = mainHeight - heroHeight
  const bodyY = mainY
  const stubY = topY(stubTop, stubHeight)
  const contentTop = mainTop + heroHeight + 22

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: BG,
  })

  // Main ticket body. Use solid rectangles for readability; SVG paths were unreliable on large fills.
  page.drawRectangle({
    x: ticketX,
    y: bodyY,
    width: ticketWidth,
    height: bodyHeight,
    color: WHITE,
  })

  const heroY = topY(mainTop, heroHeight)
  if (eventImage) {
    drawCoverImage(page, eventImage, ticketX, heroY, ticketWidth, heroHeight)
  } else {
    page.drawRectangle({
      x: ticketX,
      y: heroY,
      width: ticketWidth,
      height: heroHeight,
      color: HERO_FALLBACK_TOP,
    })
    page.drawRectangle({
      x: ticketX,
      y: heroY,
      width: ticketWidth,
      height: heroHeight * 0.4,
      color: HERO_FALLBACK_BOTTOM,
    })
    page.drawText('IMAGE EVENEMENT', {
      x: ticketX + 102,
      y: heroY + 82,
      size: 18,
      font: boldFont,
      color: TEXT_GRAY,
    })
  }

  page.drawRectangle({
    x: ticketX,
    y: heroY,
    width: ticketWidth,
    height: heroHeight,
    color: rgb(0, 0, 0),
    opacity: 0.24,
  })

  page.drawSvgPath(roundedRectPath(ticketX + 18, topY(mainTop + 18, 28), 116, 28, 14), {
    color: rgb(0.06, 0.06, 0.06),
    opacity: 0.66,
  })
  page.drawText('TICKET SCENIO', {
    x: ticketX + 30,
    y: topY(mainTop + 26, 10),
    size: 10,
    font: boldFont,
    color: CYAN,
  })

  page.drawSvgPath(roundedRectPath(ticketX + ticketWidth - 150, topY(mainTop + 16, 40), 120, 40, 14), {
    color: rgb(0.06, 0.06, 0.06),
    opacity: 0.72,
  })
  if (logoImage) {
    const logoDims = logoImage.scale(0.23)
    page.drawImage(logoImage, {
      x: ticketX + ticketWidth - 136,
      y: topY(mainTop + 27, logoDims.height),
      width: logoDims.width,
      height: logoDims.height,
    })
  }

  const organizerText = fitText(params.organizer.toUpperCase(), regularFont, 10, 320)
  const titleLines = wrapText(params.opportunityTitle.toUpperCase(), boldFont, 19, 360, 2)
  page.drawText(organizerText, {
    x: ticketX + 24,
    y: topY(mainTop + 136, 10),
    size: 10,
    font: regularFont,
    color: rgb(1, 1, 1),
  })

  titleLines.forEach((line, index) => {
    page.drawText(line, {
      x: ticketX + 24,
      y: topY(mainTop + 154 + index * 22, 19),
      size: 19,
      font: boldFont,
      color: rgb(1, 1, 1),
    })
  })

  page.drawSvgPath(roundedRectPath(ticketX + ticketWidth - 118, topY(mainTop + 152, 24), 92, 24, 12), {
    color: params.status === 'Confirmee' ? CYAN : rgb(0.43, 0.43, 0.43),
  })
  page.drawText(toAscii(params.status.toUpperCase()), {
    x: ticketX + ticketWidth - 103,
    y: topY(mainTop + 159, 8),
    size: 8,
    font: boldFont,
    color: WHITE,
  })

  page.drawText(`Ticket ID: ${toAscii(params.receiptReference)}`, {
    x: ticketX + 147,
    y: topY(contentTop + 2, 12),
    size: 12,
    font: boldFont,
    color: TEXT_DARK,
  })

  page.drawText(`Recu du ${toAscii(params.purchaseDate)}`, {
    x: ticketX + 152,
    y: topY(contentTop + 24, 11),
    size: 11,
    font: regularFont,
    color: TEXT_GRAY,
  })

  drawDivider(page, innerX, contentTop + 56, innerWidth)

  const comedianName = params.comedianName || 'Comedien'
  page.drawText(`Nom: ${fitText(comedianName, regularFont, 12, innerWidth)}`, {
    x: ticketX + 80,
    y: topY(contentTop + 82, 12),
    size: 12,
    font: regularFont,
    color: TEXT_DARK,
  })

  page.drawText(`Email: ${fitText(params.comedianEmail, regularFont, 12, innerWidth)}`, {
    x: ticketX + 72,
    y: topY(contentTop + 102, 12),
    size: 12,
    font: regularFont,
    color: TEXT_DARK,
  })

  drawLabelValueRow(page, regularFont, boldFont, 'Date', params.eventDate.split(' ')[0], innerX, contentTop + 144, innerWidth)
  drawLabelValueRow(page, regularFont, boldFont, 'Heure', params.eventDate.split(' ').slice(1).join(' ') || params.eventDate, innerX, contentTop + 170, innerWidth)
  drawLabelValueRow(page, regularFont, boldFont, 'Organisateur', params.organizer, innerX, contentTop + 196, innerWidth)
  drawLabelValueRow(page, regularFont, boldFont, 'Contact', params.contactEmail, innerX, contentTop + 222, innerWidth)

  drawDivider(page, innerX, contentTop + 256, innerWidth)

  const amountLabel = 'Montant total'
  const amountWidth = boldFont.widthOfTextAtSize(toAscii(params.amount), 28)
  const labelWidth = regularFont.widthOfTextAtSize(amountLabel, 12)
  const totalRowX = ticketX + (ticketWidth - (labelWidth + amountWidth + 18)) / 2

  page.drawText(amountLabel, {
    x: totalRowX,
    y: topY(contentTop + 290, 12),
    size: 12,
    font: regularFont,
    color: TEXT_GRAY,
  })
  page.drawText(toAscii(params.amount), {
    x: totalRowX + labelWidth + 18,
    y: topY(contentTop + 280, 28),
    size: 28,
    font: boldFont,
    color: TEXT_DARK,
  })

  page.drawRectangle({
    x: ticketX,
    y: stubY,
    width: ticketWidth,
    height: stubHeight,
    color: WHITE,
  })

  page.drawCircle({
    x: ticketX,
    y: stubY + stubHeight / 2,
    size: 8,
    color: BG,
  })
  page.drawCircle({
    x: ticketX + ticketWidth,
    y: stubY + stubHeight / 2,
    size: 8,
    color: BG,
  })

  const thumbX = ticketX + 22
  const thumbY = topY(stubTop + 14, 52)
  if (eventImage) {
    drawCoverImage(page, eventImage, thumbX, thumbY, 52, 52)
  } else {
    page.drawRectangle({
      x: thumbX,
      y: thumbY,
      width: 52,
      height: 52,
      color: HERO_FALLBACK_TOP,
    })
  }

  page.drawLine({
    start: { x: ticketX + 88, y: stubY + 16 },
    end: { x: ticketX + 88, y: stubY + stubHeight - 16 },
    thickness: 1,
    color: BORDER,
    dashArray: [4, 4],
  })

  page.drawText(fitText(params.opportunityTitle, boldFont, 13, 280), {
    x: ticketX + 102,
    y: topY(stubTop + 18, 13),
    size: 13,
    font: boldFont,
    color: CYAN,
  })
  page.drawText(`Ticket ID: ${toAscii(params.receiptReference)}`, {
    x: ticketX + 102,
    y: topY(stubTop + 36, 10),
    size: 10,
    font: regularFont,
    color: TEXT_DARK,
  })
  page.drawText(fitText(params.organizer, regularFont, 10, 250), {
    x: ticketX + 102,
    y: topY(stubTop + 50, 10),
    size: 10,
    font: regularFont,
    color: TEXT_DARK,
  })
  page.drawText(fitText(params.eventDate, regularFont, 9, 190), {
    x: ticketX + 102,
    y: topY(stubTop + 66, 9),
    size: 9,
    font: regularFont,
    color: TEXT_DARK,
  })
  const stubAmount = fitText(params.amount, regularFont, 9, 70)
  page.drawText(stubAmount, {
    x: ticketX + ticketWidth - 76,
    y: topY(stubTop + 66, 9),
    size: 9,
    font: regularFont,
    color: TEXT_DARK,
  })

  page.drawText('Scenio', {
    x: 52,
    y: 44,
    size: 10,
    font: boldFont,
    color: rgb(0.72, 0.72, 0.72),
  })
  page.drawText(`Recu genere pour ${toAscii(params.receiptReference)}`, {
    x: 52,
    y: 30,
    size: 10,
    font: regularFont,
    color: rgb(0.72, 0.72, 0.72),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
