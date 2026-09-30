import { Metadata } from 'next'
import EvSubsidyCalculator from '@/components/EvSubsidyCalculator'
import I18nWrapper from '@/components/I18nWrapper'

export const metadata: Metadata = {
  title: '전기차 보조금 계산기 - 국비·지방비 보조금 계산 | 툴허브',
  description: '2026년 전기차 보조금 계산기. 아이오닉5·EV3·모델Y 등 인기 차종의 국비와 전국 160개 시·군 지방비(무공해차 통합누리집 공고), 전환지원금·청년 생애첫차·다자녀 추가지원, 실구매가와 취득세 감면까지 한 번에 계산합니다.',
  keywords: '전기차 보조금, 전기차 보조금 계산기, 2026 전기차 보조금, 전환지원금, 전기차 국비, 지방비 보조금, 청년 생애첫차 전기차, 아이오닉5 보조금, EV3 보조금, 모델Y 보조금, 전기차 취득세 감면',
  openGraph: {
    title: '전기차 보조금 계산기 - 국비·지방비 보조금 계산 | 툴허브',
    description: '2026년 전기차 국비·지방비 보조금, 전환지원금·청년·다자녀 추가지원, 160개 시·군 비교, 실구매가 계산',
    url: 'https://toolhub.ai.kr/ev-subsidy',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/ev-subsidy.png', width: 1200, height: 630, alt: '전기차 보조금 계산기' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '전기차 보조금 계산기',
    description: '2026년 전기차 국비·지방비·추가지원 보조금과 실구매가 계산',
    images: ['https://toolhub.ai.kr/og/ev-subsidy.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/ev-subsidy',
  },
}

export default function EvSubsidyPage() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '전기차 보조금 계산기',
      description: '2026년 보조금 지침과 무공해차 통합누리집 공고 금액으로 전기차 국비·지방비·추가지원과 실구매가를 계산하는 도구',
      url: 'https://toolhub.ai.kr/ev-subsidy',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      browserRequirements: 'JavaScript',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
      featureList: [
        '인기 전기차 24종 국비 보조금 (ev.or.kr 공고 금액)',
        '전국 160개 시·군 지방비 보조금 자동 반영',
        '전환지원금·청년 생애 첫차·차상위·다자녀 추가지원',
        '가격 구간(5,300만/8,500만원) 반영과 성능 기반 국비 추정',
        '실구매가·취득세 감면(최대 140만원) 계산',
        '5년 충전비 vs 휘발유 유류비 비교',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: '전기차 보조금 계산하는 방법',
      description: '2026년 전기차 보조금을 국비·지방비별로 계산하는 단계별 안내',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: '차종 선택',
          text: '인기 차종을 고르면 무공해차 통합누리집에 공고된 국비가 자동 입력됩니다. 목록에 없는 차는 국비를 직접 입력하거나 전비·주행거리로 추정합니다.',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: '가격 입력',
          text: '견적 차량 가격과 제조사 할인액을 입력합니다.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: '지역 선택',
          text: '시·도와 시·군·구를 고르면 해당 지자체의 지방비 보조금이 반영됩니다.',
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: '추가 지원 확인',
          text: '내연차 전환(판매·폐차), 청년 생애 첫차, 차상위, 다자녀에 해당하면 체크합니다.',
        },
        {
          '@type': 'HowToStep',
          position: 5,
          name: '결과 확인',
          text: '총 보조금과 실구매가, 취득세 감면, 지역별·차종별 비교를 확인하고 링크나 이미지로 공유합니다.',
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '2026년 전기차 국비 보조금은 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '2026년 전기승용차 국비는 중·대형 최대 580만원, 소형 최대 530만원입니다. 출고·보유 3년 이상 내연차를 팔거나 폐차하고 바꾸면 전환지원금 최대 100만원이 더해져 최대 680만원입니다. 기본가격 5,300만원 미만은 100%, 5,300만~8,500만원 미만은 50%, 8,500만원 이상은 지원되지 않습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '지방비 보조금은 지역마다 얼마나 다른가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '지자체는 국비의 30% 이상을 지방비로 지원해야 하며, 서울·부산·대구·인천 등은 국비의 약 30%입니다. 충북·충남·전북·경북의 많은 시·군은 국비와 비슷하거나 더 많이 지원하고, 일부 군 지역은 국비의 1.5배 이상입니다. 정확한 금액은 무공해차 통합누리집의 지자체별 차종·모델 보조금에서 확인할 수 있습니다.',
          },
        },
        {
          '@type': 'Question',
          name: '청년·차상위·다자녀 추가 보조금은 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '만 19~34세 청년이 생애 첫 차로 사면 국비의 20%, 차상위 이하 계층은 국비의 20%가 추가되며 중복 가능합니다. 18세 이하 자녀가 2명이면 100만원, 3명이면 200만원, 4명 이상이면 300만원이 추가됩니다.',
          },
        },
        {
          '@type': 'Question',
          name: '전기차 취득세 감면은 얼마인가요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '2026년 12월 31일까지 등록하는 전기차는 취득세를 최대 140만원까지 감면받습니다. 2027년부터 한도를 70만원으로 줄이는 개정안이 입법예고됐습니다.',
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
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <EvSubsidyCalculator />
            </I18nWrapper>
        </div>
      </div>
    </>
  )
}
