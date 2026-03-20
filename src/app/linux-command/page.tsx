import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import LinuxCommand from '@/components/LinuxCommand'
import RelatedTools from '@/components/RelatedTools'
import Breadcrumb from '@/components/Breadcrumb'

export const metadata: Metadata = {
  title: 'Linux 명령어 빌더 - 옵션 가이드 | 툴허브',
  description: 'Linux/Unix 명령어 옵션을 체크박스로 선택해 완성된 명령어를 자동 생성합니다. ls, grep, find, awk, sed 등 15가지 필수 명령어 레퍼런스.',
  keywords: '리눅스 명령어, linux command, 리눅스 옵션, grep, find, awk, sed, ls, chmod, linux terminal, 명령어 빌더',
  openGraph: {
    title: 'Linux 명령어 빌더 - 옵션 가이드 | 툴허브',
    description: 'Linux/Unix 명령어 옵션을 체크박스로 선택해 완성된 명령어를 자동 생성합니다.',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/linux-command',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Linux 명령어 빌더 - 옵션 가이드 | 툴허브',
    description: 'Linux/Unix 명령어 옵션을 체크박스로 선택해 완성된 명령어를 자동 생성합니다.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/linux-command/',
  },
}

export default function LinuxCommandPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Linux 명령어 빌더',
    description: 'Linux/Unix 명령어 옵션을 체크박스로 선택해 완성된 명령어를 자동 생성합니다. ls, grep, find, awk, sed 등 15가지 필수 명령어 레퍼런스.',
    url: 'https://toolhub.ai.kr/linux-command',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '15가지 필수 Linux 명령어',
      '체크박스 옵션 선택',
      '명령어 자동 생성',
      '인수/경로 직접 입력',
      '실전 예제 제공',
      '클립보드 복사',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Linux 명령어 옵션은 어떻게 확인하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Linux 명령어 옵션은 터미널에서 man 명령어(예: man ls)로 매뉴얼 페이지를 확인하거나, --help 플래그(예: ls --help)를 사용해 간단한 도움말을 볼 수 있습니다. 이 도구에서는 15개 핵심 명령어의 자주 쓰는 옵션을 체크박스로 선택해 바로 사용 가능한 명령어를 생성합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'grep과 find 명령어의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'grep은 파일 내용(텍스트)에서 패턴을 검색하는 명령어이고, find는 파일 시스템에서 파일이나 디렉터리를 이름, 크기, 수정 날짜 등의 조건으로 찾는 명령어입니다. 예를 들어 특정 텍스트가 포함된 파일을 찾으려면 grep -r "검색어" /경로 를 사용하고, 특정 확장자 파일을 찾으려면 find /경로 -name "*.log"를 사용합니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'chmod 숫자 권한(755, 644 등)은 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'chmod 숫자는 읽기(r=4), 쓰기(w=2), 실행(x=1)을 더해서 계산합니다. 세 자리가 각각 소유자/그룹/기타 권한을 의미합니다. 예를 들어 755는 소유자(7=4+2+1, rwx), 그룹(5=4+1, r-x), 기타(5=4+1, r-x)를 뜻합니다. 644는 소유자(6=4+2, rw-), 그룹과 기타(4=r--)만 읽기 가능한 일반 파일 권한입니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb />
            <LinuxCommand />
            <div className="mt-8">
              <RelatedTools />
            </div>
          </div>
        </div>
      </I18nWrapper>
    </>
  )
}
