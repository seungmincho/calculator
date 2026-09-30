import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/lottery-draw')

export default function LotteryDrawPage() {
  return <DecisionToolPage href="/lottery-draw" />
}
