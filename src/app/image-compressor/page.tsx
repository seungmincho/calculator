import { Metadata } from 'next'
import ImageCompressor from '@/components/ImageCompressor'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

const TITLE = '이미지 압축기 - 용량 줄이기·일시정지·재시도 | 툴허브'
const DESCRIPTION = 'JPG·PNG·WebP를 품질·목표 용량·크기 설정으로 압축하세요. 일시정지와 계속 처리, 실패 항목 재시도, 개별 파일과 완료 결과 ZIP 다운로드를 지원하며 결과는 원본과 설정에 따라 달라집니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '이미지 압축, 사진 용량 줄이기, 이미지 최적화, JPG 압축, PNG 압축, WebP 변환, 온라인 이미지 압축',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/image-compressor/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/image-compressor.png', width: 1200, height: 630, alt: '이미지 압축기' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/image-compressor.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/image-compressor/' },
}

export default function ImageCompressorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '이미지 압축기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/image-compressor/',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['이미지 압축', '포맷 변환', '일괄 처리', '품질·목표 용량·크기 조절', 'WebP 변환', '일시정지·계속 처리·실패 항목 재시도', '현재 설정의 완료 결과 재사용', '클릭 시점 완료 목록의 ZIP 다운로드', '중복·생성 파일명 충돌 방지']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <ImageCompressor />
              <div className="mt-8">

                <RelatedTools />

              </div>

            </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            이미지 압축기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            JPG·PNG·WebP 이미지의 품질·크기·출력 형식을 조절하는 무료 도구입니다. 목표 용량을 설정하면 그 조건에 맞게 처리하며 최종 크기와 품질은 원본에 따라 달라집니다. 작업을 일시정지했다가 계속하거나 실패 항목만 다시 시도할 수 있습니다. 현재 설정의 완료 결과를 개별 파일 또는 ZIP으로 내려받으며 이미지는 서버에 업로드하지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            이미지 압축 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>결과 비교:</strong> 원본과 압축 결과를 함께 확인하고 필요한 품질과 파일 크기를 선택하세요. 이미 압축된 원본은 절감 폭이 작을 수 있습니다.</li>
            <li><strong>목표 용량:</strong> 제출처의 파일 크기 제한에 맞춰 목표를 정하고 완료 결과의 실제 크기와 가독성을 확인하세요.</li>
            <li><strong>작업 제어:</strong> 일시정지 중 파일을 추가하거나 설정을 바꿔도 자동 재개하지 않습니다. 계속 처리를 눌러 진행하거나 실패 항목만 다시 시도하세요.</li>
            <li><strong>PNG vs JPG 선택:</strong> 투명 배경이 필요한 로고·아이콘은 PNG로, 사진·배경 이미지는 JPG나 WebP로 압축하면 최적의 결과를 얻을 수 있습니다.</li>
            <li><strong>ZIP 기준:</strong> 버튼을 누른 시점의 완료 결과를 묶습니다. ZIP 준비 중 바꾼 설정이나 나중에 완료된 파일은 해당 묶음과 구분됩니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
