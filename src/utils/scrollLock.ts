type ScrollSnapshot = {
  x: number
  y: number
  pathname: string
  bodyOverflow: string
  htmlOverflow: string
}

let lockCount = 0
let snapshot: ScrollSnapshot | null = null

function preventBackgroundTouch(event: TouchEvent) {
  const target = event.target
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
  if (!element?.closest('[data-scroll-lock-scrollable]')) event.preventDefault()
}

/** Share one page lock across overlays and restore the original scroll position once. */
export function lockPageScroll(): () => void {
  if (typeof window === 'undefined') return () => {}

  if (lockCount === 0) {
    const body = document.body
    const html = document.documentElement
    const x = window.scrollX
    const y = window.scrollY
    snapshot = {
      x, y, pathname: window.location.pathname,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    }
    body.style.overflow = 'hidden'
    html.style.overflow = 'hidden'
    document.addEventListener('touchmove', preventBackgroundTouch, { passive: false })
  }
  lockCount += 1

  let released = false
  return () => {
    if (released) return
    released = true
    lockCount -= 1
    if (lockCount !== 0 || !snapshot) return

    const saved = snapshot
    snapshot = null
    document.removeEventListener('touchmove', preventBackgroundTouch)
    const body = document.body
    body.style.overflow = saved.bodyOverflow
    document.documentElement.style.overflow = saved.htmlOverflow
    if (window.location.pathname === saved.pathname) {
      window.scrollTo(saved.x, saved.y)
    }
  }
}
