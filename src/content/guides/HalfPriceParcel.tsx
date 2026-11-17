import Link from 'next/link'

const calculator = '/shipping-calculator/'
const heading = 'mb-3 text-xl font-bold text-fg'
const linkStyle = 'font-semibold text-primary underline underline-offset-4'

// GS Postbox 기본운임표의 2026-11-12 기준 금액. 일반택배는 타권 운임이다.
const parcels = [
  { item: '티셔츠 한 벌', label: '500g', weight: 0.5, width: 25, depth: 18, height: 7, pickup: 1900, home: 4400 },
  { item: '양장본 한 권', label: '1kg', weight: 1, width: 25, depth: 18, height: 10, pickup: 2300, home: 5000 },
  { item: '책 세 권', label: '2kg', weight: 2, width: 30, depth: 20, height: 15, pickup: 2700, home: 5600 },
]
const won = (price: number) => price.toLocaleString('ko-KR') + '원'

export default function HalfPriceParcel() {
  return (
    <div id="shipping-calculator" className="scroll-mt-20 space-y-9 leading-8 text-body">
      <section>
        <h2 className={heading}>부산에 있는 구매자에게 티셔츠 한 벌을 보낸다면</h2>
        <p>티셔츠를 상자에 담고 테이프까지 붙인 뒤 저울에 올렸더니 정확히 500g이라고 해볼게요. 서울 GS25에서 보내고 구매자가 부산 GS25에 들러 찾아가면 <strong>1,900원</strong>입니다. 같은 상자를 같은 점포에 맡겨도 구매자의 집 주소로 보내면 <strong>4,400원</strong>이에요. 구매자가 점포에서 찾는 조건으로 배송비를 <strong>2,500원</strong> 아낄 수 있습니다.</p>
      </section>
      <section>
        <h2 className={heading}>상자가 1kg, 2kg이면 얼마를 아낄까?</h2>
        <p>아래는 물건값이 30만 원 이하이고 보내는 사람이 쿠폰 없이 선불로 결제하는 경우입니다. 반값택배에는 내륙 점포 간 운임을, 일반택배에는 서울과 부산처럼 서로 다른 권역을 잇는 ‘타권’ 운임을 적용했어요. 표의 무게를 누르면 같은 상자로 계산해 볼 수 있습니다.</p>
        <table className="my-4 w-full text-sm tabular-nums">
          <caption className="pb-2 text-left font-semibold text-fg">GS25 서울 → 부산 기본 배송비 · 2026년 11월 12일 확인</caption>
          <thead className="border-b border-line text-sub">
            <tr>
              <th scope="col" className="py-2 text-left">물건 · 포장 무게</th>
              <th scope="col" className="text-right">반값택배</th>
              <th scope="col" className="text-right">일반택배</th>
              <th scope="col" className="text-right">절약액</th>
            </tr>
          </thead>
          <tbody>
            {parcels.map(({ item, label, weight, width, depth, height, pickup, home }) => (
              <tr key={item} className="border-b border-line">
                <th scope="row" className="py-2 text-left font-medium">
                  <span className="block">{item}</span>
                  <a href={`${calculator}?weight=${weight}&width=${width}&depth=${depth}&height=${height}&destination=mainland&category=cvs&compare=gs25#shipping-result`} className={linkStyle} aria-label={`${item} ${label} 예시를 택배비 계산기에서 열기`}>{label}</a>
                </th>
                <td className="text-right">{won(pickup)}</td>
                <td className="text-right">{won(home)}</td>
                <td className="text-right font-semibold text-fg">{won(home - pickup)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>목적지가 바뀌면 차액도 바뀝니다. 500g 티셔츠를 서울에서 서울로 보내면 반값택배는 여전히 1,900원이지만, 일반택배는 동일권 요금인 3,900원이라 차액이 2,000원이에요. 제주와 내륙 사이에는 별도 운임이 적용됩니다. <a href="https://www.cvsnet.co.kr/utility/use/policy/index.do" className={linkStyle}>GS Postbox 공식 기본운임표(별첨 1·2)</a></p>
      </section>
      <section>
        <h2 className={heading}>반값택배를 고르기 전에 확인할 두 가지</h2>
        <p><strong>구매자가 어느 점포에서 찾을 수 있나요?</strong> 반값택배는 접수할 때 도착할 GS25를 지정합니다. 구매자는 도착 알림톡의 QR코드를 그 점포에 보여주고 물건을 받아요. 서울에서 부산까지 안내된 배송기간은 접수일을 포함해 4일 이내입니다. 중고 거래라면 배송비를 정하기 전에 구매자가 들를 수 있는 점포 이름부터 맞춰 두세요. <a href="https://www.cvsnet.co.kr/service/slow-delivery/use/contentsid/274/index.do" className={linkStyle}>GS25 수령 방법과 배송기간</a></p>
        <p className="mt-3"><strong>상자를 닫은 뒤에도 같은 무게 구간인가요?</strong> 책만 쟀을 때 980g이어도 상자와 완충재가 100g이면 접수 무게는 1.08kg입니다. 이때 반값택배 요금은 2,300원에서 2,700원으로 올라가요. 반값택배는 포장 후 5kg 이하, 상자 바깥쪽 가로·세로·높이의 합이 80cm 이하일 때 접수할 수 있습니다. <a href="https://www.cvsnet.co.kr/service/slow-delivery/note/contentsid/275/index.do" className={linkStyle}>GS25 반값택배 접수 규격</a></p>
      </section>
      <section>
        <h2 className={heading}>내 상자로 비교하기</h2>
        <p>포장한 상자를 저울에 올려 무게를 재고, 가로·세로·높이를 cm로 재세요. 아래 비교 화면에 세 값과 무게를 넣으면 점포 수령액과 집 배송액이 함께 바뀝니다. 우체국과 다른 편의점의 요금도 궁금하면 <Link href={calculator} className={linkStyle}>전체 택배비 계산기</Link>에서 비교할 수 있어요.</p>
        <a href={calculator + '?category=cvs&compare=gs25#shipping-input'} className="ui-btn mt-4 inline-flex px-4 py-2.5">내 상자로 GS25 요금 비교하기</a>
      </section>
    </div>
  )
}
