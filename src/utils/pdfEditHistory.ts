export const PDF_EDIT_HISTORY_LIMIT = 30
/** Metadata only. Original File objects and PDF byte arrays never enter this history. */
export interface PdfPageCard { readonly key: string; readonly src: number; readonly rot: number; readonly w: number; readonly h: number }
export interface PdfPageHistory {
  initial: readonly PdfPageCard[]
  past: readonly (readonly PdfPageCard[])[]
  present: readonly PdfPageCard[]
  future: readonly (readonly PdfPageCard[])[]
}
export type PdfPageEdit =
  | { kind: 'move'; from: number; to: number }
  | { kind: 'rotate'; index: number; degrees: number }
  | { kind: 'rotateAll'; degrees: number }
  | { kind: 'remove'; index: number }
  | { kind: 'reset' }

export const normalizePdfRotation = (angle: number) => ((angle % 360) + 360) % 360
export const clonePdfPageCards = (cards: readonly PdfPageCard[]): PdfPageCard[] => cards.map(({ key, src, rot, w, h }) => ({ key, src, rot, w, h }))
export const samePdfPageCards = (a: readonly PdfPageCard[], b: readonly PdfPageCard[]): boolean => a.length === b.length && a.every((card, index) => {
  const other = b[index]
  return card.key === other.key && card.src === other.src && card.rot === other.rot && card.w === other.w && card.h === other.h
})
export function createPdfPageHistory(cards: readonly PdfPageCard[] = []): PdfPageHistory {
  return { initial: clonePdfPageCards(cards), past: [], present: clonePdfPageCards(cards), future: [] }
}
export function commitPdfPageCards(history: PdfPageHistory, cards: readonly PdfPageCard[]): PdfPageHistory {
  if (samePdfPageCards(history.present, cards)) return history
  return { initial: history.initial, past: [...history.past, history.present].slice(-PDF_EDIT_HISTORY_LIMIT), present: clonePdfPageCards(cards), future: [] }
}
export function editPdfPages(history: PdfPageHistory, action: PdfPageEdit): PdfPageHistory {
  const cards = history.present
  const validIndex = (index: number) => Number.isInteger(index) && index >= 0 && index < cards.length
  if (action.kind === 'reset') return commitPdfPageCards(history, history.initial)
  if (action.kind === 'move') {
    if (!validIndex(action.from) || !validIndex(action.to) || action.from === action.to) return history
    const next = cards.slice(), [card] = next.splice(action.from, 1)
    next.splice(action.to, 0, card)
    return commitPdfPageCards(history, next)
  }
  if (action.kind === 'remove') return validIndex(action.index) ? commitPdfPageCards(history, cards.filter((_, index) => index !== action.index)) : history
  if (!Number.isFinite(action.degrees) || action.degrees % 90 !== 0) return history
  if (action.kind === 'rotate' && !validIndex(action.index)) return history
  return commitPdfPageCards(history, cards.map((card, index) => action.kind === 'rotateAll' || action.index === index ? { ...card, rot: normalizePdfRotation(card.rot + action.degrees) } : card))
}
export function undoPdfPageEdit(history: PdfPageHistory): PdfPageHistory {
  if (!history.past.length) return history
  return { initial: history.initial, past: history.past.slice(0, -1), present: history.past[history.past.length - 1], future: [history.present, ...history.future].slice(0, PDF_EDIT_HISTORY_LIMIT) }
}
export function redoPdfPageEdit(history: PdfPageHistory): PdfPageHistory {
  if (!history.future.length) return history
  return { initial: history.initial, past: [...history.past, history.present].slice(-PDF_EDIT_HISTORY_LIMIT), present: history.future[0], future: history.future.slice(1) }
}

/** Prefer a surviving requested card, then a newly restored card, then any existing card. */
export function pdfPageFocusKey(before: readonly PdfPageCard[], after: readonly PdfPageCard[], preferred?: string): string | null {
  if (preferred && after.some(card => card.key === preferred)) return preferred
  return after.find(card => !before.some(previous => previous.key === card.key))?.key ?? after[0]?.key ?? null
}

export function pdfHistoryShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; isComposing?: boolean; editable?: boolean }): 'undo' | 'redo' | null {
  if (event.editable || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return null
  const key = event.key.toLowerCase()
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo'
  return key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey ? 'redo' : null
}
