import CategoryHubPage, { hubMetadata } from '@/components/CategoryHubPage'

export const metadata = hubMetadata('media')

export default function Page() {
  return <CategoryHubPage category="media" />
}
