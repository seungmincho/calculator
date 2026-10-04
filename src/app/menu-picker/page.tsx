import { Metadata } from 'next'
import Link from 'next/link'
import DecisionToolsBar from '@/components/DecisionToolsBar'
import MenuPicker from '@/components/MenuPicker'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

export const metadata: Metadata = {
  title: '오늘 뭐 먹지? 메뉴 추천 룰렛 - 랜덤 음식 추천 | 툴허브',
  description: '오늘 뭐 먹을지 고민될 때! 메뉴 추천 룰렛을 돌려보세요. 한식, 중식, 일식, 양식, 분식, 치킨 등 100가지 이상 메뉴에서 랜덤 추천. 상황별(혼밥, 회식, 데이트, 야식, 해장) 맞춤 추천도 가능합니다.',
  keywords: '오늘뭐먹지, 메뉴추천, 랜덤메뉴, 음식추천, 메뉴룰렛, 점심메뉴, 저녁메뉴, 혼밥추천, 야식추천, 회식메뉴, 데이트맛집',
  openGraph: {
    title: '오늘 뭐 먹지? 메뉴 추천 룰렛 | 툴허브',
    description: '메뉴 고르기 힘들 때! 룰렛을 돌려 오늘의 메뉴를 정해보세요. 12개 카테고리 300가지 넘는 메뉴에서 랜덤 추천.',
    url: 'https://toolhub.ai.kr/menu-picker',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/menu-picker.png', width: 1200, height: 630, alt: '오늘 뭐 먹지? 메뉴 추천 룰렛' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '오늘 뭐 먹지? 메뉴 추천 룰렛',
    description: '메뉴 고르기 힘들 때! 룰렛을 돌려 오늘의 메뉴를 정해보세요.',
    images: ['https://toolhub.ai.kr/og/menu-picker.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/menu-picker/',
  },
}

export default function MenuPickerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '오늘 뭐 먹지? 메뉴 추천 룰렛',
    description: '한식, 중식, 일식, 양식 등 300가지 넘는 메뉴에서 랜덤으로 오늘의 메뉴를 추천해드립니다. 상황별 맞춤 추천과 맛집 검색 연동.',
    url: 'https://toolhub.ai.kr/menu-picker/',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '메뉴 추천 룰렛·음식 월드컵·오늘의 추천 3',
      '12개 음식 카테고리 (한식/고기·구이/해산물/중식/일식/양식/분식/치킨/패스트푸드/아시안/디저트·카페/국·탕·찌개)',
      '300가지 넘는 메뉴',
      '상황별 추천 (혼밥/회식/데이트/야식/해장/다이어트)',
      '오늘 이미 먹은 메뉴 제외',
      '네이버 맛집 검색 연동',
      '추천 히스토리',
    ],
  }

  const faq = [
    { q: '어떤 기준으로 메뉴가 선택되나요?', a: '선택한 카테고리(또는 상황)에 속한 메뉴 중 10개를 무작위로 뽑아 룰렛에 올리고, 룰렛이 멈춘 칸의 메뉴가 결과가 됩니다. "오늘 이미 먹었어요"를 누른 메뉴는 후보에서 빠집니다.' },
    { q: '카테고리를 바꾸면 뭐가 달라지나요?', a: '선택한 카테고리의 음식만 후보가 됩니다. 한식·고기/구이·해산물·중식·일식·양식·분식·치킨·패스트푸드·아시안·디저트/카페·국/탕/찌개 12개 중 여러 개를 함께 고를 수 있고, 혼밥·회식·데이트·야식·해장·다이어트 같은 상황을 고르면 어울리는 카테고리가 자동으로 선택됩니다.' },
    { q: '매번 같은 결과가 나오나요?', a: '아니요. "섞기"나 "다시 돌리기"를 누를 때마다 후보 10개를 새로 뽑기 때문에 같은 설정이어도 결과가 달라집니다.' },
    { q: '메뉴 룰렛(돌림판)과는 무엇이 다른가요?', a: '이 도구는 300가지가 넘는 메뉴 중에서 상황·카테고리에 맞춰 골라 주는 추천 도구이고, 메뉴 룰렛은 내가 직접 적은 후보 중에서 하나를 뽑는 돌림판입니다. 먹고 싶은 후보가 이미 몇 개 있다면 메뉴 룰렛이 더 빠릅니다.' },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <I18nWrapper>
              <div className="mb-6"><DecisionToolsBar current="/menu-picker" /></div>
              <MenuPicker />
              <ToolFaq items={faq} />
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
              오늘 뭐 먹지? 메뉴 추천 룰렛이란?
            </h2>
            <p className="text-body leading-relaxed mb-4">
              메뉴 추천 룰렛은 한식·고기/구이·해산물·중식·일식·양식·분식·치킨·패스트푸드·아시안·디저트/카페·국/탕/찌개 12개 카테고리, 300가지가 넘는 메뉴 중에서 오늘의 식사를 랜덤으로 골라주는 도구입니다. 매일 점심·저녁 메뉴 고르기가 귀찮은 분, 혼밥·회식·데이트·야식·해장 등 상황별 맞춤 추천이 필요한 분 모두에게 유용합니다.
            </p>
            <p className="text-body leading-relaxed mb-6">
              무엇을 먹을지 아무 생각이 없을 때 쓰는 추천 도구입니다. 먹고 싶은 후보가 이미 몇 개 있다면 후보를 직접 적어 돌리는{' '}
              <Link prefetch={false} href="/menu-roulette/" className="text-primary hover:underline">
                메뉴 룰렛(돌림판)
              </Link>
              이 더 빠릅니다.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              사용 방법
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-body mb-6">
              <li>지금 상황(아무거나·혼밥·회식·데이트·야식·해장·다이어트)을 고르거나, 먹고 싶은 카테고리만 골라 후보 범위를 정합니다.</li>
              <li>고르는 방식을 정합니다. 룰렛은 한 번에 정하고, 음식 월드컵은 두 메뉴 중 더 끌리는 쪽을 골라 나가며, 오늘의 추천 3은 세 가지 중 하나를 고릅니다.</li>
              <li>결과가 마음에 들지 않으면 &quot;다시 돌리기&quot;로 새 후보를 뽑고, 정해졌다면 맛집 검색 버튼으로 네이버 지도에서 주변 식당을 찾습니다.</li>
            </ol>
            <h3 className="text-lg font-semibold text-fg mb-3">
              메뉴 추천 룰렛 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>상황별 추천:</strong> 혼밥, 회식, 데이트, 야식, 해장, 다이어트 등 상황을 선택하면 해당 상황에 어울리는 카테고리로 후보가 좁혀집니다. 해장을 고르면 해장국·국밥 위주로 추천합니다.</li>
              <li><strong>카테고리 좁히기:</strong> 먹고 싶은 음식 종류가 대략 정해졌다면 해당 카테고리만 선택해 범위를 좁혀 룰렛을 돌리세요.</li>
              <li><strong>점심에 먹은 메뉴 빼기:</strong> 이미 먹은 메뉴에 &quot;오늘 이미 먹었어요&quot;를 누르면 같은 창을 열어 둔 동안 후보에서 빠져 저녁 메뉴가 겹치지 않습니다.</li>
              <li><strong>즐겨찾기:</strong> 자주 찾는 메뉴를 즐겨찾기에 담아 두면 이 브라우저에 저장됩니다.</li>
              <li><strong>여럿이서 정할 때:</strong> 음식 월드컵으로 한 명씩 돌아가며 고르면 모두가 결정에 참여할 수 있습니다.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
