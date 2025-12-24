import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import DotsAndBoxes from '@/components/DotsAndBoxes'

export async function generateMetadata() {
  const t = await getTranslations('dotsandboxes')

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
    },
  }
}

function DotsAndBoxesLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export default function DotsAndBoxesPage() {
  return (
    <Suspense fallback={<DotsAndBoxesLoading />}>
      <DotsAndBoxes />
    </Suspense>
  )
}
