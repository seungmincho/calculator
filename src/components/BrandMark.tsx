/** 툴허브 로고 마크 (public/logo.svg와 동일 도형) */
export default function BrandMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} aria-hidden>
      <rect width="1024" height="1024" rx="232" fill="#3182F6" />
      <g fill="#fff">
        <rect x="232" y="232" width="260" height="260" rx="60" />
        <rect x="532" y="232" width="260" height="260" rx="60" />
        <rect x="232" y="532" width="260" height="260" rx="60" />
        <circle cx="662" cy="662" r="130" />
      </g>
    </svg>
  )
}
