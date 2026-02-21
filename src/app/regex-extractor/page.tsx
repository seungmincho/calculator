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
    canonical: 'https://toolhub.ai.kr/regex-extractor',
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
    </>
  )
}