import type { Metadata } from 'next'
import I18nWrapper from '@/components/I18nWrapper'
import DiffViewer from '@/components/DiffViewer'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'
import diffViewerMessages from '../../../messages/generated/ko/ns/diffViewer.json'

const TITLE = 'Diff 비교 도구 - 줄 비교·변경 선택 병합·TXT | 툴허브'
const DESCRIPTION = '두 문서의 줄 단위 차이를 비교하고 변경 구간마다 원본 또는 수정본을 골라 병합하세요. 양쪽 입력은 유지하며 전체 비교 표시 텍스트와 병합 문서를 각각 복사·TXT로 내보낼 수 있습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'diff, 텍스트비교, 코드비교, 차이점비교, 문서비교, diff viewer, compare',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: '툴허브',
    url: 'https://toolhub.ai.kr/diff-viewer/',
    locale: 'ko_KR',
    images: [{ url: 'https://toolhub.ai.kr/og/diff-viewer.png', width: 1200, height: 630, alt: 'Diff 비교 도구' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/diff-viewer.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/diff-viewer/',
  },
}

export default function DiffViewerPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '텍스트 비교 도구 (Diff)',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/diff-viewer/',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['직접 실행하는 줄 단위 비교', '원문 줄 번호와 추가·삭제·유지 개수', '전체/변경된 줄 필터', '전체 결과 TXT 다운로드', '복사 실패 안내와 수동 선택', '진행 중 비교 취소', '글자수 저장본과 현재 원고의 명시적 새 탭 전달', '전달 뒤 내용을 확인하고 직접 비교 실행', '변경 구간별 원본 유지·수정본 반영', '입력을 덮어쓰지 않는 별도 병합 문서', '전체 병합 복사·TXT와 빈 문서 반출', 'LF 정규화와 끝 개행·빈 줄 보존']
  }

  const faq = diffViewerMessages.diffViewer.guide.faq.items

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <I18nWrapper>
        <DiffViewer />
        <ToolFaq items={faq} />
        <div className="mt-8">

          <RelatedTools />

        </div>

      </I18nWrapper>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            Diff 비교 도구란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            두 텍스트나 코드를 입력하고 비교하기를 누르면 줄 단위 차이와 양쪽 원문 줄 번호를 확인할 수 있습니다. 추가·삭제·유지 개수와 변경된 줄 필터로 문서 개정이나 설정 파일 수정을 검토하세요. 비교 후 입력을 고치면 이전 결과임을 알리며, 새 입력으로 다시 비교할 수 있습니다. 변경 구간마다 원본 유지 또는 수정본 반영을 골라 별도 병합 문서를 만들 수 있습니다. 양쪽 입력과 저장 원고는 덮어쓰지 않으며 원문을 서버로 전송하거나 자동 저장하지 않습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            Diff 비교 도구 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>코드 리뷰:</strong> Pull Request 리뷰 전 로컬에서 변경 사항을 빠르게 확인하거나, 두 버전의 설정 파일(nginx.conf, docker-compose.yml 등)을 비교할 때 유용합니다.</li>
            <li><strong>문서 교정:</strong> 계약서, 보고서의 이전 버전과 새 버전을 비교하여 변경된 조항이나 수정 내용을 정확히 파악할 수 있습니다.</li>
            <li><strong>변경된 줄만 보기:</strong> 필터로 수정 부분에 집중하고 원문 줄 번호로 위치를 찾으세요. 통계와 TXT 다운로드는 필터와 관계없이 전체 결과를 담습니다.</li>
            <li><strong>선택 병합:</strong> 기본은 모두 원본 유지입니다. 원하는 변경만 반영한 뒤 병합 문서를 별도 복사·TXT로 내보내세요. 미리보기에서 생략한 내용도 전체 반출에 포함됩니다.</li>
            <li><strong>JSON·YAML 비교:</strong> API 응답이나 설정 파일의 JSON/YAML을 붙여넣어 포맷 차이까지 한눈에 비교하세요.</li>
            <li><strong>큰 문서:</strong> 문서당 1MiB·10,000줄과 비교 작업량 한도를 확인하세요. 비교 중 취소할 수 있으며, 한도 초과나 실행 실패를 같음으로 표시하지 않습니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
