import CategoryHubPage, { hubMetadata } from '@/components/CategoryHubPage'

export const metadata = hubMetadata('tools')

export default function Page() {
  return <CategoryHubPage category="tools" />
}
