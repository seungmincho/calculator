import Link from 'next/link'
import { toPyeong } from '@/utils/pyeong'

// 힐스테이트 회룡역파크뷰 입주자모집공고의 84A 행 (㎡).
const areas = [
  { label: '주거전용', sqm: 84.9771 },
  { label: '주거공용', sqm: 27.9431 },
  { label: '공급면적 소계', sqm: 112.9202 },
]
const heading = 'mb-3 text-xl font-bold text-fg'
const tool = '/pyeong-calculator/'

export default function PyeongArea() {
  return (
    <div id="pyeong-calculator" className="scroll-mt-20 space-y-9 leading-8 text-body">
      <section>
        <h2 className={heading}>25.4평은 우리 집 안쪽, 34평형은 공용 공간을 더한 넓이예요</h2>
        <p>아파트에서 ‘전용 84㎡’는 방, 거실, 주방, 욕실처럼 한 세대가 전용으로 쓰는 면적을 가리킵니다. 1㎡는 0.3025평이므로 <strong>84 × 0.3025 = 25.41평</strong>이에요.</p>
        <p className="mt-3">매물에서 흔히 말하는 ‘몇 평형’은 공급면적을 평으로 읽은 값입니다. 여기에는 전용면적과 함께 계단, 복도, 공동현관 등에서 그 세대에 배분한 주거공용면적이 들어가요. 전용 84㎡에 주거공용 28㎡를 더한 집이라면 공급면적은 112㎡, 평으로는 <strong>33.88평</strong>입니다. 이 집을 약 34평형이라고 부르는 거예요.</p>
      </section>
      <section>
        <h2 className={heading}>실제 공고에서 84A 한 줄 읽어보기</h2>
        <p>힐스테이트 회룡역파크뷰의 84A형을 예로 들어 볼게요. 공고에는 전용면적이 소수점 아래까지 나오고, 그 옆에 주거공용면적과 두 면적의 소계가 나란히 적혀 있습니다.</p>
        <table className="my-4 w-full text-left text-sm tabular-nums">
          <caption className="pb-2 text-left font-semibold text-fg">힐스테이트 회룡역파크뷰 84A 한 세대의 면적</caption>
          <thead className="border-b border-line text-sub"><tr><th scope="col" className="py-2">공고 항목</th><th scope="col" className="text-right">면적(㎡)</th><th scope="col" className="text-right">평으로 환산</th></tr></thead>
          <tbody>{areas.map(({label, sqm}) => <tr key={label} className="border-b border-line">
            <th scope="row" className="py-2 font-medium">{label}</th><td className="text-right">{sqm.toFixed(4)}</td><td className="text-right">{toPyeong(sqm).toFixed(2)}평</td>
          </tr>)}</tbody>
        </table>
        <p>이 집의 <strong>34.16평</strong>은 표의 마지막 줄에서 나옵니다. 같은 공고에 적힌 계약면적 176.7468㎡에는 지하주차장 등 기타공용면적까지 들어가므로, 매물의 34평형과 비교할 때는 ‘주택공급면적 소계’를 보세요. <a className="text-primary underline underline-offset-4" href="https://www.hillstate.co.kr/upload/2025/07/20250711100807017134.pdf">입주자모집공고 원문(PDF)</a></p>
      </section>
      <section>
        <h2 className={heading}>같은 전용 84㎡라도 평형은 달라질 수 있어요</h2>
        <p>전용면적이 똑같이 84㎡여도 한 집의 공급면적이 109㎡면 약 33.0평, 다른 집이 112㎡면 약 33.9평입니다. 두 집의 방과 거실이 한 평 차이 난다고 읽기 쉬운데, 이 예에서 달라진 항목은 세대에 배분된 주거공용면적이에요.</p>
        <p className="mt-3">매물에 전용면적만 있다면 전용률로 공급면적을 추정할 수 있습니다. 예를 들어 전용률 75%라면 84 ÷ 0.75 = 112㎡예요. 전용률은 단지와 주택형마다 다르므로, 공고에서 공급면적을 찾았다면 그 숫자를 직접 환산하는 편이 정확합니다.</p>
      </section>
      <section>
        <h2 className={heading}>내가 보고 있는 매물로 계산하려면</h2>
        <p>매물의 ‘공급/전용’ 표시에서 항목 이름과 숫자를 한 쌍으로 보세요. <Link href={tool} className="font-semibold text-primary underline underline-offset-4">평수 계산기</Link>에서 ㎡ 값을 넣고 공고에 적힌 면적 종류를 선택하면 됩니다. 집 안의 넓이를 비교할 때는 두 집 모두 전용면적으로 맞추세요.</p>
        <a href={tool + '?value=112&from=sqm&type=supply&r=75'} className="ui-btn mt-4 inline-flex px-4 py-2.5 text-sm">공급 112㎡ 예시로 계산하기</a>
      </section>
    </div>
  )
}
