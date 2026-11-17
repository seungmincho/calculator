import type { Metadata } from 'next'
import ImageConverter from '@/components/ImageConverter'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import koMessages from '@/../messages/generated/ko/ns/imageConverter.json'

const TITLE = '이미지 변환기 - 일괄 변환·일시정지·실패 재시도 | 툴허브'
const DESCRIPTION = '이미지를 브라우저에서 JPG·PNG·WebP 등으로 순차 변환하세요. 현재 파일 완료 뒤 일시정지, 실패만 재시도, 이전 성공 파일 보존과 현재 설정의 ZIP 다운로드를 지원합니다. HEIC·AVIF 지원은 실행 환경에 따라 다릅니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '이미지 변환기, HEIC JPG 변환, PNG JPG 변환, 이미지 일괄 변환, WebP 변환, 이미지 ZIP, image converter',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/image-converter/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/image-converter.png', width: 1200, height: 630, alt: '이미지 변환기' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/image-converter.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/image-converter/' },
}

export default function ImageConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 변환기',
    description: DESCRIPTION, url: 'https://toolhub.ai.kr/image-converter/',
    applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['JPG·PNG·지원 환경의 WebP와 AVIF 출력', '현재 파일 완료 뒤 일시정지·계속', '현재 설정의 실패만 재시도', '이전 성공 파일 보존·개별 다운로드', '현재 설정 결과의 ZIP·준비 취소', '브라우저 안에서 변환·파일당 100 MiB 이하'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={koMessages.imageConverter.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <ImageConverter />
            <div className="mt-8"><RelatedTools /></div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">이미지 변환 작업을 나누어 진행하기</h2>
          <p className="text-body leading-relaxed mb-6">
            이미지 파일을 추가하면 한 장씩 변환합니다. 다음 파일부터 일시정지를 누르면 현재 작업은 끝내고 이후 파일을 보류합니다. 파일 추가·설정 변경·실패 재시도 중에도 정지는 유지되며 계속 변환으로 재개할 수 있습니다. 새 설정의 변환에 실패하더라도 마지막 성공 파일은 실제 형식과 설정을 표시해 남겨 둡니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">결과와 형식 확인</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li>전체 다운로드는 현재 설정으로 완료된 결과만 포함합니다. 이전 성공 파일은 해당 행에서 따로 받을 수 있습니다.</li>
            <li>ZIP은 누른 순간의 결과를 사용합니다. 파일 추가·삭제는 그 내용을 바꾸지 않으며 초기화·설정 변경·이탈은 진행 중인 ZIP 요청을 취소합니다.</li>
            <li>HEIC 입력과 AVIF 출력은 실행 환경의 지원 여부에 따라 달라집니다. 열리지 않는 파일은 지원하는 사진 앱에서 JPG 또는 PNG로 내보낸 뒤 다시 선택하세요.</li>
            <li>PNG·WebP는 원본 투명도를 유지할 수 있습니다. JPG는 투명 영역을 선택한 배경색으로 채우며, JPG를 PNG로 바꾸어도 배경이 없어지지는 않습니다.</li>
            <li>파일 용량은 원본·형식·품질에 따라 커질 수도 있습니다. 원본을 보관하고 실제 결과를 비교하세요. GIF는 첫 프레임만 정지 이미지로 변환합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
