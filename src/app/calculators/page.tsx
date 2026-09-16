import CategoryHubPage, { hubMetadata } from '@/components/CategoryHubPage'

export const metadata = hubMetadata('calculators')

export default function Page() {
  return <CategoryHubPage category="calculators" />
}
