import { Metadata } from 'next'
import ScreenRecorder from '@/components/ScreenRecorder'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = '화면 녹화기 - 다시 녹화·마지막 성공 결과 보관 | 툴허브'
const DESCRIPTION = '브라우저에서 화면·창·탭을 녹화하고 일시정지하거나 다시 찍으세요. 마지막 성공 영상은 새 녹화가 정상 완료될 때까지 유지되며 미리보기·다운로드할 수 있습니다. 오디오 연결과 실제 파일 형식도 확인하세요.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '화면 녹화, 스크린 레코더, 온라인 녹화, 무료 화면 녹화, 브라우저 녹화, 다시 녹화, 화면 캡처',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/screen-recorder/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/screen-recorder.png', width: 1200, height: 630, alt: '화면 녹화기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/screen-recorder.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/screen-recorder/',
  },
}

export default function ScreenRecorderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '화면 녹화기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/screen-recorder/',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, getDisplayMedia and a supported MediaRecorder format',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['지원 브라우저에서 화면·창·탭 녹화', '일시정지·계속·활성 구간 시간', '준비 취소·실패 시 마지막 성공 결과 보존', '새 유효 영상 완료 뒤 결과 교체', '마지막 결과 미리보기·다운로드·명시 삭제', '실제 파일 형식·연결한 오디오 트랙 안내', '마이크 연결 실패 후 명시적인 화면 단독 진행 선택'],
  }

  const faq = [
    { q: '다시 녹화하다 취소하면 이전 영상도 없어지나요?', a: '마지막 성공 결과 1개는 이번 방문의 메모리에 유지됩니다. 새 녹화의 준비 취소·실패·빈 결과는 이전 영상을 교체하지 않습니다. 새 유효 영상이 완료되거나 결과 삭제를 확인할 때 바뀌며, 페이지를 떠나기 전에 필요한 파일을 내려받으세요.' },
    { q: '시스템 오디오와 마이크가 실제로 포함됐는지 어떻게 확인하나요?', a: '녹화 시작 때 연결한 트랙을 안내합니다. 시스템 오디오 제공 여부는 브라우저와 공유 대상에 따라 다릅니다. 요청한 마이크를 얻지 못하면 시작 전에 마이크 없이 진행할지 선택하며, 실제 소리는 마지막 결과를 재생해 확인하세요.' },
    { q: '녹화 형식과 표시 시간은 어떻게 정해지나요?', a: '지원되는 WebM 형식을 먼저 확인하고 실제 결과의 형식과 파일명을 표시합니다. 이 도구는 MP4 변환 기능을 제공하지 않습니다. 표시 시간은 일시정지를 제외한 활성 구간이며 인코딩·기기 절전 등으로 영상 플레이어의 재생 길이와 다를 수 있습니다.' },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <ScreenRecorder />
              <ToolFaq items={faq} />
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
            온라인 화면 녹화기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            지원되는 브라우저에서 사용자가 선택한 화면·창·탭을 녹화합니다. 화질·프레임 속도·오디오 설정을 고른 뒤 실제 연결된 트랙을 확인하세요. 녹화 파일은 서버로 업로드하지 않으며 마지막 성공 결과 1개를 이번 방문 동안 보관합니다. 다시 찍기 준비를 취소하거나 새 시도가 실패해도 이전 결과의 미리보기와 다운로드를 유지합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            화면 녹화기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>오디오 확인:</strong> 요청한 옵션과 실제 연결된 트랙은 다를 수 있습니다. 짧게 녹화한 결과를 재생해 화면과 소리를 확인하세요.</li>
            <li><strong>준비 취소:</strong> 화면 선택이나 마이크 준비를 취소하면 뒤늦게 허용된 트랙도 정리합니다. 브라우저의 OS 선택창 자체를 강제로 닫는 기능은 아닙니다.</li>
            <li><strong>이전 결과 보관:</strong> 새 성공 결과가 확정되기 전에는 이전 영상을 유지합니다. 여러 영상을 저장하려면 각 결과를 교체하거나 페이지를 떠나기 전에 다운로드하세요.</li>
            <li><strong>시간과 형식:</strong> 일시정지 구간은 표시 시간에서 제외합니다. 결과의 실제 형식을 확인하고 필요한 앱에서 재생 가능한지 직접 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
