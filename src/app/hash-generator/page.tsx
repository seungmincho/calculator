import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import HashGenerator from '@/components/HashGenerator'

export const metadata: Metadata = {
  title: '해시 생성기 - MD5, SHA-256, SHA-512 해시 변환 | 툴허브',
  description: '텍스트와 파일의 해시값을 생성합니다. MD5, SHA-1, SHA-256, SHA-384, SHA-512 알고리즘을 지원합니다.',
  keywords: '해시생성기, md5, sha256, sha512, 해시변환, 체크섬, hash generator',
  openGraph: {
    title: '해시 생성기 - 온라인 해시 변환 도구',
    description: '텍스트와 파일의 해시값을 생성하세요',
    type: 'website',
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/hash-generator',
  },
}

export default function HashGeneratorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '해시 생성기',
    description: '텍스트와 파일의 해시값을 생성합니다. MD5, SHA-1, SHA-256, SHA-384, SHA-512 알고리즘을 지원합니다.',
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
    </>
  )
}
