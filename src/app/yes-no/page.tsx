import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/yes-no')

export default function YesNoPage() {
  return <DecisionToolPage href="/yes-no" />
}
