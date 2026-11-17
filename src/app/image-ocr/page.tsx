import { Metadata } from 'next'
import ImageOcr from '@/components/ImageOcr'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import { FaqJsonLd } from '@/components/ToolFaq'
import imageOcrMessages from '../../../messages/generated/ko/ns/imageOcr.json'

const TITLE = '이미지 텍스트 추출 - 원고 보존·순차 OCR·복사 복구 | 툴허브'
const DESCRIPTION = '사진 속 글자를 순서대로 인식하고 편집하세요. 현재 파일 완료 뒤 일시정지·실패만 재시도하며 이전 성공 원고와 인식 중 편집을 보존합니다. 현재·전체 복사 복구, TXT 다운로드와 읽어주기 전달을 지원합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'OCR, 이미지 텍스트 추출, 사진 글자 인식, 텍스트 인식, 광학문자인식',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/image-ocr/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/image-ocr.png', width: 1200, height: 630, alt: '이미지 텍스트 추출 (OCR)' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/image-ocr.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/image-ocr/' },
}

export default function ImageOcrPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: '이미지 텍스트 추출 (OCR)', description: DESCRIPTION, url: 'https://toolhub.ai.kr/image-ocr/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['한국어·영어·일본어·중국어 간체/번체 인식', '순차 인식·현재 파일 뒤 일시정지·실패만 재시도', '이전 성공 원고와 인식 중 편집 보존', '편집 원고 교체·정리·초기화 확인', '현재·전체 복사 실패 복구·TXT 요청', '편집 원고를 읽어주기로 전달'] }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqJsonLd items={imageOcrMessages.imageOcr.guide.faq.items} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><ImageOcr />  <div className="mt-8">
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            이미지 OCR(광학 문자 인식)이란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            이미지 OCR은 사진·스캔 문서·스크린샷의 글자를 편집 가능한 텍스트로 만드는 도구입니다. 한국어·영어·일본어·중국어 간체/번체를 선택해 브라우저에서 한 장씩 인식합니다. 현재 파일이 끝난 뒤 일시정지하거나 실패한 파일만 재시도할 수 있습니다. 인식 서버로 이미지를 업로드하지 않으며 엔진·언어 데이터는 필요할 때 내려받습니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            이미지 텍스트 추출 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>이전 원고 보존:</strong> 새 인식이 실패해도 이전 성공 결과를 유지합니다. 인식 중 새로 편집한 원고는 늦은 결과로 덮어쓰지 않습니다.</li>
            <li><strong>설정과 결과 구분:</strong> 언어·보정·회전을 바꾸어도 기존 결과는 유지합니다. 새 설정을 적용하려면 다시 인식을 선택하고, 편집 원고 교체 확인을 읽어 주세요.</li>
            <li><strong>복사와 TXT:</strong> 현재 결과 또는 결과가 있는 항목의 전체 원고를 목록 순서대로 사용합니다. 처리 중이거나 실패한 항목의 이전 성공 원고도 포함합니다.</li>
            <li><strong>복사 실패 복구:</strong> 자동 복사가 실패하면 전체 내용을 열어 직접 선택하거나 다시 시도합니다. TXT 안내는 다운로드 요청을 뜻하며 저장 완료 확인은 아닙니다.</li>
            <li><strong>원본 대조:</strong> 낮은 신뢰도 표시와 원본을 확인해 글자를 수정하세요. 텍스트를 찾지 못한 정상 결과는 인식 실패와 구분해 안내합니다.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
