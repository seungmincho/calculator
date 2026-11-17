import { Metadata } from 'next'
import ImageWatermark from '@/components/ImageWatermark'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = '이미지 워터마크 - 여러 사진에 텍스트·로고, PNG·ZIP | 툴허브'
const DESCRIPTION = '사진 최대 10장에 같은 텍스트나 로고 워터마크를 순서대로 적용하세요. 위치·크기·투명도·회전·타일을 설정하고, 중지·계속·실패 재시도 후 현재 결과를 원본 크기 PNG 또는 ZIP으로 내려받습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '이미지 워터마크, 사진 워터마크, 여러 사진 워터마크, 텍스트 워터마크, 로고 워터마크, PNG, ZIP',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/image-watermark/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/image-watermark.png', width: 1200, height: 630, alt: '이미지 워터마크' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/image-watermark.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/image-watermark/' },
}

export default function ImageWatermarkPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 워터마크', description: DESCRIPTION, url: 'https://toolhub.ai.kr/image-watermark/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['사진 최대 10장 순차 처리', '텍스트·로고 워터마크와 9개 위치', '투명도·회전·타일 반복', '명시 만들기·중지·계속·실패 재시도', '현재 성공 결과의 원본 크기 PNG·선택 ZIP', '새 설정·파일 변경 뒤 이전 작업 보호'] }
  const faq = [
    { q: '여러 사진에 같은 워터마크를 어떻게 넣나요?', a: '사진을 고르고 텍스트 또는 로고와 위치·크기·투명도 등을 정한 뒤 모두 만들기를 누릅니다. 한 장씩 처리하며 중지·계속과 실패한 항목만 재시도를 제공합니다. 설정을 바꾸면 새로 만들어야 현재 설정의 결과를 내려받을 수 있습니다.' },
    { q: '사진과 로고의 한도는 얼마인가요?', a: '사진은 최대 10개, 파일당 8MiB·합계 40MiB·원본 16,777,216픽셀 이하입니다. 로고는 4MiB·4,194,304픽셀 이하이며 실제 파일 내용과 디코딩 크기를 확인합니다. 완료 결과 Blob의 합계는 80MiB까지입니다.' },
    { q: '원본 해상도와 애니메이션은 유지되나요?', a: '미리보기는 축소해서 표시하고 결과는 실제 디코딩된 원본 크기의 PNG로 만듭니다. PNG·JPEG·WebP·GIF를 읽으며 애니메이션은 한 프레임만 사용합니다. 선택한 현재 성공 결과를 PNG 또는 ZIP으로 받을 수 있습니다.' },
    { q: '문구와 사진이 저장되나요?', a: '이 도구는 사진·로고·문구를 브라우저 메모리에서 처리하며 서버·URL·기기 기록에 저장하지 않습니다. 텍스트는 200자까지이며 줄바꿈은 공백으로 처리합니다. 실패한 로고 교체는 마지막 유효 로고를 유지하고 실패를 알립니다.' },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><ImageWatermark />  <div className="mt-8">
    <ToolFaq items={faq} />
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            이미지 워터마크란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            사진 위에 이름·출처·문서 상태나 로고를 표시하는 도구입니다. 여러 사진에 같은 설정을 순서대로 적용하고 각 결과를 확인할 수 있습니다. 위치·크기·투명도·회전·타일을 조절하되 원래 사진의 중요한 부분을 가리지 않는지 미리보기를 확인하세요.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            이미지 워터마크 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>같은 설정 적용:</strong> 문구와 로고를 정한 뒤 모두 만들기를 누르세요. 옵션을 바꾸는 동안 사진을 자동으로 다시 처리하지 않습니다.</li>
            <li><strong>미리보기 확인:</strong> 작은 사진과 큰 사진에서 문구·로고의 위치와 비율을 각각 확인하세요. 결과는 원본 크기로 만들어집니다.</li>
            <li><strong>실패한 사진 확인:</strong> 깨진 파일이나 한도 초과 항목은 오류로 남습니다. ZIP에 포함될 현재 성공 결과 수를 확인하세요.</li>
            <li><strong>SNS 사진 공유:</strong> 인스타그램·블로그에 올리는 여행 사진이나 요리 사진에 닉네임이나 계정명을 워터마크로 넣어보세요.</li>
            <li><strong>문서 상태 표시:</strong> 초안·기밀·DRAFT 같은 문구로 문서 이미지의 상태를 표시할 수 있습니다. 워터마크가 원본 복사나 편집을 막는 것은 아닙니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
