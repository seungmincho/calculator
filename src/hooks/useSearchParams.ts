'use client'

/**
 * next/navigation의 useSearchParams 대체.
 *
 * 이유: static export(output:'export')에서 next의 useSearchParams()는 프리렌더 시
 * 가장 가까운 <Suspense>까지 BAILOUT_TO_CLIENT_SIDE_RENDERING을 일으켜
 * 도구 본문이 정적 HTML에서 통째로 빠짐 (Google 색인 불가).
 *
 * 동작: 서버 = 빈 params(기본값으로 정적 렌더), 클라이언트 = window.location.search.
 * router.push/replace·뒤로가기 시 갱신됨 (history 패치 + popstate).
 *
 * ponytail: 쿼리가 있는 공유 링크는 첫 렌더에서 hydration mismatch → React가
 * 페이지의 <Suspense> 경계만 클라이언트 재렌더. 결과는 정상, 콘솔 경고 1건.
 */

import { useMemo, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
// Next 라우터는 useInsertionEffect 안에서 pushState/replaceState를 호출 → 동기 알림 시
// "useInsertionEffect must not schedule updates" 경고. 마이크로태스크로 미룬다.
const notify = () => queueMicrotask(() => listeners.forEach((l) => l()))

if (typeof window !== 'undefined' && !(window as unknown as { __spPatched?: boolean }).__spPatched) {
  ;(window as unknown as { __spPatched?: boolean }).__spPatched = true
  for (const m of ['pushState', 'replaceState'] as const) {
    const orig = history[m]
    history[m] = function (this: History, ...args: Parameters<History['pushState']>) {
      const r = orig.apply(this, args)
      notify()
      return r
    }
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('popstate', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('popstate', cb)
  }
}

const getSnapshot = () => window.location.search
const getServerSnapshot = () => (typeof window === 'undefined' ? '' : window.location.search)

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return useMemo(() => new URLSearchParams(search), [search])
}
