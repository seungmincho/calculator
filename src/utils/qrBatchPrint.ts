import { parseQrBatch, type QrBatchImage } from './qrBatch'

export const QR_BATCH_PRINT_PER_PAGE = 6
export const QR_BATCH_PRINT_LABEL_LIMIT = 48
const MAX_IMAGE_URL_LENGTH = 1_400_000
const knownPlans = new WeakSet<object>()

export interface QrBatchPrintCell {
  readonly line: number
  readonly label: string
  readonly shortened: boolean
  readonly dataUrl: string
}
export interface QrBatchPrintPlan {
  readonly pages: readonly (readonly QrBatchPrintCell[])[]
  readonly count: number
  readonly shortened: number
}
export interface QrBatchPrintLabels {
  title: string
  row: (line: number) => string
  page: (page: number, total: number) => string
}

/** Capture the complete current result. Payloads are deliberately absent from the print document. */
export function createQrBatchPrintPlan(input: string, images: readonly QrBatchImage[]): QrBatchPrintPlan | null {
  const parsed = parseQrBatch(input)
  if (!parsed.valid || images.length !== parsed.rows.length) return null
  const cells: QrBatchPrintCell[] = []
  for (const [index, row] of parsed.rows.entries()) {
    const image = images[index]
    if (!image || !image.row || image.row.line !== row.line || image.row.label !== row.label ||
      image.row.payload !== row.payload || image.row.bytes !== row.bytes || image.row.filename !== row.filename || image.row.error ||
      typeof image.dataUrl !== 'string' || image.dataUrl.length > MAX_IMAGE_URL_LENGTH ||
      !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(image.dataUrl)) return null
    const characters = Array.from(row.label)
    const shortened = characters.length > QR_BATCH_PRINT_LABEL_LIMIT
    cells.push(Object.freeze({ line: row.line, label: characters.slice(0, QR_BATCH_PRINT_LABEL_LIMIT).join(''), shortened, dataUrl: image.dataUrl }))
  }
  const pages = []
  for (let index = 0; index < cells.length; index += QR_BATCH_PRINT_PER_PAGE) {
    pages.push(Object.freeze(cells.slice(index, index + QR_BATCH_PRINT_PER_PAGE)))
  }
  const plan = Object.freeze({ pages: Object.freeze(pages), count: cells.length, shortened: cells.filter(cell => cell.shortened).length })
  knownPlans.add(plan)
  return plan
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

/** A standalone A4 document: no site chrome, external resources, or raw QR contents. */
export function qrBatchPrintHtml(plan: QrBatchPrintPlan, labels: QrBatchPrintLabels, locale: string): string {
  if (!knownPlans.has(plan)) throw new Error('Invalid QR print plan')
  const pages = plan.pages.map((cells, index) => `<section class="sheet" data-qr-page="${index + 1}"><main>${cells.map(cell =>
    `<figure data-qr-line="${cell.line}"><img src="${cell.dataUrl}" width="512" height="512" alt=""/><figcaption><span class="row">${escapeHtml(labels.row(cell.line))}</span>${cell.label ? `<span class="name">${escapeHtml(cell.label)}${cell.shortened ? '…' : ''}</span>` : ''}</figcaption></figure>`,
  ).join('')}</main><footer>${escapeHtml(labels.page(index + 1, plan.pages.length))}</footer></section>`).join('')
  return `<!doctype html><html lang="${locale === 'en' ? 'en' : 'ko'}"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>${escapeHtml(labels.title)}</title><style>
@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;padding:0;color:#000;background:#fff;font-family:system-ui,sans-serif}
.sheet{width:186mm;height:272mm;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}
main{display:grid;grid-template-columns:repeat(2,90mm);grid-template-rows:repeat(3,86mm);gap:3mm 6mm}
figure{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:1mm;break-inside:avoid;padding:1mm}
img{display:block;width:65mm;height:65mm;flex:none;image-rendering:auto}figcaption{width:86mm;text-align:center;font-size:9pt;line-height:1.15;overflow-wrap:anywhere;white-space:pre-wrap}
.row{display:block;font-size:8pt;color:#444}.name{display:block}footer{height:6mm;padding-top:2mm;text-align:center;font-size:8pt;color:#444}
</style></head><body data-qr-batch-print-document>${pages}</body></html>`
}
