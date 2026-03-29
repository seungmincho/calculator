import { Metadata } from 'next'
import { Suspense } from 'react'
import JeonseChecklist from '@/components/JeonseChecklist'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '전세사기 체크리스트 - 전세 계약 전 필수 확인 | 툴허브',
  description: '전세 계약 전 반드시 확인해야 할 16가지 체크리스트. 등기부등본, 임대인 확인, 전세가율, 전세보증보험 등 전세사기 예방을 위한 단계별 안전 점검.',
  keywords: '전세사기, 전세 체크리스트, 깡통전세, 전세보증보험, 전세 계약, 등기부등본, 전세사기 예방, 전입신고, 확정일자, HUG',
  openGraph: {
    title: '전세사기 체크리스트 | 툴허브',
    description: '전세 계약 전 반드시 확인해야 할 16가지 체크리스트. 전세사기 예방을 위한 단계별 안전 점검.',
    url: 'https://toolhub.ai.kr/jeonse-checklist',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '전세사기 체크리스트',
    description: '전세 계약 전 반드시 확인해야 할 16가지 체크리스트. 전세사기 예방을 위한 단계별 안전 점검.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/jeonse-checklist',
  },
}

export default function JeonseChecklistPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '전세사기 체크리스트',
      description: '전세 계약 전 반드시 확인해야 할 16가지 체크리스트. 전세사기 예방을 위한 단계별 안전 점검.',
      url: 'https://toolhub.ai.kr/jeonse-checklist',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '등기부등본 확인 체크리스트',
        '임대인 신용·세금 확인',
        '전세가율 80% 미만 여부 확인',
        '전세보증보험 가입 가능 여부',
        '위험도 점수 자동 산출',
        'URL 공유 기능',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: '전세사기 예방 체크리스트 사용 방법',
      description: '전세 계약 전 16가지 항목을 단계별로 확인하여 전세사기를 예방하세요.',
      step: [
        {
          '@type': 'HowToStep',
          name: '물건 정보 입력',
          text: '계약 예정 물건의 주소, 전세보증금, 계약 예정일을 입력합니다.',
          position: 1,
        },
        {
          '@type': 'HowToStep',
          name: '등기부등본 확인',
          text: '소유자와 계약자 일치 여부, 근저당·가압류 여부, 경매·압류 여부를 확인합니다.',
          position: 2,
        },
        {
          '@type': 'HowToStep',
          name: '임대인 확인',
          text: '세금 체납 여부, 신용 상태, 다수 물건 소유 여부를 확인합니다.',
          position: 3,
        },
        {
          '@type': 'HowToStep',
          name: '계약 조건 확인',
          text: '전세가율 80% 미만 여부, 특약사항, 입주일·잔금일, 공인중개사 등록 여부를 확인합니다.',
          position: 4,
        },
        {
          '@type': 'HowToStep',
          name: '안전장치 확인',
          text: '전세보증보험 가입 가능 여부, 전입신고·확정일자 계획, 우선변제권 확보 계획을 확인합니다.',
          position: 5,
        },
        {
          '@type': 'HowToStep',
          name: '위험도 점수 확인',
          text: '16가지 항목의 체크 결과를 바탕으로 위험도 점수와 등급(안전/주의/경고/위험)을 확인합니다.',
          position: 6,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '전세가율이란 무엇이고 왜 80% 미만이어야 하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '전세가율은 매매가 대비 전세보증금의 비율입니다. 전세가율이 80%를 초과하면 집값이 조금만 하락해도 전세보증금을 돌려받지 못하는 "깡통전세" 위험이 생깁니다. 특히 경매 낙찰가는 시세의 70~80% 수준이므로, 전세가율 80% 이상이면 보증금을 전액 회수하기 어려울 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '전세보증보험이란 무엇이고 어디서 가입하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '전세보증보험은 집주인이 전세보증금을 돌려주지 못할 경우 HUG(주택도시보증공사)나 SGI서울보증이 대신 보증금을 지급하는 보험입니다. HUG 전세보증금 반환보증은 전세가율 100% 미만, 단독·다가구는 90% 미만인 주택에서 가입할 수 있습니다. 계약 후 입주일로부터 전세계약기간의 1/2이 지나기 전에 반드시 가입하세요.',
          },
        },
        {
          '@type': 'Question',
          name: '전입신고와 확정일자는 왜 중요한가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '전입신고는 주택임대차보호법상 대항력을 취득하기 위한 요건입니다. 확정일자는 우선변제권 확보를 위한 요건입니다. 이 두 가지를 갖추면 집이 경매로 넘어가더라도 다른 채권자보다 먼저 보증금을 변제받을 수 있습니다. 잔금 지급 당일 즉시 전입신고와 확정일자를 받으세요.',
          },
        },
      ],
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
            <I18nWrapper>
              <JeonseChecklist />
            </I18nWrapper>
          </Suspense>
        </div>
      </div>
    </>
  )
}
