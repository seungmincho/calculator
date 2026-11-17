import { Metadata } from 'next'
import MarkdownEditor from '@/components/MarkdownEditor'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import markdownEditorMessages from '../../../messages/generated/ko/ns/markdownEditor.json'

const TITLE = '마크다운 에디터 - 미리보기·파일 열기·복사 복구 | 툴허브'
const DESCRIPTION = '분할 화면에서 마크다운을 편집하고 미리보세요. 1MiB까지 텍스트 파일 열기, Markdown·HTML 다운로드, 복사 실패 시 수동 선택과 재시도를 지원합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: '마크다운에디터, 마크다운편집기, 마크다운미리보기, Markdown Editor, 실시간미리보기, MD편집기, 온라인마크다운, 마크다운작성, 깃허브마크다운',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/markdown-editor/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/markdown-editor.png', width: 1200, height: 630, alt: '마크다운 에디터' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/markdown-editor.png'],
  },
  alternates: {
    canonical: 'https://toolhub.ai.kr/markdown-editor/',
  },
}

export default function MarkdownEditorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '마크다운 에디터',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/markdown-editor/',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: [
      '실시간 마크다운 미리보기',
      '분할 화면 편집',
      '툴바 버튼 지원',
      '헤딩, 볼드, 이탤릭, 취소선',
      '코드 블록 및 인라인 코드',
      '표(Table) 지원',
      '체크리스트(Task list)',
      '.md 파일 다운로드',
      'HTML 변환 및 복사',
      '복사 실패 안내·읽기 전용 수동 선택·재시도',
      '1MiB까지 md·markdown·txt 파일 열기와 읽기 실패 안내',
      '전체화면 모드',
      '단어/글자 수 표시',
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={markdownEditorMessages.markdownEditor.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <MarkdownEditor />
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
              마크다운 에디터란?
            </h2>
            <p className="text-body leading-relaxed mb-6">
              마크다운을 편집하면서 분할 화면으로 렌더링 결과를 확인하는 온라인 편집기입니다. README나 기술 문서에 쓰는 제목·볼드·이탤릭·표·코드 블록·체크리스트를 지원합니다. 1MiB까지 .md·.markdown·.txt 파일을 열고 작성한 내용을 Markdown 또는 HTML로 다운로드할 수 있습니다. 복사가 거부되면 읽기 전용 텍스트를 직접 선택하거나 다시 시도하세요.
            </p>
            <h3 className="text-lg font-semibold text-fg mb-3">
              마크다운 에디터 활용 팁
            </h3>
            <ul className="list-disc list-inside space-y-2 text-body">
              <li><strong>툴바 버튼 활용:</strong> 문법을 외우지 않아도 툴바의 볼드, 이탤릭, 표, 코드 블록 버튼으로 서식을 바로 삽입할 수 있습니다.</li>
              <li><strong>실시간 미리보기:</strong> 분할 화면으로 입력과 동시에 결과를 확인해 오타나 문법 오류를 즉시 수정하세요.</li>
              <li><strong>파일 다운로드:</strong> 작성한 내용을 .md 파일로 저장하거나 HTML로 변환해 다양한 용도로 활용하세요.</li>
              <li><strong>복사 실패 복구:</strong> Markdown·HTML·서식 복사 결과를 확인하세요. 서식 복사가 실패하면 Markdown이나 HTML 텍스트를 선택해 복사할 수 있습니다.</li>
              <li><strong>파일 열기:</strong> 읽기 오류나 크기 초과 안내를 확인하고 다시 선택하세요. 읽는 동안 새로 편집한 원고는 늦게 끝난 이전 읽기로 덮어쓰지 않습니다.</li>
              <li><strong>GitHub README 작성:</strong> 오픈소스 프로젝트의 README.md를 미리 작성하고 검토한 후 복사해서 사용하세요.</li>
            </ul>
          </div>
        </section>
    </>
  )
}
