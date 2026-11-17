import { Metadata } from 'next'
import RegexExtractor from '@/components/RegexExtractor'
import ToolFaq from '@/components/ToolFaq'
import regexMessages from '@/../messages/generated/ko/ns/regexExtractor.json'

const TITLE = '정규식 추출기 - 작업 취소·전체 결과 TXT | 툴허브'
const DESCRIPTION = '정규식 추출·행 필터·치환을 별도 작업으로 실행하고 취소·재시도하세요. 마지막 성공 결과와 현재 입력을 구분하며 전체 결과 복사·TXT, 파일 읽기와 공유 입력 한도를 안내합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    url: 'https://toolhub.ai.kr/regex-extractor/',
    siteName: '툴허브',
    locale: 'ko_KR',
    images: [
      {
        url: 'https://toolhub.ai.kr/og/regex-extractor.png',
        width: 1200,
        height: 630,
        alt: '정규식 추출기 - 툴허브',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/regex-extractor.png'],
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
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/regex-extractor/',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['정규식 추출·행 필터·치환', 'Worker 작업 취소·재시도', '마지막 성공 결과 구분', '최대50,000단위 미리보기', '전체 결과 복사·TXT', '파일·공유 입력 한도 안내']
  }

  const faq = regexMessages.regexExtractor.guide.faq.items

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <RegexExtractor />
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            정규식 추출기란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            정규식 패턴에 맞는 문자열이나 행을 찾고 치환하는 도구입니다. 실행 중인 작업을 취소할 수 있고 오류·시간 제한·입력 한도를 표시합니다. 현재 작업이 실패하거나 취소되어도 이전 성공 결과를 구분해 남기며, 미리보기와 전체 복사·TXT의 범위를 명확히 안내합니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            정규식 추출기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>추출과 캡처:</strong> g 플래그는 전체 일치 목록을 출력하고, 비전역 추출은 첫 전체 일치와 캡처를 함께 출력합니다.</li>
            <li><strong>입력과 결과 한도:</strong> 파일4MiB·입력1,000,000 UTF-16단위·출력4,000,000단위 이하를 처리합니다. 화면 미리보기는 최대50,000단위이며 성공한 전체 결과를 반출할 수 있습니다.</li>
            <li><strong>중단과 복귀:</strong> 오래 걸리는 작업은 취소하세요.5초는 중단 기준이며 비활성 탭의 타이머 지연까지 엄격히 보장하는 시간은 아닙니다. 숨겨진 탭에서 취소한 작업은 돌아왔다는 이유로 자동 재개하지 않습니다.</li>
            <li><strong>공유 입력:</strong> 입력·패턴 등이 URL에 포함될 수 있으므로 공유 전 내용을 확인하세요. 주소 길이 한도를 넘으면 입력 일부를 잘라 공유하지 않습니다.</li>
          </ul>
        </div>
        <ToolFaq items={faq} />
      </section>
    </>
  )
}