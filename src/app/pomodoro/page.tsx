import { Metadata } from 'next'
import PomodoroTimer from '@/components/PomodoroTimer'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = '포모도로 타이머 - 집중·휴식·오늘 목표와 기록 | 툴허브'
const DESCRIPTION = '집중과 휴식 시간을 정하고 일시정지·재개하세요. 재방문 시 남은 시간과 만료 안내를 확인하고, 오늘 목표·할 일·최근 7일 CSV를 관리합니다. 저장 오류와 다른 탭 변경을 알리며 부재 시간을 자동으로 집중 기록에 더하지 않습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '포모도로, 포모도로 타이머, 집중 타이머, 생산성 타이머, 25분 타이머, Pomodoro, 뽀모도로, 집중력, 시간 관리',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/pomodoro/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/pomodoro.png', width: 1200, height: 630, alt: '포모도로 타이머' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/pomodoro.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/pomodoro/',
  },
}

export default function PomodoroPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '포모도로 타이머',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/pomodoro/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '25분 집중 타이머',
      '5분 짧은 휴식',
      '15분 긴 휴식',
      '자동 다음 단계 시작',
      '알림음 (Web Audio API)',
      '세션 통계',
      '사용자 정의 시간 설정',
      '오늘의 목표 집중 횟수·완료 진행률',
      '최근 7일 집중 기록 CSV 다운로드',
      '남은 시간 기준 일시정지·재개와 만료된 저장 상태의 복귀 안내',
      '설정·할 일·타이머 저장 검증과 충돌 안내',
    ],
  }

  const faq = [
    { q: '포모도로 타이머는 어떻게 사용하나요?', a: '할 일을 정한 뒤 집중 타이머를 시작하고, 완료되면 짧은 휴식을 갖습니다. 기본값은 집중 25분·짧은 휴식 5분·4회 뒤 긴 휴식 15분이며 필요에 맞게 바꿀 수 있습니다. 오늘 목표 횟수와 완료 기록도 함께 확인할 수 있습니다.' },
    { q: '포모도로 타이머 시간을 변경할 수 있나요?', a: '네, 설정 아이콘을 눌러 집중 시간(1~120분), 짧은 휴식(1~30분), 긴 휴식(1~60분)과 긴 휴식 주기(2~10라운드)를 조정할 수 있습니다.' },
    { q: '한참 뒤에 돌아오면 집중 기록이 자동으로 늘어나나요?', a: '이미 만료된 저장 상태로 다시 방문하면 복귀 안내를 보여 주고 다음 단계를 명시적으로 시작할 수 있습니다. 부재 시간을 자동으로 당일 집중 기록에 더하거나 보지 못한 여러 회차를 소급 생성하지 않습니다. 현재 방문에서 늦게 확인한 완료도 해당 단계 한 번만 처리합니다.' },
    { q: '저장이 막혀도 타이머를 사용할 수 있나요?', a: '설정·할 일·타이머 저장본을 각각 검사합니다. 손상되거나 접근할 수 없는 저장본은 원문을 보호하면서 현재 화면에서 사용할 수 있습니다. 다른 탭이 타이머 저장본을 바꾸면 멈추고 명시적으로 다시 읽도록 안내합니다. 원래 저장 내용을 지우는 복구는 확인 후 실행합니다.' },
    { q: '화면이 꺼져도 정시에 소리나 알림이 오나요?', a: '브라우저와 운영체제가 백그라운드 실행을 제한할 수 있으므로 정시 알림을 보장하지 않습니다. 돌아왔을 때 남은 시간이나 복귀 안내를 확인하세요. 시간 기준이 크게 달라지면 원인을 추정해 기록하지 않고 타이머를 멈추고 알립니다.' },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <PomodoroTimer />
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
            포모도로 타이머란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            집중과 휴식을 나누어 작업 시간을 관리하는 도구입니다. 기본 25분 집중·5분 짧은 휴식과 4회 뒤 15분 긴 휴식을 제공하고, 시간과 자동 시작 여부를 바꿀 수 있습니다. 할 일·오늘 목표·최근 7일 완료 기록을 함께 확인하며 일시정지하거나 다시 시작할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            포모도로 기법 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>방해 요소 차단:</strong> 포모도로 세션 시작 전 휴대폰 알림을 끄고, 이메일·SNS 탭을 닫아 25분간 완전히 한 가지 작업에만 집중하세요.</li>
            <li><strong>작업 단위 분할:</strong> 큰 작업을 나누어 할 일 목록에 적고 각 항목의 완료 횟수를 확인하세요.</li>
            <li><strong>복귀 안내 확인:</strong> 오래 자리를 비웠다면 저장 상태와 남은 시간을 확인한 뒤 다음 단계를 시작하세요. 부재 시간은 자동 기록하지 않습니다.</li>
            <li><strong>세션 시간 커스텀:</strong> 집중력이 높은 사람은 작업 시간을 35~45분으로 늘리고, 집중이 어렵다면 15~20분으로 줄여 자신에게 맞는 리듬을 찾아보세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
