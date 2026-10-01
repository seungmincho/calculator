import { Metadata } from 'next'
import PowerOfAttorney from '@/components/PowerOfAttorney'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '위임장 양식 작성기 - 용도별 위임장 무료 PDF | 툴허브',
  description: '위임장 양식을 용도만 골라 바로 만드세요. 주민센터 등본·가족관계증명서, 자동차 이전, 은행, 부동산 계약·등기, 법인 업무 위임 사항 자동 입력, 준비 서류 안내, 인감증명 위임 주의사항, 도장·A4 PDF·인쇄까지 무료.',
  keywords: '위임장, 위임장 양식, 위임장 쓰는법, 위임장 작성법, 주민센터 위임장, 등본 위임장, 가족관계증명서 위임장, 인감증명서 위임장, 자동차 이전 위임장, 은행 위임장, 부동산 위임장, 법인 위임장',
  openGraph: {
    title: '위임장 양식 작성기 | 툴허브',
    description: '용도만 고르면 위임 사항·준비 서류가 채워지는 위임장. 도장·PDF 출력.',
    url: 'https://toolhub.ai.kr/power-of-attorney',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '위임장 양식 작성기',
    description: '용도별 위임장을 빈칸만 채워 PDF로',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/power-of-attorney/',
  },
}

// 컴포넌트 가이드 FAQ(messages powerOfAttorney.guide.faq)와 같은 내용 — 화면에 보이는 FAQ만 구조화 데이터로
const faqs = [
  {
    q: '가족이 대신 서류를 떼려면 위임장이 꼭 있어야 하나요?',
    a: '서류마다 달라요. 주민등록표 등·초본은 같은 세대원이면 위임장 없이 뗄 수 있어요. 가족관계증명서는 본인의 배우자와 직계혈족(부모·자녀·조부모 등)이 위임장 없이 신청할 수 있지만, 형제자매는 위임장과 위임인 신분증 사본이 필요해요. 인감증명서는 가족이라도 공식 서식 위임장과 위임인 신분증 원본이 있어야 해요.',
  },
  {
    q: '위임장 유효기간은 얼마인가요?',
    a: '일반 위임장은 법으로 정한 유효기간이 없어서 적어 둔 기간까지, 기간이 없으면 일이 끝나거나 위임을 철회할 때까지 효력이 있어요. 인감증명서 발급 위임장만은 위임일부터 6개월로 정해져 있어요(인감증명법 시행령 제13조). 다만 은행·관공서는 보통 최근 1~3개월 안에 작성한 위임장을 요구해요.',
  },
  {
    q: '도장이 없으면 서명만 해도 되나요?',
    a: '주민센터 서류 발급처럼 일반적인 위임은 위임인의 자필 서명으로 충분해요. 은행·부동산·자동차처럼 재산이 오가는 일은 인감도장 날인과 인감증명서를 요구하는 곳이 많은데, 인감 대신 본인서명사실확인서를 내고 위임장에 같은 서명을 해도 돼요.',
  },
  {
    q: '인감증명서 대리 발급도 이 위임장으로 되나요?',
    a: '안 돼요. 인감증명서는 인감증명법 시행령 별지 제13호서식 ‘인감증명서 발급 위임장’을 써야 하고, 위임인이 직접 손으로 작성해야 해요. 주민센터에 비치돼 있고 정부24에서도 내려받을 수 있어요. 이 작성기에서 인감증명서 발급을 고르면 필요한 준비물을 확인할 수 있어요.',
  },
  {
    q: '컴퓨터로 작성해서 출력해도 효력이 있나요?',
    a: '네. 일반 위임장은 정해진 형식이 없어서 출력해도 효력이 있어요. 서명이나 날인은 출력한 뒤 위임인이 직접 하세요. 인감증명서 발급 위임장처럼 자필 작성을 요구하는 공식 서식만 예외예요.',
  },
]

export default function PowerOfAttorneyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '위임장 양식 작성기',
    description: '용도별 위임장을 작성하고 A4 PDF로 저장·인쇄합니다. 위임 사항 자동 입력, 준비 서류 안내, 포괄 위임 경고.',
    url: 'https://toolhub.ai.kr/power-of-attorney',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '용도별 위임장 프리셋 (주민센터·인감·자동차·은행·부동산·법원·법인)',
      '위임 사항 체크박스 + 직접 입력',
      '용도별 지참 서류 안내',
      '개인·법인 위임인 지원',
      '위임 기간 오류·포괄 위임 위험 검사',
      '인감증명서 발급 위임 공식 서식·본인서명사실확인서 안내',
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
            <PowerOfAttorney />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">위임장 작성기란?</h2>
          <p className="text-body leading-relaxed mb-6">
            위임장은 본인이 직접 하기 어려운 일을 다른 사람에게 맡긴다는 사실을 적은 문서입니다. 이 작성기는 주민센터 서류 발급, 자동차 등록,
            은행 업무, 부동산 계약·등기, 법인 업무처럼 용도를 고르면 위임 사항 문구와 방문할 때 챙길 서류를 자동으로 채워 주고, 위임인·대리인
            정보만 입력하면 &lsquo;위 임 장&rsquo; 표준 양식을 A4로 바로 만들어 줍니다. 입력한 내용은 내 브라우저에만 저장됩니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">위임장 작성 시 꼭 확인할 것</h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>위임 사항은 구체적으로:</strong> &lsquo;모든 권한&rsquo;처럼 범위 없는 포괄 위임은 악용될 수 있고 은행·등기소에서 받아 주지 않기도 합니다.</li>
            <li><strong>대상과 제출처:</strong> 계좌번호, 차량번호, 부동산 소재지와 어느 기관에 내는지 적어 두면 창구에서 막히지 않습니다.</li>
            <li><strong>서명·날인:</strong> 일반 위임은 서명으로 충분하지만 재산이 오가는 일은 인감도장과 인감증명서(또는 본인서명사실확인서)를 요구하는 곳이 많습니다.</li>
            <li><strong>인감증명서 대리 발급:</strong> 이 양식이 아닌 인감증명법 시행령 공식 서식을 위임인이 자필로 작성해야 하며, 위임장은 6개월간 유효합니다.</li>
            <li><strong>대리인 신분증:</strong> 대리인은 본인 신분증 원본을 꼭 지참해야 합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
