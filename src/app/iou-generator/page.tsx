import { Metadata } from 'next'
import IouGenerator from '@/components/IouGenerator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '차용증 양식 작성기 - 무료 PDF·금액 한글 표기 | 툴허브',
  description: '차용증 양식을 빈칸만 채워 바로 만드세요. 금액 한글·숫자 병기, 이자제한법 연 20% 상한 확인, 원리금균등·원금균등·만기일시 상환표, 연대보증인·특약, 이름 도장 자동 생성, A4 PDF·인쇄까지 무료.',
  keywords: '차용증, 차용증 양식, 차용증 작성법, 차용증 쓰는법, 개인간 차용증, 가족 차용증, 차용증 PDF, 금전차용증서, 이자제한법, 차용증 공증',
  openGraph: {
    title: '차용증 양식 작성기 | 툴허브',
    description: '빈칸만 채우면 완성되는 차용증. 금액 한글 표기·이자 상한 확인·상환표·PDF 출력.',
    url: 'https://toolhub.ai.kr/iou-generator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '차용증 양식 작성기',
    description: '빈칸만 채우면 완성되는 차용증 PDF',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/iou-generator/',
  },
}

// 컴포넌트 가이드 FAQ(messages iouGenerator.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  {
    q: '차용증은 손으로 쓰지 않아도 효력이 있나요?',
    a: '네. 차용증은 형식이 정해진 문서가 아니어서 컴퓨터로 작성해 출력해도 효력이 있습니다. 채권자·채무자, 금액, 차용일, 변제기일, 이자를 적고 채무자가 서명이나 날인을 하면 됩니다. 실제로 돈을 보낸 계좌이체 기록을 함께 남겨 두면 증거력이 높아집니다.',
  },
  {
    q: '개인 간 차용 이자는 최고 몇 %까지 받을 수 있나요?',
    a: '이자제한법상 최고이자율은 연 20%입니다(2021년 7월 7일 이후 계약). 20%를 넘는 부분은 무효이고, 이미 받았다면 원금에 충당되거나 돌려줘야 합니다. 연체 시 지연손해금도 같은 상한이 적용됩니다.',
  },
  {
    q: '가족에게 돈을 빌릴 때 차용증을 쓰면 증여세가 안 나오나요?',
    a: '차용증과 함께 약정한 이자와 원금을 실제로 갚은 기록이 있어야 빌린 돈으로 인정받습니다. 무이자나 저리라면 세법상 적정이자율 연 4.6%와의 이자 차액이 연 1천만원 이상일 때 그 차액에 증여세가 붙습니다. 무이자 기준 원금 약 2억 1,739만원까지는 이자 차액이 1천만원 미만입니다.',
  },
  {
    q: '이자를 받으면 세금을 내야 하나요?',
    a: '개인 간 대여 이자는 비영업대금의 이익으로 소득세 25%와 지방소득세 2.5%, 합계 27.5%가 원천징수 대상입니다. 이자를 지급하는 쪽이 떼어 다음 달 10일까지 신고·납부하는 것이 원칙입니다.',
  },
  {
    q: '차용증 공증은 꼭 받아야 하나요?',
    a: '필수는 아니지만, 공증사무소에서 강제집행 승낙 문구가 들어간 금전소비대차 공정증서를 만들어 두면 돈을 갚지 않을 때 소송 없이 바로 강제집행을 신청할 수 있습니다. 금액이 크거나 상환 기간이 길면 공증을 권합니다.',
  },
  {
    q: '빌려준 돈은 언제까지 받을 수 있나요?',
    a: '개인 간 대여금 채권의 소멸시효는 변제기일부터 10년입니다(민법 제162조). 상인 간 거래처럼 상행위로 생긴 채권은 5년입니다. 시효가 다가오면 지급명령·소송·가압류 등으로 시효를 중단해야 합니다.',
  },
]

export default function IouGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '차용증 양식 작성기',
    description: '차용증 양식을 작성하고 A4 PDF로 저장·인쇄합니다. 금액 한글 표기, 이자 상한 확인, 상환 일정표.',
    url: 'https://toolhub.ai.kr/iou-generator',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '차용증 표준 문안 자동 작성',
      '금액 한글·숫자 병기 (금 일천만원정)',
      '이자제한법 연 20% 상한·지연손해금 확인',
      '만기일시·원리금균등·원금균등 상환 일정표',
      '가족 간 차용 증여세(적정이자율 4.6%) 안내',
      '연대보증인·기한이익 상실 등 특약',
      '이름 도장 자동 생성·도장 이미지',
      'A4 PDF 저장·인쇄',
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper>
            <IouGenerator />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">차용증 작성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            차용증은 돈을 빌리고 빌려준 사실과 갚을 조건을 적어 두는 문서입니다. 이 작성기는 채권자·채무자 정보와 금액, 기간, 이자만 입력하면
            한국에서 통용되는 차용증 문안을 A4 양식으로 바로 만들어 줍니다. 금액은 &lsquo;금 일천만원정 (₩10,000,000)&rsquo;처럼 한글과 숫자를 함께 적어
            위·변조를 막고, 이자제한법 상한과 가족 간 차용 증여세 기준을 함께 확인할 수 있습니다. 입력한 내용은 내 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">차용증 작성 시 꼭 넣어야 할 것</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>당사자:</strong> 채권자와 채무자의 이름, 생년월일(주민번호 앞자리), 주소, 연락처.</li>
            <li><strong>금액:</strong> 한글과 숫자를 함께 적고, 실제 지급은 계좌이체로 해 기록을 남기세요.</li>
            <li><strong>기간과 이자:</strong> 차용일, 변제기일, 이자율(연 20% 이하), 이자 지급일과 상환 방법.</li>
            <li><strong>특약:</strong> 기한이익 상실, 지연손해금, 연대보증, 관할법원 등 분쟁에 대비한 조항.</li>
            <li><strong>서명·날인:</strong> 채무자가 직접 서명하고 인감도장을 찍은 뒤 인감증명서를 첨부하면 본인 확인이 확실해집니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
