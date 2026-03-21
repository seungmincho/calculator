import { Metadata } from 'next'
import BarcodeGenerator from '@/components/BarcodeGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import Breadcrumb from '@/components/Breadcrumb'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '바코드 생성기 - EAN·CODE128 | 툴허브',
  description: '다양한 형식의 바코드를 생성하고 다운로드하세요. EAN-13, CODE128, UPC 등 8가지 바코드 형식 지원. 제품 관리, 재고 관리, 이벤트 티켓 제작에 최적화',
  keywords: [
    '바코드 생성기',
    'barcode generator',
    'EAN-13 바코드',
    'CODE128 바코드',
    'UPC 바코드',
    '상품 바코드',
    '재고 관리 바코드',
    '바코드 제작',
    '바코드 다운로드',
    '무료 바코드 생성',
    'ITF-14 바코드',
    'CODE39 바코드',
    '바코드 프린트',
    '커스텀 바코드'
  ],
  openGraph: {
    title: '바코드 생성기 | 툴허브',
    description: '다양한 형식의 바코드를 생성하고 다운로드하세요. EAN-13, CODE128, UPC 등 8가지 바코드 형식 지원',
    type: 'website',
    locale: 'ko_KR',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/barcode-generator',
  },
  twitter: {
    card: 'summary_large_image',
    title: '바코드 생성기 | 툴허브',
    description: '다양한 형식의 바코드를 생성하고 다운로드하세요. 제품 관리, 재고 관리에 최적화'
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/barcode-generator/'
  }
}

export default function BarcodeGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '바코드 생성기',
    description: '다양한 형식의 바코드를 생성하고 다운로드하세요. EAN-13, CODE128, UPC 등 8가지 바코드 형식 지원',
    url: 'https://toolhub.ai.kr/barcode-generator',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['EAN-13 바코드', 'CODE128 바코드', 'UPC 바코드', 'CODE39 바코드', '바코드 다운로드']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'EAN-13과 CODE128 바코드의 차이는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'EAN-13은 13자리 숫자만 인코딩하며 소매 상품에 국제적으로 사용됩니다. 앞 3자리는 국가코드(한국 880), 다음 9자리는 제조사/상품코드, 마지막 1자리는 체크디짓입니다. CODE128은 ASCII 문자 전체(숫자, 영문, 특수문자)를 인코딩하며 물류, 재고관리에 사용됩니다. UPC-A는 미국/캐나다에서 사용하는 12자리 형식입니다.'
        }
      },
      {
        '@type': 'Question',
        name: '바코드를 직접 만들어 상품에 사용할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네, 하지만 소매 유통용 EAN-13 바코드를 사용하려면 GS1 Korea(대한상공회의소 유통물류진흥원)에서 업체코드를 발급받아야 합니다. 연회비가 발생하며 업체 규모에 따라 다릅니다. 내부 재고관리나 비유통 목적이라면 CODE128이나 CODE39를 자유롭게 사용할 수 있습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '바코드가 잘 인식되지 않는 원인은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '주요 원인: ① 인쇄 해상도 부족 (300dpi 이상 권장) ② 바코드 크기가 너무 작음 (EAN-13 최소 폭 31.35mm) ③ 대비 부족 (검은 바와 흰 배경 필요) ④ 여백(Quiet Zone) 부족 (바코드 양쪽에 최소 5mm 여백) ⑤ 잉크 번짐이나 인쇄 불량. SVG 형식으로 생성하면 해상도 손실 없이 어떤 크기로든 인쇄할 수 있습니다.'
        }
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <Breadcrumb />
        <BarcodeGenerator />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            바코드 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            바코드 생성기는 EAN-13, CODE128, UPC-A, CODE39, ITF-14 등 다양한 표준 바코드를 무료로 생성하고 PNG/SVG로 다운로드할 수 있는 온라인 도구입니다. 제품 바코드, 재고 관리 라벨, 이벤트 티켓, 도서 ISBN 바코드 등 다양한 용도에 활용할 수 있으며, SVG 형식으로 저장하면 어떤 크기로도 선명하게 인쇄됩니다. 별도 소프트웨어 설치 없이 브라우저에서 즉시 생성하고 활용할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            바코드 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>용도별 형식 선택:</strong> 소매 상품은 EAN-13, 물류·재고 관리는 CODE128, 미국·캐나다 유통은 UPC-A, 내부 관리용 문자 포함은 CODE39를 사용하세요.</li>
            <li><strong>SVG 형식 권장:</strong> PNG보다 SVG로 저장하면 확대해도 선명도가 유지되어 라벨 프린터나 인쇄 작업에 적합합니다.</li>
            <li><strong>여백(Quiet Zone) 확보:</strong> 바코드 스캐너가 정확히 인식하려면 바코드 좌우에 최소 5mm 이상의 흰 여백을 유지해야 합니다.</li>
            <li><strong>EAN-13 국가 코드:</strong> 한국 제품 바코드의 국가 코드는 880으로 시작합니다. 공식 유통용으로는 GS1 Korea에서 업체 코드를 발급받아야 합니다.</li>
            <li><strong>인쇄 해상도:</strong> 바코드 인쇄 시 300dpi 이상을 권장하며, 바코드 최소 폭은 EAN-13 기준 31.35mm 이상이 스캔에 안정적입니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}