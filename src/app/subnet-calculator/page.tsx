import { Metadata } from 'next'
import SubnetCalculator from '@/components/SubnetCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'IP 서브넷 계산기 - CIDR·VLSM·IPv6 | 툴허브',
  description: 'IPv4·IPv6 서브넷 계산기. 192.168.1.10/24, 서브넷마스크, 와일드카드 마스크를 바로 인식해 네트워크·브로드캐스트·호스트 범위를 계산하고, VLSM 분할, 경로 요약, IP 범위→CIDR 변환, CSV 내보내기까지 지원합니다.',
  keywords: 'IP 서브넷 계산기, CIDR 계산기, 서브넷마스크, 와일드카드 마스크, VLSM 계산기, 서브넷팅, 슈퍼넷, 경로 요약, IP 범위 CIDR 변환, IPv6 서브넷 계산기, ipcalc',
  openGraph: {
    title: 'IP 서브넷 계산기 | 툴허브',
    description: 'CIDR·마스크·와일드카드 인식, VLSM 분할, 경로 요약, 범위→CIDR, IPv6까지.',
    url: 'https://toolhub.ai.kr/subnet-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IP 서브넷 계산기 | 툴허브',
    description: 'CIDR·VLSM·경로 요약·IPv6 서브넷 계산.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/subnet-calculator/',
  },
}

const faqData = [
  {
    question: 'CIDR 표기법이란 무엇인가요?',
    answer: 'CIDR(Classless Inter-Domain Routing)은 IP 주소 뒤에 슬래시(/)와 프리픽스 길이를 붙여 네트워크 범위를 표현하는 방법입니다. 예를 들어 192.168.1.0/24는 앞 24비트가 네트워크 부분임을 의미하며, 이는 서브넷마스크 255.255.255.0과 같습니다.',
  },
  {
    question: '서브넷마스크와 와일드카드 마스크의 차이점은?',
    answer: '서브넷마스크는 네트워크 부분을 1로, 호스트 부분을 0으로 표시합니다(예: 255.255.255.0). 와일드카드 마스크는 반대로 호스트 부분을 1로 표시합니다(예: 0.0.0.255). 와일드카드 마스크는 주로 ACL(접근 제어 목록)이나 라우팅 프로토콜에서 사용됩니다.',
  },
  {
    question: 'VLSM 서브넷 분할은 어떻게 하나요?',
    answer: '서브넷 분할 탭에서 VLSM을 선택하고 부서별 필요한 호스트 수를 한 줄에 하나씩 입력하면, 큰 요구부터 가장 작은 블록을 순서대로 배치해 네트워크·사용 범위·브로드캐스트·마스크 표를 만들어 줍니다. 결과는 CSV로 내려받거나 마크다운 표로 복사할 수 있습니다.',
  },
  {
    question: '/31 서브넷은 호스트가 몇 개인가요?',
    answer: 'RFC 3021에 따라 /31은 라우터 간 point-to-point 링크용으로 브로드캐스트 주소 없이 주소 2개를 모두 사용합니다. /32는 단일 호스트를 뜻합니다.',
  },
  {
    question: '사설 IP 주소 대역은 어떻게 되나요?',
    answer: 'RFC 1918에서 정의된 사설 IP 대역은 세 가지입니다: 10.0.0.0/8 (클래스 A), 172.16.0.0/12 (클래스 B), 192.168.0.0/16 (클래스 C). 이 주소들은 인터넷에서 라우팅되지 않으며, 내부 네트워크에서 자유롭게 사용할 수 있습니다.',
  },
]

export default function SubnetCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'IP 서브넷 계산기',
    description: 'IPv4·IPv6 서브넷 계산, VLSM 분할, 경로 요약, 범위→CIDR 변환 도구',
    url: 'https://toolhub.ai.kr/subnet-calculator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      'CIDR·서브넷마스크·와일드카드 마스크 자동 인식',
      '네트워크·브로드캐스트·첫/마지막 호스트, /31(RFC 3021)·/32 처리',
      '사설·CGNAT·루프백·링크로컬·멀티캐스트·문서용 대역 판별',
      '바이너리·16진수·역방향 DNS 존(in-addr.arpa)',
      'VLSM 분할과 균등 분할, CSV·마크다운 내보내기',
      'CIDR 목록 요약(슈퍼넷)·겹침 검사',
      'IP 범위 → 최소 CIDR 변환, IP 소속(최장 일치) 확인',
      'IPv6 압축·확장, 주소 수, /48→/64 분할 개수',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <SubnetCalculator />
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
            IP 서브넷 계산기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            IP 서브넷 계산기는 192.168.1.10/24, 10.0.0.1 255.255.255.0, 10.0.0.0 0.255.255.255처럼 CIDR·서브넷마스크·와일드카드 마스크 어느 형식으로 입력해도 바로 인식해 네트워크 주소, 브로드캐스트 주소, 사용 가능한 호스트 범위와 개수, 바이너리·16진수 표현, 역방향 DNS 존까지 계산하는 네트워크 엔지니어용 도구입니다. VLSM 서브넷 분할, CIDR 목록 요약과 겹침 검사, IP 범위의 최소 CIDR 변환, IPv6 계산도 한 페이지에서 할 수 있고, 모든 계산은 브라우저에서만 이루어집니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            서브넷 계산기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>CIDR 표기법 이해:</strong> /24는 앞 24비트가 네트워크 부분으로 255.255.255.0과 같으며, 254개의 호스트를 수용합니다. /16은 65,534개, /8은 16,777,214개입니다.</li>
            <li><strong>사설 IP 대역 파악:</strong> 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16이 사설 대역입니다. 100.64.0.0/10(CGNAT)은 통신사 NAT 구간이라 사내망에 쓰면 충돌할 수 있습니다.</li>
            <li><strong>네트워크 분할(서브넷팅):</strong> 프리픽스 길이를 늘리면(예: /24 → /26) 서브넷 4개로 균등 분할됩니다. 부서마다 호스트 수가 다르면 VLSM으로 큰 요구부터 배치하세요.</li>
            <li><strong>ACL·방화벽 설정:</strong> 와일드카드 마스크(0.0.0.255)는 Cisco ACL에서 서브넷마스크와 반대로 씁니다. 10.0.0.5~10.0.0.20 같은 임의 범위는 범위→CIDR 탭에서 최소 CIDR 목록으로 바꿔 넣으세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
