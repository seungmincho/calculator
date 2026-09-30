import DecisionToolPage from '@/components/DecisionToolPage'
import { decisionMetadata } from '@/config/decisionTools'

export const metadata = decisionMetadata('/random-number')

export default function RandomNumberPage() {
  return <DecisionToolPage href="/random-number" />
}
