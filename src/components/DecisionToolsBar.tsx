import Link from 'next/link'
import { decisionTools } from '@/config/decisionTools'

/** 랜덤·결정 도구 패밀리 공통 전환 바 (각 도구는 자기 URL) */
export default function DecisionToolsBar({ current }: { current: string }) {
  return (
    <nav aria-label="랜덤·결정 도구" className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
      <ul className="flex gap-1.5 w-max">
        {decisionTools.map(d => {
          const active = d.href === current
          return (
            <li key={d.href}>
              <Link prefetch={false}
                href={d.href}
                aria-current={active ? 'page' : undefined}
                className={`block px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-primary text-white' : 'bg-soft text-sub hover:text-fg'
                }`}
              >
                {d.short}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
