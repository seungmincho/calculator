export type MarkdownCopyTarget = 'md' | 'html' | 'rich'
export type MarkdownCopyOutcome = 'copied' | 'failed' | 'stale'
export interface MarkdownCopySnapshot { markdown: string; html: string }
export interface MarkdownClipboardPorts {
  writeText?: (text: string) => Promise<void>
  writeRich?: (html: string, plainText: string) => Promise<void>
  fallbackText: (text: string) => boolean
  fallbackRich: (html: string) => boolean
}

type ActionToken = { channel: 'copy' | 'read'; revision: number; request: number }

/** Clipboard is one shared resource; text and image readers also share one document. */
export function createMarkdownActionGuard() {
  let revision = 0, copyRequest = 0, readRequest = 0
  return {
    beginCopy(): ActionToken { return { channel: 'copy', revision, request: ++copyRequest } },
    beginRead(): ActionToken { return { channel: 'read', revision, request: ++readRequest } },
    isCurrent(token: ActionToken): boolean {
      return token.revision === revision && token.request === (token.channel === 'copy' ? copyRequest : readRequest)
    },
    invalidateDocument(): void { revision++ },
    invalidateReads(): void { readRequest++ },
  }
}

/** Rich copy never silently becomes plain-text success. Stale requests cannot start a fallback. */
export async function copyMarkdownContent(
  snapshot: MarkdownCopySnapshot,
  target: MarkdownCopyTarget,
  ports: MarkdownClipboardPorts,
  isCurrent: () => boolean = () => true,
): Promise<MarkdownCopyOutcome> {
  if (!isCurrent()) return 'stale'
  const { markdown, html } = snapshot
  const text = target === 'html' ? html : markdown
  try {
    if (target === 'rich' ? ports.writeRich : ports.writeText) {
      if (target === 'rich') await ports.writeRich!(html, markdown)
      else await ports.writeText!(text)
      return isCurrent() ? 'copied' : 'stale'
    }
  } catch { /* Only the latest request may try its matching legacy copy. */ }
  if (!isCurrent()) return 'stale'
  try {
    const copied = target === 'rich' ? ports.fallbackRich(html) : ports.fallbackText(text)
    return isCurrent() ? copied === true ? 'copied' : 'failed' : 'stale'
  } catch { return isCurrent() ? 'failed' : 'stale' }
}

export const MARKDOWN_TEXT_FILE_LIMIT = 1024 * 1024
export type MarkdownFileError = 'type' | 'size' | 'read'
export type MarkdownFileOutcome = { status: 'ready'; text: string } | { status: 'failed'; error: MarkdownFileError } | { status: 'stale' }
export interface MarkdownTextFile { name: string; size: number }

/** Validate metadata before allocating/reading; an empty text file is a valid explicit input. */
export async function readMarkdownTextFile(
  file: MarkdownTextFile,
  read: () => Promise<unknown>,
  isCurrent: () => boolean = () => true,
): Promise<MarkdownFileOutcome> {
  if (!isCurrent()) return { status: 'stale' }
  if (!file || typeof file.name !== 'string' || !/\.(md|markdown|txt)$/i.test(file.name)) return { status: 'failed', error: 'type' }
  if (!Number.isInteger(file.size) || file.size < 0 || file.size > MARKDOWN_TEXT_FILE_LIMIT) return { status: 'failed', error: 'size' }
  try {
    const text = await read()
    if (!isCurrent()) return { status: 'stale' }
    return typeof text === 'string' ? { status: 'ready', text } : { status: 'failed', error: 'read' }
  } catch { return isCurrent() ? { status: 'failed', error: 'read' } : { status: 'stale' } }
}
