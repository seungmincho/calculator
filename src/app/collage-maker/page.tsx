import { Metadata } from 'next'
import CollageMaker from '@/components/CollageMaker'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'

export const metadata: Metadata = {
  title: '사진 콜라주 메이커 - 여러 사진 합치기 도구 | 툴허브',
  description: '사진 여러 장을 올리면 장수에 맞는 레이아웃이 자동 선택되는 무료 콜라주 메이커. 19가지 레이아웃(인생네컷 세로 4컷 포함), 1:1·4:5·9:16 비율, 칸별 위치·확대 조정, 2160px 고화질 JPG/PNG 저장. 서버 업로드 없음.',
  keywords: '콜라주 만들기, 사진합치기, 인생네컷 만들기, 네컷사진, 사진 이어붙이기, 카톡 프사 콜라주, 포토콜라주, 사진편집, 이미지합치기, 인스타그램콜라주, 사진레이아웃, 콜라주메이커, 온라인콜라주',
  openGraph: {
    title: '사진 콜라주 메이커 - 여러 사진 합치기 | 툴허브',
    description: '사진 1~9장을 19가지 레이아웃·인생네컷 스타일로 합쳐 고화질 저장. 서버 업로드 없이 브라우저에서 바로 처리.',
    url: 'https://toolhub.ai.kr/collage-maker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/collage-maker.png', width: 1200, height: 630, alt: '사진 콜라주 메이커' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사진 콜라주 메이커 - 여러 사진 합치기 | 툴허브',
    description: '사진 1~9장을 19가지 레이아웃·인생네컷 스타일로 합쳐 고화질로 저장하세요.',
    images: ['https://toolhub.ai.kr/og/collage-maker.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/collage-maker/',
  },
}

export default function CollageMakerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '사진 콜라주 메이커',
    description: '여러 사진을 19가지 레이아웃으로 합쳐 콜라주를 만드는 브라우저 도구. 장수별 자동 레이아웃, 칸별 위치·확대, 인생네컷 스타일, 고화질 저장을 지원합니다.',
    url: 'https://toolhub.ai.kr/collage-maker',
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '드래그앤드롭·붙여넣기 사진 업로드',
      '사진 장수에 맞춘 자동 레이아웃 (1~9장, 19가지)',
      '인생네컷 세로 4컷 스트립 + 하단 문구·날짜',
      '캔버스 비율 1:1, 4:5, 3:4, 9:16, 16:9, 1:3, 직접 입력',
      '칸별 드래그 위치 조정, 휠·핀치 확대, 드래그로 자리 바꾸기',
      '간격·모서리 둥글기·배경색 설정',
      '2160px 고화질 JPG/PNG 저장, 모바일 공유',
      '되돌리기(Ctrl+Z)',
      '서버 업로드 없음',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '사진 콜라주 메이커에서 몇 장의 사진을 사용할 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '1장부터 9장까지 한 콜라주에 넣을 수 있고, 사진을 올리면 장수에 맞는 레이아웃이 자동으로 선택됩니다. 칸이 남으면 빈 칸을 눌러 사진을 추가하면 되고, 칸보다 사진이 많으면 앞쪽 사진부터 들어갑니다. 모든 처리는 브라우저에서 이루어지며 서버에 업로드되지 않습니다.',
        },
      },
      {
        '@type': 'Question',
        name: '콜라주 비율과 저장 해상도는 어떻게 되나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '캔버스 비율을 1:1(정사각), 4:5(인스타 세로), 9:16(스토리), 16:9(가로), 1:3(네컷 스트립) 중에서 고르거나 직접 입력할 수 있습니다. 긴 변 2160px 고화질로 저장되며(정사각 2160×2160) JPG 또는 PNG를 선택할 수 있습니다.',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <CollageMaker />
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
              사진 콜라주 메이커란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              사진 콜라주 메이커는 <strong>여러 장의 사진을 19가지 레이아웃으로 하나의 이미지로 합쳐주는</strong> 무료 온라인 도구입니다. 사진 장수에 맞는 레이아웃이 자동으로 선택되고, 인스타그램 정사각형·세로(4:5), 스토리(9:16), 인생네컷 스트립(1:3) 비율로 2160px 고화질 저장을 지원하며 모든 처리가 브라우저에서 이루어져 사진이 서버에 업로드되지 않습니다. 여행 사진 정리, SNS 포스팅, 기념 앨범 제작에 활용하세요.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              사진 콜라주 메이커 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>인생네컷 스타일:</strong> 버튼 한 번으로 세로 4컷·검은 배경·하단 문구와 날짜가 들어간 네컷 사진을 만들 수 있습니다.</li>
              <li><strong>모서리 둥글기:</strong> 모서리를 둥글게 설정하면 더 부드럽고 트렌디한 콜라주를 만들 수 있습니다.</li>
              <li><strong>배경색 선택:</strong> 흰색 배경은 깔끔한 느낌, 검정 배경은 고급스러운 느낌을 줍니다.</li>
              <li><strong>위치·확대 조정:</strong> 칸 안에서 사진을 끌면 보이는 부분이 바뀌고, 휠이나 두 손가락으로 확대할 수 있습니다. 다른 칸으로 끌면 자리가 바뀝니다.</li>
              <li><strong>개인정보 안전:</strong> 모든 이미지 처리가 브라우저에서 이루어지므로 사진이 외부 서버로 전송되지 않습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
