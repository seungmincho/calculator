/** An outdated request must not run a legacy copy after a newer clipboard action. */
let sequence = 0
export async function copyQrText(text: string, current: () => boolean): Promise<boolean | null> {
  const request = ++sequence, valid = () => request === sequence && current()
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return valid() ? true : null } } catch { /* A current request can try the fallback. */ }
  if (!valid()) return null
  let field: HTMLTextAreaElement | undefined
  const active = document.activeElement
  try {
    field = document.createElement('textarea'); field.value = text; field.readOnly = true
    field.style.position = 'fixed'; field.style.left = '-999999px'
    document.body.appendChild(field); field.focus(); field.select(); field.setSelectionRange(0, text.length)
    const copied = document.execCommand('copy') === true
    return valid() ? copied : null
  } catch { return false }
  finally { field?.remove(); try { if (active instanceof HTMLElement) active.focus({ preventScroll: true }) } catch { /* Focus recovery is separate from copy success. */ } }
}
