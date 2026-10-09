'use client'

/**
 * 전체화면(고정 오버레이) 모드 공통 키 처리.
 * - Escape 로 빠져나온다. 다만 안쪽 요소가 먼저 처리한(preventDefault·stopPropagation) Escape,
 *   한글 조합 중 Escape, `data-keep-escape` 를 단 요소(Escape 를 자기 기능에 쓰는 편집기) 안의 Escape 는 건너뛴다.
 *   window 버블 단계에서 듣기 때문에 useDialog 모달(document)이 먼저 받는다.
 * - 빠져나오면(버튼·Escape 어느 쪽이든) 토글 버튼으로 포커스를 돌려준다.
 */

import { useEffect, useRef, type RefObject } from 'react'

export function useFullscreenEscape(active: boolean, exit: () => void, toggleRef: RefObject<HTMLElement | null>) {
  const exitRef = useRef(exit)
  useEffect(() => { exitRef.current = exit })
  const wasActive = useRef(false)

  useEffect(() => {
    if (!active) {
      if (wasActive.current) toggleRef.current?.focus()
      wasActive.current = false
      return
    }
    wasActive.current = true
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing || e.keyCode === 229) return
      if (e.target instanceof Element && e.target.closest('[data-keep-escape]')) return
      e.preventDefault()
      exitRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, toggleRef])
}
