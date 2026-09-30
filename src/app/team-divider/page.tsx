import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/team-divider')

export default function TeamDividerPage() {
  return <DecisionToolPage href="/team-divider" />
}
