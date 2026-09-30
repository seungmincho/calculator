import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/penalty-roulette')

export default function PenaltyRoulettePage() {
  return <DecisionToolPage href="/penalty-roulette" />
}
