import { Metadata } from 'next';
import TimeConverter from '@/components/TimeConverter';
import { FaqJsonLd } from '@/components/ToolFaq'
import timeConverterMessages from '../../../messages/generated/ko/ns/timeConverter.json'

export const metadata: Metadata = {
  title: '시간 변환기 - 타임존·Unix 변환 | 툴허브',
  description: '전 세계 타임존 변환, Unix 타임스탬프 변환, 상대시간 계산을 한 번에. 티켓팅, 국제회의, 해외 이벤트 시간 확인에 최적화된 도구입니다.',
  keywords: '시간변환기, 타임존변환, 시차계산, UTC변환, KST변환, Unix타임스탬프, 상대시간, 티켓팅시간, 세계시계, 시간대변환',
  openGraph: {
    title: '시간 변환기 - 전 세계 시간대 변환 도구',
    description: '타임존 변환부터 Unix 타임스탬프까지, 모든 시간 변환을 한 곳에서',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/time-converter/',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/time-converter.png',
        width: 1200,
        height: 630,
        alt: '시간 변환기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '시간 변환기 - 전 세계 시간대 변환 도구',
    description: '타임존 변환부터 Unix 타임스탬프까지, 모든 시간 변환을 한 곳에서',
    images: ['https://toolhub.ai.kr/og/time-converter.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/time-converter/',
  },
};

export default function TimeConverterPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '시간 변환기',
    description: '전 세계 타임존 변환, Unix 타임스탬프 변환, 상대시간 계산을 한 번에. 티켓팅, 국제회의, 해외 이벤트 시간 확인에 최적화된 도구입니다.',
    url: 'https://toolhub.ai.kr/time-converter/',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['타임존 변환(IANA·서머타임 자동)', 'Unix 타임스탬프 초·ms·µs·ns 자동 인식', 'ISO 8601·RFC 2822·SQL 형식 출력', '날짜 붙여넣기 자동 해석(한국어·영어)', '날짜 더하기·빼기, 두 시각 차이', '영업일 계산(한국 공휴일 반영)', '여러 도시 시간 비교']
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={timeConverterMessages.timeConverter.guide.faq.items} />
      <TimeConverter />

      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            시간 변환기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            시간 변환기는 전 세계 타임존(시간대) 변환, Unix 타임스탬프 변환, 상대시간 계산을 한 번에 처리하는 도구입니다. 해외 티켓팅 시간 확인, 국제 화상회의 일정 조율, API 개발 시 epoch 타임스탬프 변환 등 시간과 관련된 모든 작업에 활용할 수 있습니다. KST(한국 표준시)를 기준으로 UTC, PST, EST, JST 등 주요 시간대로 즉시 변환해 드립니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            시간 변환기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>해외 티켓팅:</strong> 미국, 유럽 공연·스포츠 티켓팅 시 현지 오픈 시간을 한국 시간으로 변환하여 놓치지 않을 수 있습니다.</li>
            <li><strong>Unix 타임스탬프 변환:</strong> 서버 로그, API 응답에 포함된 13자리(밀리초) 또는 10자리(초) 타임스탬프를 사람이 읽기 쉬운 날짜로 즉시 변환합니다.</li>
            <li><strong>ISO 8601 형식:</strong> 국제 표준 날짜 형식(YYYY-MM-DDTHH:mm:ssZ)을 파싱하고 원하는 타임존으로 변환하여 데이터 처리에 활용하세요.</li>
            <li><strong>국제 회의 일정:</strong> 서울 기준 회의 시간을 뉴욕·런던·베이징 참가자 현지 시간으로 한눈에 표시하여 시차 계산 실수를 방지합니다.</li>
          </ul>
        </div>
      </section>
    </>
  );
}