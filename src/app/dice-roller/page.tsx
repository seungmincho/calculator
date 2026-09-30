import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/dice-roller')

export default function DiceRollerPage() {
  return <DecisionToolPage href="/dice-roller" />
}
