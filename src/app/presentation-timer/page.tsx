import { Metadata } from 'next'
import PresentationTimer from '@/components/PresentationTimer'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '프레젠테이션 타이머 - 발표·회의용 카운트다운 | 툴허브',
  description: '발표·회의·세미나용 무료 프레젠테이션 타이머. 전체화면 발표자 모드, 마무리 경고 색상, 초과 시간 표시, 도입·본론·Q&A 구간 타이머, 화면 꺼짐 방지, 설정 링크 공유까지.',
  keywords: '프레젠테이션 타이머, 발표 시간 재기, 발표자 타이머, 질의응답 타이머, 아젠다 타이머, 발표 타이머, 회의 타이머, 카운트다운, 전체화면 타이머, 세미나 타이머, presentation timer, countdown timer',
  openGraph: {
    title: '프레젠테이션 타이머 - 발표·회의용 카운트다운 | 툴허브',
    description: '발표, 회의, 세미나에 최적화된 프레젠테이션 타이머. 경고/위험 단계 색상 변화, 전체화면 모드, 알림음 지원.',
    url: 'https://toolhub.ai.kr/presentation-timer',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '프레젠테이션 타이머 - 발표·회의용 카운트다운',
    description: '발표, 회의, 세미나에 최적화된 프레젠테이션 타이머. 경고/위험 단계 색상 변화, 전체화면 모드, 알림음 지원.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/presentation-timer/',
  },
}

export default function PresentationTimerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '프레젠테이션 타이머',
    description: '발표, 회의, 세미나에 최적화된 프레젠테이션 타이머. 경고/위험 단계 색상 변화, 전체화면 모드, 알림음 지원.',
    url: 'https://toolhub.ai.kr/presentation-timer',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '오차 없는 발표 시간 카운트다운 (백그라운드 탭에서도 정확)',
      '전체화면 발표자 모드 (정상 → 노랑 경고 → 빨강 초과)',
      '도입·본론·Q&A 구간(아젠다) 타이머와 구간별 남은 시간',
      '초과 시간 카운트업',
      '알림음·진동 (경고·구간 전환·종료)',
      '화면 꺼짐 방지 (Wake Lock)',
      '프리셋 (3/5/10/15/20/30분, 발표+질의응답)',
      '키보드 단축키 (Space·R·F·↑↓)',
      '설정 링크 공유 · 발표 결과 카드 저장',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '프레젠테이션 타이머란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '프레젠테이션 타이머는 발표, 회의, 세미나 등에서 시간을 관리하는 도구입니다. 남은 시간에 따라 초록→노랑→빨강으로 색상이 변하여 직관적으로 시간을 확인할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '발표자 모드(전체화면)는 어떻게 사용하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '발표자 모드 버튼이나 F 키를 누르면 남은 시간이 화면 가득 크게 표시되고, 경고 시점엔 노란색, 초과 시엔 빨간색으로 화면 전체가 바뀌어 멀리서도 한눈에 보입니다. 숫자를 누르거나 Space로 시작·정지, ESC로 나갑니다.',
        },
      },
      {
        '@type': 'Question',
        name: '경고 시간과 위험 시간은 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '남은 시간이 경고 시점(기본: 10분 이하 발표는 2분 전, 그 이상은 3분 전)에 도달하면 노란색으로 바뀌고 알림음·진동이 울립니다. 시간이 끝나면 빨간색으로 바뀌고 초과 시간을 +로 계속 셉니다.',
        },
      },
      {
        '@type': 'Question',
        name: '사회자가 발표자에게 타이머 설정을 보낼 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '네. 시간과 구간을 설정하면 주소에 그대로 저장됩니다. 링크 복사 버튼으로 보내면 받는 사람은 같은 설정으로 바로 시작할 수 있습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '발표 중 화면이 꺼지지 않나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '타이머가 도는 동안 화면 꺼짐 방지(Wake Lock)를 요청합니다. 크롬·엣지·사파리 최신 버전에서 동작하며, 지원하지 않는 브라우저에서는 기기 화면 자동 잠금 시간을 늘려 주세요.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <PresentationTimer />
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
            프레젠테이션 타이머란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            프레젠테이션 타이머는 발표, 강연, 회의, 세미나에서 시간을 효과적으로 관리할 수 있도록 설계된 무료 온라인 카운트다운 도구입니다. 마무리할 시점이 되면 노란색, 시간이 끝나면 빨간색으로 화면이 바뀌고 초과 시간을 계속 세어 줍니다. 전체화면 발표자 모드, 도입·본론·Q&A 구간 타이머, 3·5·10·15·20·30분과 발표+질의응답 프리셋, 화면 꺼짐 방지를 지원하며, 설정을 링크로 공유할 수 있습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            프레젠테이션 타이머 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>발표자 모드:</strong> 발표자 앞 노트북이나 휴대폰에 발표자 모드를 띄워 두면 멀리서도 남은 시간과 색으로 상황을 알 수 있습니다. 타이머가 도는 동안 화면이 꺼지지 않습니다.</li>
            <li><strong>구간 나누기:</strong> 도입 2분·본론 8분·질의응답 5분처럼 구간을 나누면 지금 구간의 남은 시간과 다음 구간이 표시되고, 구간이 바뀔 때 짧은 알림이 울립니다.</li>
            <li><strong>사회자용 링크 공유:</strong> 여러 발표자의 시간을 맞춰야 한다면 설정한 뒤 링크를 복사해 보내세요. 같은 설정으로 바로 열립니다.</li>
            <li><strong>+1분/-1분 빠른 조절:</strong> 발표 중 질문이 길어지거나 앞당겨야 할 경우, 버튼이나 ↑↓ 키로 지금 구간 시간을 1분씩 조절할 수 있습니다.</li>
            <li><strong>초과 시간 확인:</strong> 설정 시간을 초과하면 타이머가 초과 시간을 표시하여 얼마나 넘겼는지 정확히 알 수 있습니다. 시간 초과를 최소화하는 연습에 활용하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
