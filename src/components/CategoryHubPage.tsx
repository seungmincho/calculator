import type { Metadata } from 'next'
import Link from 'next/link'
import { menuConfig, categoryHubs, type CategoryKey } from '@/config/menuConfig'
import ko from '../../messages/ko.json'
import CategoryHub from './CategoryHub'
import { glassCard } from '@/lib/glass'

const SITE = 'https://toolhub.ai.kr'
const links = ko.footer.links as Record<string, string>
const label = (labelKey: string) => links[labelKey.replace('footer.links.', '')] ?? labelKey

type HubKey = Exclude<CategoryKey, 'games'>

/** 카테고리별 SEO 카피 (한국어 검색 스니펫용). 도구 목록은 menuConfig에서 자동. */
const COPY: Record<HubKey, {
  h1: string; title: string; description: string; keywords: string
  intro: string[]; popular: string[]; faq: { q: string; a: string }[]
}> = {
  calculators: {
    h1: '금융·생활 계산기 모음',
    title: '금융·생활 계산기 모음 - 연봉·대출·세금·부동산 | 툴허브',
    description: '연봉 실수령액, 퇴직금, 대출 이자, 양도세·취득세, 전월세 전환까지 2026년 기준 무료 계산기 75종. 회원가입 없이 바로 계산하고 링크로 공유하세요.',
    keywords: '연봉계산기, 실수령액 계산기, 퇴직금 계산기, 대출 계산기, 세금 계산기, 부동산 계산기, 연차 계산기, 실업급여 계산기, 무료 계산기 모음',
    intro: [
      '월급명세서부터 내 집 마련까지, 돈 계산이 필요한 순간에 쓰는 계산기를 한곳에 모았습니다. 4대보험 요율·소득세율·취득세율 등은 2026년 개정 기준을 반영하며, 요율이 바뀌면 관련 계산기가 한 번에 갱신됩니다.',
      '모든 계산기는 입력값이 URL에 저장되어 결과를 링크 하나로 공유할 수 있고, 계산 근거(법령·요율·공식)를 결과 아래에 함께 보여줍니다.',
    ],
    popular: ['/salary-calculator', '/salary-table', '/severance-pay', '/loan-calculator', '/annual-leave', '/unemployment-benefit', '/capital-gains-tax', '/rent-converter'],
    faq: [
      { q: '계산 결과는 얼마나 정확한가요?', a: '4대보험·소득세는 2026년 확정 요율(국민연금 4.75%, 건강보험 3.595%, 고용보험 0.9%)과 누진세율을 적용합니다. 실제 급여는 회사의 비과세 항목·연말정산 결과에 따라 달라질 수 있으니 참고용으로 활용하세요.' },
      { q: '입력한 금액이 서버로 전송되나요?', a: '아니요. 모든 계산은 브라우저 안에서만 실행되며 입력값은 저장되지 않습니다. 공유 링크에는 사용자가 입력한 값만 포함됩니다.' },
      { q: '요율이 바뀌면 언제 반영되나요?', a: '정부 고시(보통 매년 12월~1월, 국민연금 상한은 7월) 확인 후 1~2주 내 반영하며, 각 계산기 상단에 기준 연도를 표시합니다.' },
    ],
  },
  tools: {
    h1: '개발자 도구·텍스트 유틸리티',
    title: '개발자 도구 모음 - JSON 포맷터·정규식·변환기·생성기 | 툴허브',
    description: 'JSON 포맷터, 정규식 추출기, JWT 디코더, Base64·URL 인코더, Cron 생성기, 글자수 세기 등 설치 없이 브라우저에서 쓰는 무료 개발·텍스트 도구 97종.',
    keywords: 'JSON 포맷터, 정규식 테스터, JWT 디코더, Base64 변환, URL 인코딩, Cron 생성기, 글자수 세기, UUID 생성, 해시 생성기, 개발자 도구 모음',
    intro: [
      '터미널을 열지 않아도 되는 일상 개발 작업 — JSON 정리, 정규식 확인, 토큰 디코딩, 인코딩 변환 — 을 브라우저에서 바로 처리합니다. 입력 데이터는 서버로 보내지 않고 로컬에서만 처리되어 사내 데이터를 붙여넣어도 안전합니다.',
      '텍스트·생성기·변환기 계열은 복사 버튼과 단축키를 기본 제공하고, 코드 편집기는 CodeMirror 기반으로 문법 강조와 접기를 지원합니다.',
    ],
    popular: ['/json-formatter', '/regex-extractor', '/jwt-decoder', '/base64-converter', '/character-counter', '/keyboard-converter', '/password-generator', '/qr-generator'],
    faq: [
      { q: '붙여넣은 JSON이나 토큰이 외부로 전송되나요?', a: '전송되지 않습니다. 포맷·디코딩·해시 계산은 전부 브라우저 JavaScript로 실행되며 네트워크 요청이 발생하지 않습니다.' },
      { q: '오프라인에서도 쓸 수 있나요?', a: '네. 툴허브는 PWA로 설치할 수 있고, 한 번 방문한 도구는 오프라인에서도 열립니다.' },
      { q: 'JSON5나 주석 있는 JSON도 처리되나요?', a: 'JSON 포맷터는 JSON5·JSONC 파싱과 깨진 JSON 자동 복구(jsonrepair)를 지원합니다.' },
    ],
  },
  media: {
    h1: '이미지·미디어 도구',
    title: '이미지 도구 모음 - 리사이즈·압축·워터마크·OCR·GIF | 툴허브',
    description: '이미지 리사이즈·압축·변환, 모자이크, 워터마크, 배경 제거, OCR 텍스트 추출, GIF 만들기, PDF 도구까지 업로드 없이 브라우저에서 처리하는 무료 미디어 도구 20종.',
    keywords: '이미지 리사이즈, 이미지 압축, 사진 모자이크, 이미지 워터마크, 배경 제거, OCR, GIF 만들기, 이미지 변환, PDF 도구, 화면 녹화',
    intro: [
      '사진 편집 앱을 설치하지 않아도 되는 가벼운 작업 — 크기 조절, 용량 줄이기, 얼굴 모자이크, 워터마크, 포맷 변환 — 을 브라우저에서 끝냅니다. 파일은 서버에 업로드되지 않고 기기 안에서만 처리됩니다.',
      '변환 결과는 원본 해상도를 유지하며, 여러 장을 한 번에 처리하는 일괄 모드와 결과 미리보기를 제공합니다.',
    ],
    popular: ['/image-resizer', '/image-mosaic', '/image-compressor', '/image-watermark', '/background-remover', '/image-ocr', '/gif-maker', '/pdf-tools'],
    faq: [
      { q: '사진이 서버에 저장되나요?', a: '아니요. 리사이즈·압축·모자이크 등 모든 처리는 브라우저 Canvas API로 기기 안에서 실행되며 파일이 외부로 나가지 않습니다.' },
      { q: '처리할 수 있는 파일 크기 제한이 있나요?', a: '서버 제한은 없고 기기 메모리에 따라 다릅니다. 일반적으로 20MB 이하 이미지는 모바일에서도 문제없이 처리됩니다.' },
      { q: '어떤 포맷을 지원하나요?', a: 'JPG, PNG, WebP, GIF, BMP를 읽고 JPG·PNG·WebP로 저장할 수 있습니다. HEIC는 브라우저 지원 여부에 따라 다릅니다.' },
    ],
  },
  health: {
    h1: '건강·심리 도구',
    title: '건강 계산기·심리 테스트 모음 - BMI·칼로리·MBTI·배란일 | 툴허브',
    description: 'BMI·체지방률·기초대사량·칼로리 계산기, 배란일·출산예정일, 수면 계산기, MBTI·에니어그램·퍼스널컬러 테스트까지 무료 건강·심리 도구 21종.',
    keywords: 'BMI 계산기, 칼로리 계산기, 체지방률 계산기, 배란일 계산기, 출산예정일 계산기, 수면 계산기, MBTI 검사, 에니어그램 테스트, 퍼스널컬러 진단',
    intro: [
      '몸 상태를 숫자로 확인하는 계산기(BMI, 체지방률, 기초대사량, 혈중알코올)와 기록 도구(혈압·혈당·식단 일지), 그리고 가볍게 즐기는 심리·성향 테스트를 모았습니다.',
      '계산 공식은 WHO·대한비만학회 등 공개 기준을 따르며, 기록 도구의 데이터는 기기(localStorage)에만 저장됩니다.',
    ],
    popular: ['/bmi-calculator', '/calorie-calculator', '/body-fat-calculator', '/ovulation-calculator', '/sleep-calculator', '/mbti-test', '/personal-color', '/enneagram'],
    faq: [
      { q: 'BMI 기준은 한국 기준인가요?', a: '네. 대한비만학회 기준(정상 18.5~22.9, 과체중 23~24.9, 비만 25 이상)을 기본으로 하고 WHO 기준도 함께 표시합니다.' },
      { q: '건강 기록은 어디에 저장되나요?', a: '혈압·혈당·식단 기록은 브라우저 localStorage에만 저장되며 서버로 전송되지 않습니다. CSV로 내보내 백업할 수 있습니다.' },
      { q: '심리 테스트 결과는 의학적 진단인가요?', a: '아니요. MBTI·에니어그램 등은 자기 이해를 돕는 참고용 성향 검사이며 의학적·심리학적 진단을 대신하지 않습니다.' },
    ],
  },
}

