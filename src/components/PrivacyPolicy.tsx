'use client'

import { useTranslations } from 'next-intl'

export default function PrivacyPolicy() {
  const t = useTranslations('privacy')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-10">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8">
        {t('title')}
      </h1>

      <div className="prose dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
        {/* 1. 개인정보 수집 항목 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('section1.title')}
          </h2>
          <p>{t('section1.content')}</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {(t.raw('section1.items') as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* 2. 개인정보 이용 목적 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('section2.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            {(t.raw('section2.items') as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* 3. 개인정보 보유 기간 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('section3.title')}
          </h2>
          <p>{t('section3.content')}</p>
        </section>

        {/* 4. 제3자 제공 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('section4.title')}
          </h2>
          <p>{t('section4.content')}</p>
        </section>

        {/* 5. 쿠키 및 광고 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('section5.title')}
          </h2>
          <p>{t('section5.content')}</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {(t.raw('section5.items') as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* 6. 이용자 권리 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('section6.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            {(t.raw('section6.items') as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* 7. 개인정보 보호 조치 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('section7.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            {(t.raw('section7.items') as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* 8. 문의 */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('section8.title')}
          </h2>
          <p>{t('section8.content')}</p>
        </section>

        {/* 시행일 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          {t('effectiveDate')}
        </div>
      </div>
    </div>
  )
}
