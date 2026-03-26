import { Metadata } from 'next'
import { Suspense } from 'react'
import ChmodCalculator from '@/components/ChmodCalculator'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: 'chmod 권한 계산기 - 파일 권한 변환 | 툴허브',
  description: 'Unix/Linux 파일 권한을 시각적으로 설정하세요. rwxrwxrwx 체크박스로 권한을 선택하면 chmod 숫자(755, 644 등)와 명령어가 자동 생성됩니다. 심볼릭 모드도 지원합니다.',
  keywords: [
    'chmod 계산기',
    'chmod calculator',
    '파일 권한',
    'Linux 권한',
    'Unix 권한',
    'rwx 권한',
    '755 권한',
    '644 권한',
    '777 권한',
    '파일 퍼미션',
    'permission calculator',
    'octal permission',
    '권한 변환',
    'symbolic mode',
    '파일 보안',
    'Linux 명령어'
  ],
  openGraph: {
    title: 'chmod 권한 계산기 - 파일 권한 변환 | 툴허브',
    description: 'Unix/Linux 파일 권한을 시각적으로 설정하세요. rwxrwxrwx 체크박스로 권한을 선택하면 chmod 숫자와 명령어가 자동 생성됩니다.',
    url: 'https://toolhub.ai.kr/chmod-calculator',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'chmod 권한 계산기 | 툴허브',
    description: 'Unix/Linux 파일 권한을 시각적으로 설정. rwxrwxrwx 체크박스로 chmod 숫자와 명령어 자동 생성',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/chmod-calculator/',
  },
}

export default function ChmodCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'chmod 권한 계산기',
    description: 'Unix/Linux 파일 권한을 시각적으로 설정하세요. rwxrwxrwx 체크박스로 권한을 선택하면 chmod 숫자(755, 644 등)와 명령어가 자동 생성됩니다.',
    url: 'https://toolhub.ai.kr/chmod-calculator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '8진수 권한 입력/출력 (755, 644 등)',
      '체크박스 기반 rwx 권한 설정',
      'chmod 명령어 자동 생성',
      '심볼릭 모드 명령어 생성',
      '자주 쓰는 프리셋 제공',
      '권한 설명 텍스트'
    ]
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'chmod 755와 644의 차이는 무엇인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'chmod 755는 소유자에게 읽기·쓰기·실행(7), 그룹과 기타 사용자에게 읽기·실행(5)을 허용합니다. 주로 실행 가능한 파일이나 디렉토리에 사용합니다. chmod 644는 소유자에게 읽기·쓰기(6), 그룹과 기타 사용자에게 읽기(4)만 허용합니다. 일반 텍스트 파일, 설정 파일, 웹 HTML 파일에 적합합니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'chmod 777은 왜 위험한가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'chmod 777은 소유자, 그룹, 기타 모든 사용자에게 읽기·쓰기·실행 권한을 부여합니다. 이는 서버에 접속하는 누구나 해당 파일을 수정하거나 실행할 수 있음을 의미합니다. 악성 코드 삽입, 데이터 변조 등 보안 위협에 노출되므로 운영 환경에서는 절대 사용하지 않아야 합니다. 개발 환경에서도 최소 권한 원칙을 적용하는 것이 좋습니다.'
        }
      },
      {
        '@type': 'Question',
        name: 'chmod 숫자(8진수)는 어떻게 계산하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '각 자리는 소유자(Owner), 그룹(Group), 기타(Others)를 나타냅니다. 읽기(r)=4, 쓰기(w)=2, 실행(x)=1로 계산합니다. 예를 들어 rwx=4+2+1=7, r-x=4+0+1=5, r--=4+0+0=4입니다. 755는 소유자 rwx(7), 그룹 r-x(5), 기타 r-x(5)를 의미합니다. 이 계산기를 사용하면 체크박스를 클릭하는 것만으로 자동으로 숫자가 계산됩니다.'
        }
      },
    ],
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'chmod 권한 계산기 사용법',
    description: 'Unix/Linux 파일 권한을 시각적으로 설정하고 chmod 명령어를 생성하는 방법',
    step: [
      {
        '@type': 'HowToStep',
        name: '권한 체크박스 선택',
        text: '소유자(Owner), 그룹(Group), 기타(Others) 각각에 대해 읽기(r), 쓰기(w), 실행(x) 체크박스를 클릭하여 원하는 권한을 설정합니다.',
        position: 1
      },
      {
        '@type': 'HowToStep',
        name: '숫자 권한 확인',
        text: '체크박스 선택에 따라 8진수 숫자(예: 755, 644)와 심볼릭 표기(예: rwxr-xr-x)가 실시간으로 업데이트됩니다.',
        position: 2
      },
      {
        '@type': 'HowToStep',
        name: '명령어 복사',
        text: '자동 생성된 chmod 명령어(예: chmod 755 filename)를 복사 버튼으로 클립보드에 복사하여 터미널에 붙여넣습니다.',
        position: 3
      }
    ]
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <I18nWrapper>
        <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
          <ChmodCalculator />
        </Suspense>
        <div className="mt-8">
          <RelatedTools />
        </div>
      </I18nWrapper>
    </>
  )
}
