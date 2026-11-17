import { Metadata } from 'next'
import PdfTools from '@/components/PdfTools'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = 'PDF 도구 - 합치기·분할·페이지 편집 되돌리기 | 툴허브'
const DESCRIPTION = 'PDF 합치기·분할·이미지 변환과 페이지 이동·회전·삭제를 브라우저에서 처리하세요. 페이지 정리는 최대 30개 편집 이력을 되돌리거나 다시 실행하고 현재 편집본을 내려받을 수 있습니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'PDF 합치기, PDF 분할, PDF 회전, PDF 페이지 삭제, PDF 순서 변경, JPG PDF 변환, PDF 페이지 추출, 이미지 PDF 변환, PDF 도구, 온라인 PDF',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/pdf-tools/',
    siteName: '툴허브',
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: 'https://toolhub.ai.kr/og/pdf-tools.png', width: 1200, height: 630, alt: 'PDF 도구' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://toolhub.ai.kr/og/pdf-tools.png'],
  },
  alternates: { canonical: 'https://toolhub.ai.kr/pdf-tools/' },
}

export default function PdfToolsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'PDF 도구',
    description: DESCRIPTION,
    url: 'https://toolhub.ai.kr/pdf-tools/',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    featureList: ['PDF 합치기', 'PDF 분할', 'PDF 페이지 회전', '이미지→PDF 변환', 'PDF 페이지 삭제·순서 변경', '페이지 정리 편집 최대 30개 undo/redo', '클릭 당시 페이지 순서·회전으로 반출', '새 편집·탭 이동 뒤 오래된 작업 결과 제외', '페이지 범위 분할(1-3,5,8-)', 'N쪽마다 분할(ZIP)', 'JPG·PNG→PDF(A4 맞춤·여백)', '서버 업로드 없음'],
  }
  const faq = [
    { q: 'PDF 파일이란 무엇인가요?', a: 'PDF(Portable Document Format)는 Adobe가 1993년 개발한 전자 문서 형식입니다. 어떤 기기나 OS에서 열어도 레이아웃, 폰트, 이미지가 동일하게 보이는 것이 최대 장점입니다. 텍스트, 이미지, 벡터 그래픽, 양식, 하이퍼링크, 디지털 서명을 포함할 수 있습니다. 2008년 ISO 32000으로 국제 표준이 되었으며, 계약서, 보고서, 이력서 등 공식 문서에 널리 사용됩니다.' },
    { q: '암호가 걸린 PDF도 합치거나 나눌 수 있나요?', a: '열기 암호가 걸린 PDF는 처리할 수 없습니다. PDF 뷰어에서 암호를 입력해 연 뒤 "PDF로 인쇄"로 암호 없는 사본을 만들어 올려 주세요. 모든 처리는 브라우저 안에서 이루어지며 파일이 서버로 전송되지 않습니다.' },
    { q: '페이지 삭제나 회전을 되돌릴 수 있나요?', a: '페이지 정리에서는 이동·회전·삭제·전체 원상복원 전이를 최대 30개까지 되돌리거나 다시 실행할 수 있습니다. 새 문서를 성공적으로 불러오면 새 이력이 시작되며, 되돌린 뒤 새 편집을 하면 다시 실행 목록은 없어집니다. 이력은 이번 방문의 메모리에만 유지됩니다.' },
    { q: '내려받은 결과가 현재 편집본과 같나요?', a: '생성 버튼을 누른 시점의 파일과 페이지 순서·회전으로 결과를 만듭니다. 그 뒤 새 편집·탭 이동·새 작업이 생기면 오래된 완료 결과를 현재 결과로 채택하지 않습니다. 북마크·주석·폼 등 원본의 모든 부가 요소 보존을 보장하지 않으므로 필요한 문서는 결과를 확인하세요.' },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <I18nWrapper>
              <PdfTools />
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
            온라인 PDF 도구란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            PDF 합치기·분할·페이지 정리·이미지 변환을 서버 업로드 없이 브라우저에서 처리합니다. 페이지 정리의 순서·회전·삭제를 최대 30개 메모리 이력으로 되돌릴 수 있고, 실패한 새 읽기는 기존 문서와 편집을 지우지 않습니다. 필요한 결과는 페이지를 떠나기 전에 내려받고 출력 순서와 회전을 확인하세요.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            PDF 도구 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>PDF 합치기:</strong> 여러 개의 계약서, 첨부 서류를 하나의 PDF로 합쳐 이메일 첨부 파일 수를 줄이고 관리를 편리하게 하세요.</li>
            <li><strong>페이지 분할:</strong> 대용량 PDF에서 필요한 페이지만 추출하여 별도 파일로 저장하면 공유와 보관이 편리합니다.</li>
            <li><strong>이미지→PDF 변환:</strong> 스마트폰으로 찍은 영수증, 계약서 사진을 PDF로 변환하면 공식 문서로 제출하기 좋은 형식이 됩니다.</li>
            <li><strong>페이지 회전:</strong> 스캔 시 뒤집힌 페이지를 회전하여 올바른 방향으로 수정하세요. 쪽별·전체 90° 단위 회전과 페이지 삭제·순서 변경을 지원합니다.</li>
            <li><strong>편집 이력:</strong> 이동·삭제·회전 뒤 되돌리기/다시 실행을 사용할 수 있습니다. 새 편집은 이전 반출 결과를 무효화하므로 현재 상태로 다시 생성하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