export function hubMetadata(category: HubKey): Metadata {
  const c = COPY[category]
  const url = `${SITE}${categoryHubs[category]}/`
  return {
    title: c.title,
    description: c.description,
    keywords: c.keywords,
    openGraph: { title: c.title, description: c.description, url, siteName: '툴허브', locale: 'ko_KR', type: 'website' },
    twitter: { card: 'summary_large_image', title: c.title, description: c.description },
    alternates: { canonical: url },
  }
}

export default function CategoryHubPage({ category }: { category: HubKey }) {
  const c = COPY[category]
  const items = menuConfig[category].items
  const url = `${SITE}${categoryHubs[category]}/`
  const byHref = new Map(items.map(i => [i.href, i]))
  const popular = c.popular.flatMap(h => byHref.get(h) ?? [])

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: c.h1,
      description: c.description,
      url,
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: SITE },
          { '@type': 'ListItem', position: 2, name: c.h1, item: url },
        ],
      },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: label(item.labelKey),
          url: `${SITE}${item.href}/`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: c.faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        <header className="space-y-4">
          <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-blue-600">홈</Link>
            <span className="mx-2">/</span>
            <span aria-current="page" className="text-gray-700 dark:text-gray-200">{c.h1}</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {c.h1} <span className="text-lg font-normal text-gray-500 dark:text-gray-400">{items.length}개</span>
          </h1>
          {c.intro.map((p, i) => (
            <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl">{p}</p>
          ))}
        </header>

        <section aria-labelledby="popular">
          <h2 id="popular" className="text-lg font-semibold text-gray-900 dark:text-white mb-3">많이 쓰는 도구</h2>
          <ul className="flex flex-wrap gap-2">
            {popular.map(item => (
              <li key={item.href}>
                <Link href={item.href} className={`${glassCard} inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-white/80 dark:hover:bg-white/[0.14] transition-colors`}>
                  <span>{item.icon}</span>{label(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <CategoryHub category={category} />

        <section aria-labelledby="faq" className={`${glassCard} p-6`}>
          <h2 id="faq" className="text-lg font-semibold text-gray-900 dark:text-white mb-4">자주 묻는 질문</h2>
          <dl className="space-y-4">
            {c.faq.map(f => (
              <div key={f.q}>
                <dt className="font-medium text-gray-900 dark:text-white">Q. {f.q}</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      </div>
    </>
  )
}
