import { PDFDocument, degrees } from 'pdf-lib'
import { clonePdfPageCards, normalizePdfRotation, type PdfPageCard } from './pdfEditHistory.ts'

export interface PdfOrganizeSource { arrayBuffer(): Promise<ArrayBuffer> }
export interface PdfOrganizeSnapshot<T extends PdfOrganizeSource = PdfOrganizeSource> { file: T; cards: PdfPageCard[] }
export function snapshotPdfOrganize<T extends PdfOrganizeSource>(file: T, cards: readonly PdfPageCard[]): PdfOrganizeSnapshot<T> {
  return { file, cards: clonePdfPageCards(cards) }
}

/** null means superseded. Checks stop later stages; an already running pdf-lib call is not forcibly stopped. */
export async function createOrganizedPdf(snapshot: PdfOrganizeSnapshot, current: () => boolean = () => true): Promise<Uint8Array | null> {
  if (!current()) return null
  const { file } = snapshot, cards = clonePdfPageCards(snapshot.cards)
  if (!cards.length) throw new RangeError('emptyPages')
  const bytes = await file.arrayBuffer()
  if (!current()) return null
  const source = await PDFDocument.load(bytes, { updateMetadata: false })
  if (!current()) return null
  if (cards.some(card => !Number.isInteger(card.src) || card.src < 0 || card.src >= source.getPageCount() || !Number.isFinite(card.rot) || card.rot % 90 !== 0)) throw new RangeError('invalidPage')
  const output = await PDFDocument.create()
  if (!current()) return null
  const copied = await output.copyPages(source, cards.map(card => card.src))
  if (!current()) return null
  copied.forEach((page, index) => {
    if (cards[index].rot) page.setRotation(degrees(normalizePdfRotation(page.getRotation().angle + cards[index].rot)))
    output.addPage(page)
  })
  const result = await output.save()
  return current() ? result : null
}
