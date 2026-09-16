import CategoryHubPage, { hubMetadata } from '@/components/CategoryHubPage'

export const metadata = hubMetadata('health')

export default function Page() {
  return <CategoryHubPage category="health" />
}
