import { Metadata } from 'next'
import { Suspense } from 'react'
import AdminFeedback from '@/components/AdminFeedback'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '문의 관리 - Admin | 툴허브',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminFeedbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <I18nWrapper>
            <AdminFeedback />
          </I18nWrapper>
        </Suspense>
      </div>
    </div>
  )
}
