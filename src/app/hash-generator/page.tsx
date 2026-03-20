import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import HashGenerator from '@/components/HashGenerator'

export const metadata: Metadata = {
  title: '해시 생성기 - MD5, SHA-256, SHA-512 해시 변환 | 툴허브',
  description: '텍스트와 파일의 해시값을 브라우저에서 바로 생성합니다. MD5, SHA-1, SHA-256, SHA-512 알고리즘을 지원하며 파일 무결성 검증에 활용하세요.',
  keywords: '해시생성기, md5, sha256, sha512, 해시변환, 체크섬, hash generator',
  openGraph: {
    title: '해시 생성기 - 온라인 해시 변환 도구',
    description: '텍스트와 파일의 해시값을 생성하세요',
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/hash-generator',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '해시 생성기 - MD5, SHA-256, SHA-512 해시 변환',
    description: '텍스트와 파일의 해시값을 브라우저에서 바로 생성합니다. MD5, SHA-1, SHA-256, SHA-512 알고리즘을 지원하며 파일 무결성 검증에 활용하세요.',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/hash-generator/',
  },
}

export default function HashGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '해시 생성기',
    description: '텍스트와 파일의 해시값을 브라우저에서 바로 생성합니다. MD5, SHA-1, SHA-256, SHA-512 알고리즘을 지원하며 파일 무결성 검증에 활용하세요.',
    url: 'https://toolhub.ai.kr/hash-generator',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['MD5 해시', 'SHA-1 해시', 'SHA-256 해시', 'SHA-512 해시', '파일 해시']
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '해시 함수란 무엇이고 어디에 사용되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '해시 함수는 임의 크기의 데이터를 고정 크기의 문자열로 변환하는 단방향 함수입니다. 같은 입력은 항상 같은 해시를 생성하지만, 해시에서 원본을 복원할 수 없습니다. 주요 용도: ① 비밀번호 저장(원본 대신 해시 저장) ② 파일 무결성 검증(다운로드 파일 변조 확인) ③ 디지털 서명 ④ 블록체인 ⑤ 데이터 중복 검출입니다.',
        },
      },
      {
        '@type': 'Question',
        name: 'MD5, SHA-1, SHA-256의 차이와 안전성은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MD5: 128비트 해시, 빠르지만 충돌 공격에 취약하여 보안 목적으로는 사용 금지. 파일 체크섬 용도로만 사용. SHA-1: 160비트 해시, 2017년 구글이 충돌을 입증하여 더 이상 안전하지 않음. SHA-256: 256비트 해시, 현재 가장 널리 사용되는 안전한 해시. 비트코인, TLS 인증서 등에 사용. SHA-512: 512비트 해시, 64비트 시스템에서 SHA-256보다 빠를 수 있음.',
        },
      },
      {
        '@type': 'Question',
        name: '해시와 암호화의 차이점은?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '해시는 단방향 함수로 원본 복원이 불가능하며, 고정 길이 출력을 생성합니다. 비밀번호 저장, 무결성 검증에 사용됩니다. 암호화는 양방향 함수로 키를 사용하여 암호문을 원본으로 복원할 수 있습니다. 대칭키 암호화(AES)는 하나의 키로, 비대칭키 암호화(RSA)는 공개키/개인키 쌍으로 작동합니다. 데이터 보호에는 암호화, 검증에는 해시를 사용합니다.',
        },
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <I18nWrapper>
        <HashGenerator />
      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            해시 생성기란?
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            해시 생성기는 텍스트나 파일을 입력하면 MD5·SHA-1·SHA-256·SHA-384·SHA-512 등 다양한 암호화 해시 알고리즘으로 해시값을 즉시 생성하는 무료 온라인 도구입니다. 파일 무결성 검증, 비밀번호 저장 방식 확인, 데이터 변조 탐지, 체크섬 계산 등 보안 및 개발 업무에 폭넓게 활용됩니다.
          </p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            해시 생성기 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>파일 무결성 확인:</strong> 소프트웨어 다운로드 후 공식 사이트의 SHA-256 체크섬과 비교하면 파일 변조 여부를 검증할 수 있습니다.</li>
            <li><strong>알고리즘 선택:</strong> 보안이 중요한 용도에는 SHA-256 이상을 사용하세요. MD5와 SHA-1은 충돌 취약점이 발견되어 보안 목적으로는 사용을 권장하지 않습니다.</li>
            <li><strong>비밀번호 저장 검증:</strong> 서비스에서 비밀번호를 어떤 방식으로 해시하는지 확인할 때 활용할 수 있습니다. bcrypt·Argon2가 비밀번호 저장에 권장됩니다.</li>
            <li><strong>대소문자 구분:</strong> 해시값은 대소문자 구분 없이 동일하게 인식되지만, 입력 텍스트의 공백 한 칸 차이도 완전히 다른 해시를 생성합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
