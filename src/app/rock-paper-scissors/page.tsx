import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/rock-paper-scissors')

export default function RockPaperScissorsPage() {
  return <DecisionToolPage href="/rock-paper-scissors" />
}
