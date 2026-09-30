import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/coin-flip')

export default function CoinFlipPage() {
  return <DecisionToolPage href="/coin-flip" />
}
