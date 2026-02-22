import type { Metadata } from 'next'
import OfflineContent from './OfflineContent'

export const metadata: Metadata = {
  title: '오프라인 - 툴허브',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return <OfflineContent />
}
