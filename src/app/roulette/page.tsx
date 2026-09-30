import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/roulette')

export default function RoulettePage() {
  return <DecisionToolPage href="/roulette" />
}
