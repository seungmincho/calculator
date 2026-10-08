'use client'

/**
 * 모달 접근성 공통 훅. 패널 요소에는 role="dialog" aria-modal="true" 와
 * aria-labelledby(보이는 제목 id) 또는 aria-label 을 직접 붙인다.
 *
 * - 열리면 패널 안 `[data-autofocus]` → 첫 포커스 요소 → 패널 자체 순으로 포커스를 옮긴다.
 *   React `autoFocus` 는 이 훅보다 먼저 포커스를 가져가 '열기 전 요소'를 잃으므로 모달 안에선 `data-autofocus` 를 쓴다.
 * - Tab/Shift+Tab 은 패널 안에서 순환, Escape 는 onClose.
 * - 닫히면 열기 전에 포커스가 있던 요소로 되돌린다.
 * - 모달이 겹치면 맨 위 것만 키를 처리하고, 컴포넌트가 먼저 preventDefault 한 키는 건너뛴다.
 */

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// 열린 모달 패널 스택 (맨 끝 = 맨 위)
const stack: HTMLElement[] = []

export function useDialog(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  // onClose 가 렌더마다 새 함수여도 effect 를 다시 돌리지 않는다
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    const panel = ref.current
    if (!open || !panel) return
    const prev = document.activeElement as HTMLElement | null
    // 화면에 보이는(display:none 아닌) 포커스 가능 요소만
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0)

    stack.push(panel)
    if (!panel.contains(document.activeElement)) {
      const target = panel.querySelector<HTMLElement>('[data-autofocus]:not([disabled])') ?? focusables()[0]
      if (target) target.focus()
      else { panel.tabIndex = -1; panel.focus() }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || stack[stack.length - 1] !== panel) return
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (!items.length) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      const active = document.activeElement
      if (!panel.contains(active) || (e.shiftKey && active === first) || (!e.shiftKey && active === last)) {
        e.preventDefault()
        if (e.shiftKey) last.focus()
        else first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(panel), 1)
      if (prev?.isConnected) prev.focus()
    }
  }, [open, ref])
}
