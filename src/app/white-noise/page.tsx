import { Metadata } from 'next'
import WhiteNoise from '@/components/WhiteNoise'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = '백색소음 생성기 - 종료 타이머·소리 설정 저장 | 툴허브'
const DESCRIPTION = '화이트·핑크·브라운 노이즈, 빗소리·바람·파도 등 6가지 합성 소리를 재생합니다. 종료 타이머와 선택적 30초 페이드, 이름 붙인 설정 6개 저장·불러오기를 지원합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '백색소음, 화이트노이즈, 핑크노이즈, 브라운노이즈, 소리타이머, 소리설정저장, 페이드, 빗소리, white noise',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/white-noise/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/white-noise.png', width: 1200, height: 630, alt: '백색소음 생성기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/white-noise.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/white-noise/',
  },
}

const faqData = [
  {
    question: '어떤 소리를 재생할 수 있나요?',
    answer: '화이트·핑크·브라운 노이즈와 빗소리·바람·파도를 표현한 6가지 합성 소리를 제공합니다. 브라우저에서 직접 생성하며 재생 버튼을 누르기 전에는 오디오를 시작하지 않습니다. 실제 자연 녹음이나 수면·집중 효과를 보증하는 도구는 아닙니다.',
  },
  {
    question: '타이머나 소리를 바꾸면 종료 시각도 바뀌나요?',
    answer: '재생 중 타이머를 바꾸면 지금부터 선택한 5·10·15·30·60분으로 종료 기준을 다시 정합니다. 소리 종류나 음량만 바꾸면 기존 종료 기준을 유지합니다. 타이머 없음은 무기한이며, 화면 복귀 때 이미 기한이 지났으면 다시 소리를 재개하지 않습니다. OS 절전·앱 정지 중 정확한 백그라운드 실행은 보장하지 않습니다.',
  },
  {
    question: '종료 전에 소리를 줄일 수 있나요?',
    answer: '선택적인 마지막 30초 페이드를 켤 수 있으며 기본은 꺼져 있습니다. 음량 0은 음소거 상태로, 재생 중지와 구분됩니다. 재생이나 재개가 거부되면 성공으로 표시하지 않고 현재 상태를 안내합니다.',
  },
  {
    question: '저장한 설정을 불러오면 바로 소리가 나나요?',
    answer: '아니요. 불러오기는 진행 중 소리를 정지하고 설정만 적용합니다. 이름 40자 이내로 최대 6개를 저장·이름 변경·삭제할 수 있으며 종류·음량·타이머·페이드만 기기에 저장합니다. 재생 상태·남은 시간·오디오 버퍼는 저장하지 않고 다음 방문에도 자동 재생하지 않습니다.',
  },
]

export default function WhiteNoisePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '백색소음 생성기',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/white-noise/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript, Web Audio API',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '6가지 소음 유형 (화이트, 핑크, 브라운, 빗소리, 바람, 파도)',
      '볼륨 조절',
      '수면 타이머 (5~60분)',
      '실시간 소음 전환',
      '종료 기준을 유지하는 남은 시간 표시',
      '선택적 마지막 30초 페이드',
      '이름 붙인 설정 6개 저장·명시 불러오기',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <WhiteNoise />
              <ToolFaq items={faqData.map((f) => ({ q: f.question, a: f.answer }))} />
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
            백색소음 생성기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            백색소음 생성기는 6가지 합성 소리와 음량·종료 타이머를 조합하는 도구입니다. 자주 쓰는 설정에 이름을 붙여 저장하고 필요할 때 불러올 수 있습니다. 설정을 불러오거나 페이지를 다시 방문해도 자동으로 소리를 재생하지 않으며 사용자의 재생 동작을 기다립니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            백색소음 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>소리 비교:</strong> 소리 종류와 음량을 바꿔 원하는 조합을 고르세요. 종류·음량 변경은 타이머의 종료 기준을 늘리지 않습니다.</li>
            <li><strong>종료 방식:</strong> 정해진 시간이 필요하면 타이머를 선택하고, 끝부분을 서서히 줄이려면 30초 페이드를 켜세요.</li>
            <li><strong>설정 다시 사용:</strong> 이름으로 저장한 설정을 불러온 뒤 직접 재생하세요. 불러오기는 기존 소리를 멈추고 설정만 바꿉니다.</li>
            <li><strong>화면 복귀:</strong> 기기 절전이나 앱 정지 뒤에는 표시된 상태와 남은 시간을 확인하세요. 기한이 지난 소리를 자동으로 다시 시작하지 않습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
