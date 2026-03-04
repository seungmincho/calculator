import { Metadata } from 'next'
import RegexExtractor from '@/components/RegexExtractor'

export const metadata: Metadata = {
  title: '정규식 추출기 | grep, 패턴 매칭, 문자열 치환 도구 | 툴허브',
  description: '강력한 정규식으로 텍스트를 검색, 추출, 변환하세요. grep 필터링, 패턴 매칭, 문자열 치환을 한 곳에서! 개발자 필수 도구.',
  keywords: [
    '정규식 추출기',
    'regex extractor',
    'grep 도구',
    '패턴 매칭',
    '문자열 치환',
    '정규표현식',
    '텍스트 처리',
    '로그 파일 분석',
    '데이터 추출',
    '문자열 검색',
    '정규식 테스터',
    'regex tester',
    '텍스트 필터링',
    '패턴 검색',
    '문자열 파싱',
    '데이터 마이닝',
    '텍스트 마이닝',
    '개발자 도구'
  ],
  authors: [{ name: '툴허브' }],
  openGraph: {
    title: '정규식 추출기 | grep, 패턴 매칭, 문자열 치환 도구',
    description: '강력한 정규식으로 텍스트를 검색, 추출, 변환하세요. grep 필터링, 패턴 매칭, 문자열 치환을 한 곳에서!',
    type: 'website',
    url: 'https://toolhub.ai.kr/regex-extractor',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: '정규식 추출기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '정규식 추출기 | grep, 패턴 매칭, 문자열 치환 도구',
    description: '강력한 정규식으로 텍스트를 검색, 추출, 변환하세요. grep 필터링, 패턴 매칭, 문자열 치환을 한 곳에서!',
    images: ['https://toolhub.ai.kr/og-image-1200x630.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/regex-extractor/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RegexExtractorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '정규식 추출기',
    description: '강력한 정규식으로 텍스트를 검색, 추출, 변환하세요. grep 필터링, 패턴 매칭, 문자열 치환을 한 곳에서!',
    url: 'https://toolhub.ai.kr/regex-extractor',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['정규식 패턴 매칭', '매칭 결과 추출', '플래그 설정', '실시간 미리보기']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '정규식(Regular Expression)이란 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '정규식(RegExp)은 문자열에서 특정 패턴을 찾기 위한 표현식입니다. 예: \\d{3}-\\d{4}-\\d{4}는 전화번호 패턴을 매칭합니다. 주요 메타문자: . (아무 문자), \\d (숫자), \\w (단어 문자), * (0회 이상), + (1회 이상), ? (0 또는 1회), [] (문자 클래스), () (그룹). 텍스트 검색, 유효성 검사, 데이터 추출에 널리 사용됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '자주 사용하는 정규식 패턴은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '이메일: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}. 한국 전화번호: 01[016789]-?\\d{3,4}-?\\d{4}. URL: https?://[\\w.-]+(?:/[\\w./?%&=-]*)?. IP 주소: \\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}. 한글만: [가-힣]+. 숫자와 쉼표: [\\d,]+. HTML 태그: <[^>]+>. 이 패턴들은 시작점이며 실제 사용 시 더 정확한 검증이 필요합니다.'
        }
      },
      {
        '@type': 'Question',
        name: '정규식 플래그(g, i, m)의 의미는?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'g (global): 첫 매칭 후 멈추지 않고 모든 매칭을 찾습니다. i (case-insensitive): 대소문자를 구분하지 않습니다. m (multiline): ^와 $가 각 줄의 시작/끝에 매칭됩니다. s (dotAll): .이 줄바꿈 문자도 매칭합니다. u (unicode): 유니코드를 정확히 처리합니다. 예: /hello/gi는 Hello, HELLO, hello 모두 전체 텍스트에서 찾습니다.'
        }
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <RegexExtractor />
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            정규식 추출기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            정규식 추출기는 강력한 정규표현식(RegExp)으로 대용량 텍스트에서 원하는 데이터를 검색·추출·치환하는 개발자용 도구입니다. 로그 파일 분석, 데이터 마이닝, CSV 파싱, 텍스트 필터링 등 반복적인 문자열 처리 작업을 빠르게 수행할 수 있어 백엔드 개발자, 데이터 분석가, 시스템 관리자에게 특히 유용합니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            정규식 추출기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>로그 파일 분석:</strong> 서버 로그에서 에러 코드, IP 주소, 타임스탬프를 정규식으로 한 번에 추출하면 수동 검색 대비 분석 시간을 크게 줄일 수 있습니다.</li>
            <li><strong>grep 필터링 활용:</strong> 여러 줄의 텍스트 중 패턴과 일치하는 줄만 필터링하는 grep 모드를 사용하면 필요한 데이터만 빠르게 선별할 수 있습니다.</li>
            <li><strong>캡처 그룹으로 데이터 추출:</strong> 괄호 ()로 그룹을 만들면 매칭된 전체 문자열이 아닌 원하는 부분만 선택적으로 추출할 수 있습니다.</li>
            <li><strong>문자열 치환으로 데이터 변환:</strong> 추출과 함께 치환 기능을 사용하면 데이터 포맷을 변환하거나 개인정보를 마스킹하는 작업을 일괄 처리할 수 있습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}