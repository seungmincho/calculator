import { Metadata } from 'next'
import AspectRatio from '@/components/AspectRatio'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import aspectRatioMessages from '../../../messages/generated/ko/ns/aspectRatio.json'

const TITLE = '화면 비율 계산기 - 사진 자르기 위치·해상도 | 툴허브'
const DESCRIPTION = '16:9·9:16 등 화면 비율과 해상도를 계산하고 사진 자르기 위치를9버튼·슬라이더로 조절하세요. 중앙 여백 채우기, 실제 출력 크기, PNG·JPEG 저장과 복사 실패 복구를 지원합니다.'

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION,
  keywords: '화면 비율 계산기, aspect ratio calculator, 종횡비, 해상도 계산, 16:9, 9:16, 4:5, 사진 자르기 위치, 이미지 여백, 이미지 크기',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/aspect-ratio/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/aspect-ratio.png', width: 1200, height: 630, alt: '화면 비율 계산기' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/aspect-ratio.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/aspect-ratio/' },
}

export default function AspectRatioPage() {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication', name: '화면 비율 계산기', description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/aspect-ratio/', applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any', browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['종횡비·한 변으로 치수 계산', '비율 고정·해상도 예시', '사진9위치·두 축 자르기 조절', '중앙 검정·흰색 여백', '미리보기와 같은 원본 영역 저장', '실제 출력 치수·축소 한도 안내', '이미지 교체 실패 시 마지막 정상 사진 보존', '치수·비율·CSS 복사 실패 복구', '숫자 설정 링크 공유'],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={aspectRatioMessages.aspectRatio.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <AspectRatio />
            <div className="mt-8"><RelatedTools /></div>
          </I18nWrapper>
        </div>
      </div>
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">화면 비율과 사진 자르기 위치</h2>
          <p className="text-body leading-relaxed mb-6">
            가로·세로 픽셀에서 종횡비를 구하거나 선택한 비율에 맞춰 한쪽 치수를 계산합니다.
            1920×1080의16:9,1080×1920의9:16 같은 예시를 적용하고 사진에서 남길 부분을 직접 고를 수 있습니다.
            잘라내기는9위치 버튼과 두 슬라이더를 사용하고 여백 채우기는 중앙 정렬을 유지합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">미리보기와 파일 저장의 범위</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>같은 영역:</strong> 미리보기와 저장은 같은 원본 영역 계산을 사용합니다. 잘리는 여유가 없는 축은 이동하지 않으며 새 사진을 정상적으로 불러오면 중앙50/50으로 시작합니다.</li>
            <li><strong>입력 파일:</strong> PNG·JPEG·WebP·GIF,8MiB 및16,000,000원본 픽셀 이하를 지원합니다. 애니메이션은 정지 프레임으로 사용하며 파일명만으로 형식을 판단하지 않습니다.</li>
            <li><strong>출력 크기:</strong> 긴 변8192와16,000,000픽셀 한도를 함께 적용합니다. 계산용 치수와 실제 저장 치수를 구분하고, 축소된 결과는 저장 버튼 근처에서 확인할 수 있습니다.</li>
            <li><strong>실패와 재시도:</strong> 잘못된 새 파일은 마지막 정상 사진을 지우지 않습니다. 읽기·내보내기 실패 안내를 확인하고 현재 이미지로 다시 시도하세요.</li>
            <li><strong>안전 영역:</strong> 현재 도구의 참고 오버레이이며 최신 플랫폼 UI를 보장하지 않습니다. 표시선은 파일에 그리지 않고 실제 게시 위치의 조건은 별도로 확인합니다.</li>
            <li><strong>공유와 복사:</strong> 치수·비율·CSS 복사 실패 시 전체 원문을 선택하거나 재시도합니다. 사진과 파일명은 숫자 설정 링크에 포함하지 않습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
