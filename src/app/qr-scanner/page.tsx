import { Metadata } from 'next'
import { Suspense } from 'react'
import QrScanner from '@/components/QrScanner'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: 'QR코드 스캔 - 카메라/이미지 QR코드 인식 | 툴허브',
  description: 'QR코드 스캔 - 카메라 또는 이미지 파일로 QR코드를 스캔하세요. URL, 텍스트, Wi-Fi, 연락처 등 다양한 QR코드 인식.',
  keywords: 'QR코드 스캔, QR 스캐너, QR코드 인식, QR코드 읽기, qr code scanner, QR 리더',
  openGraph: { title: 'QR코드 스캔 | 툴허브', description: '카메라/이미지로 QR코드 스캔', url: 'https://toolhub.ai.kr/qr-scanner', siteName: '툴허브', locale: 'ko_KR', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'QR코드 스캔 | 툴허브', description: 'QR코드 스캔, 인식, 복사' },
  alternates: { canonical: 'https://toolhub.ai.kr/qr-scanner/' },
}

export default function QrScannerPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'QR코드 스캔', description: '카메라/이미지로 QR코드 스캔', url: 'https://toolhub.ai.kr/qr-scanner', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['카메라 스캔', '이미지 스캔', '다양한 QR 유형', '스캔 기록'] }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'QR코드 스캐너는 어떻게 작동하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'QR코드 스캐너는 카메라로 촬영한 이미지에서 QR코드를 인식합니다. ① 위치 검출 패턴(3개 모서리의 큰 사각형)으로 QR코드 위치와 방향을 파악 ② 정렬 패턴으로 기울기를 보정 ③ 포맷 정보를 읽어 오류 정정 레벨을 확인 ④ 데이터 영역을 디코딩하여 텍스트, URL 등을 추출합니다. 이 도구는 브라우저의 카메라 API를 사용하며 서버에 이미지를 전송하지 않습니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'QR코드가 인식되지 않는 원인은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '① 조명 부족: 밝은 곳에서 스캔 ② QR코드 손상: 30% 이상 훼손되면 오류 정정으로도 복구 불가 ③ 흐릿한 이미지: 카메라 초점을 맞추고 안정적으로 촬영 ④ 화면 반사: 화면의 QR코드는 반사를 줄이고 밝기를 최대로 ⑤ 너무 작은 QR코드: 최소 2cm × 2cm 이상 ⑥ 색상 대비 부족: 어두운 패턴과 밝은 배경이 필요합니다.',
        },
      },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center text-gray-900 dark:text-white">Loading...</div>}><I18nWrapper><QrScanner /></I18nWrapper></Suspense>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            QR코드 스캐너란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            QR코드 스캐너는 카메라 또는 이미지 파일을 이용해 QR코드를 인식하고, 담긴 URL, 텍스트, Wi-Fi 비밀번호, 연락처 등 다양한 정보를 즉시 추출하는 무료 온라인 도구입니다. 별도 앱 설치 없이 브라우저에서 바로 사용할 수 있으며, 촬영한 이미지나 스크린샷 파일을 업로드하는 방식으로도 QR코드를 읽을 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            QR코드 스캐너 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>이미지 파일 업로드:</strong> 스마트폰으로 찍은 QR코드 사진이나 스크린샷을 업로드하면 카메라 없이도 내용을 확인할 수 있습니다. 오래된 QR코드나 인쇄물 속 QR코드를 해석할 때 유용합니다.</li>
            <li><strong>카메라 스캔 모드:</strong> 웹캠이나 스마트폰 카메라를 연결해 실시간으로 QR코드를 스캔하세요. 충분한 조명과 안정적인 화면 고정이 인식 성공률을 높입니다.</li>
            <li><strong>스캔 기록 활용:</strong> 여러 QR코드를 연속으로 스캔할 때 이전 스캔 기록을 보관하면 정보를 비교하거나 나중에 참고하기 편리합니다.</li>
            <li><strong>보안 주의:</strong> 출처를 알 수 없는 QR코드를 스캔하면 피싱 사이트로 연결될 수 있습니다. 스캔 결과에 표시된 URL을 클릭하기 전에 반드시 내용을 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
