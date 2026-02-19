'use client'

import { useTrackToolVisit } from '@/hooks/useToolAnalytics'

export default function ToolTracker() {
  useTrackToolVisit()
  return null
}
