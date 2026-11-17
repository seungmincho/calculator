import { Metadata } from 'next'
import QrScanner from '@/components/QrScanner'
import I18nWrapper from '@/components/I18nWrapper'
import RelatedTools from '@/components/RelatedTools'
import ToolFaq from '@/components/ToolFaq'

const TITLE = 'QR코드 스캔 - 카메라·여러 이미지 읽기·TXT | 툴허브'
const DESCRIPTION = '카메라 또는 이미지에서 QR 내용을 확인하세요. 최대 10개 이미지를 하나씩 읽고 파일별 처음 읽힌 QR 한 개를 표시합니다. 실패 항목 재시도, 선택 결과 TXT, 복사 실패 수동 선택을 제공합니다.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'QR코드 스캔, QR 스캐너, QR코드 인식, QR코드 읽기, qr code scanner, QR 리더',
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://toolhub.ai.kr/qr-scanner/', siteName: '툴허브', locale: 'ko_KR', type: 'website', images: [{ url: 'https://toolhub.ai.kr/og/qr-scanner.png', width: 1200, height: 630, alt: 'QR코드 스캔' }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['https://toolhub.ai.kr/og/qr-scanner.png'] },
  alternates: { canonical: 'https://toolhub.ai.kr/qr-scanner/' },
}

export default function QrScannerPage() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'QR코드 스캔', description: DESCRIPTION, url: 'https://toolhub.ai.kr/qr-scanner/', applicationCategory: 'UtilityApplication', operatingSystem: 'Any', browserRequirements: 'JavaScript; camera access and native QR support for camera scanning; Web Worker support for image fallback', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' }, featureList: ['카메라 스캔', '기존 단일 이미지와 최근 기록', '최대 10개 이미지 순차 읽기', '파일당 처음 읽힌 QR 한 개 표시', '파일별 성공·미검출·실패·범위초과 안내', '취소와 실패 항목 재시도', '선택 성공 결과 TXT 다운로드', '복사 실패 수동 선택', '이미지 읽기의 브라우저 내 대체 처리'] }
  const faq = [
    { q: '여러 이미지에서 QR을 어떻게 읽나요?', a: '이미지 탭의 여러 장 읽기에서 최대 10개 파일을 선택하고 읽기 시작을 누르세요. 한 파일씩 처리하며 파일당 처음 읽힌 QR 한 개를 표시합니다. 한 이미지의 모든 QR이나 특정 위치의 QR을 고르는 기능은 아닙니다. 원하는 QR만 잘라 다시 선택하면 확인에 도움이 됩니다.' },
    { q: '파일 한도와 인식되지 않을 때 확인할 점은?', a: '여러 장 읽기는 개당 8MiB·합계 40MiB·원본 16,777,216픽셀까지 지원합니다. 큰 이미지는 처리 크기를 줄이므로 작은 QR이 읽히지 않을 수 있습니다. 원본의 선명도·조명·반사·여백을 확인하고, 미검출이나 일시 실패 항목을 다시 읽거나 QR 영역을 잘라 새로 선택하세요. 크기나 형식 오류는 새 파일 선택이 필요합니다.' },
    { q: '결과가 자동 저장되거나 링크가 실행되나요?', a: '여러 장 읽기의 원본과 결과는 서버에 전송하거나 최근 기록에 자동 저장하지 않습니다. 성공한 결과를 직접 선택해 TXT로 내려받을 수 있습니다. QR 내용은 텍스트로 표시하며 http/https 링크도 사용자가 직접 눌러야 열립니다. Wi-Fi나 연락처 내용을 자동 실행하지 않습니다.' },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <I18nWrapper><QrScanner />  <div className="mt-8">
    <ToolFaq items={faq} />
    <RelatedTools />
  </div>
</I18nWrapper>
        </div>
      </div>
      {/* SEO 콘텐츠 */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="mt-12 border-t border-line pt-8">
          <h2 className="text-xl font-bold text-fg mb-4">
            QR코드 스캐너란?
          </h2>
          <p className="text-body leading-relaxed mb-6">
            카메라 또는 이미지에서 QR에 담긴 URL·텍스트·Wi-Fi·연락처 내용을 확인하는 도구입니다. 여러 이미지 읽기는 파일을 하나씩 처리하고 파일별 처음 읽힌 QR 한 개와 상태를 보여 줍니다. 사용 가능한 브라우저 인식 기능과 기기 내 대체 처리를 이용하며, 카메라 기능은 해당 브라우저의 카메라 권한과 지원 여부에 따라 달라집니다.
          </p>
          <h3 className="text-lg font-semibold text-fg mb-3">
            QR코드 스캐너 활용 팁
          </h3>
          <ul className="list-disc list-inside space-y-2 text-body">
            <li><strong>이미지 선택:</strong> 사진이나 스크린샷을 이 브라우저에서 읽습니다. 여러 장 결과는 파일명과 순서로 구분하며 내용이 같아도 서로 다른 파일을 유지합니다.</li>
            <li><strong>카메라 스캔 모드:</strong> 웹캠이나 스마트폰 카메라를 연결해 실시간으로 QR코드를 스캔하세요. 충분한 조명과 안정적인 화면 고정이 인식 성공률을 높입니다.</li>
            <li><strong>기록과 TXT:</strong> 기존 단일 스캔의 최근 기록과 여러 장 읽기의 메모리 결과는 별개입니다. 여러 장에서는 필요한 성공 결과만 직접 선택해 TXT로 내려받으세요.</li>
            <li><strong>실패 복구:</strong> 미검출·일시 실패 항목은 다시 읽을 수 있습니다. 복사에 실패하면 표시된 읽기 전용 원문을 직접 선택하세요.</li>
            <li><strong>보안 주의:</strong> 출처를 알 수 없는 QR코드를 스캔하면 피싱 사이트로 연결될 수 있습니다. 스캔 결과에 표시된 URL을 클릭하기 전에 반드시 내용을 확인하세요.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
