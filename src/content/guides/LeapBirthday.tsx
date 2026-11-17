import Link from 'next/link'
import { lunarToSolar, weekday } from '@/utils/lunarCalendar'

const examples = [
  { year: 2025, leap: false }, { year: 2025, leap: true },
  { year: 2026, leap: false }, { year: 2027, leap: false },
]
const heading = 'mb-3 text-xl font-bold text-fg'
const linkStyle = 'font-semibold text-primary underline underline-offset-4'
export default function LeapBirthday() {
  return (
    <div id="lunar-converter" className="space-y-9 leading-8 text-body">
      <section>
        <h2 className={heading}>윤6월이 없는 해라면 평달 6월로 챙길 수 있어요</h2>
        <p>부모님이 “나는 윤6월 초열흘에 태어났다”고 하시면, 먼저 “윤6월이 없는 해에는 음력 6월 열흘에 챙기셨어요?”라고 여쭤보세요. 가족이 그렇게 챙겨 왔다면 <strong>2027년 생신은 양력 7월 13일 화요일</strong>이에요. 양력 생일로 챙기기로 한 집에서는 가족이 정한 양력 날짜를 쓰면 됩니다.</p>
      </section>
      <section>
        <h2 className={heading}>2025년 달력에는 음력 6월 10일이 두 번 있어요</h2>
        <p>음력에서는 달의 주기와 계절을 맞추기 위해 어떤 해에 한 달을 더 둡니다. 2025년에는 평달 6월 바로 뒤에 윤6월이 왔어요. 그래서 달력에 ‘음력 6월 10일’이라고만 적으면 7월에 만날지, 8월에 만날지 헷갈릴 수 있습니다.</p>
        <table className="mt-4 w-full text-left text-sm tabular-nums">
          <caption className="mb-2 text-left font-semibold text-fg">음력 6월 10일을 한국 달력으로 바꾼 날짜</caption>
          <thead><tr className="border-b border-line text-sub"><th scope="col" className="py-2">음력 연도</th><th scope="col">선택한 달</th><th scope="col">양력 생일</th></tr></thead>
          <tbody>{examples.map(({year, leap}) => {
            const solar = lunarToSolar(year, 6, 10, leap)!
            return <tr key={year + String(leap)} className="border-b border-line"><th scope="row" className="py-2 font-medium">{year}년</th><td>{leap ? '윤6월' : '평달 6월'}</td><td>{solar.month}월 {solar.day}일 ({'일월화수목금토'[weekday(solar)]})</td></tr>
          })}</tbody>
        </table>
        <p className="mt-4">2025년에 윤달 생신을 챙겼다면 8월 3일입니다. 이 날짜를 양력으로 매년 반복해 놓으면 2026년에는 평달로 챙기는 생신인 7월 23일을 놓치게 돼요.</p>
      </section>
      <section>
        <h2 className={heading}>우리 가족 날짜로 확인하는 순서</h2>
        <ol className="list-decimal space-y-2 pl-6">
          <li><Link href="/lunar-converter/" className={linkStyle}>음력 양력 변환기</Link>에서 ‘음력 → 양력’을 고르고 확인할 연도를 넣으세요.</li>
          <li>가족이 기억하는 음력 월과 일을 입력하세요. 같은 번호의 윤달이 있는 해에는 평달과 윤달을 구분해 선택합니다.</li>
          <li>표시된 양력 날짜와 요일을 달력에 적어 두세요. 여러 해의 생일을 보려면 윤달이 있던 해를 선택한 뒤 아래 연도별 표를 읽으면 됩니다.</li>
        </ol>
        <p className="mt-4"><a href="/lunar-converter/?mode=lunarToSolar&ly=2025&lm=6&ld=10&leap=1" className={linkStyle}>2025년 윤6월 10일을 넣은 예시 열기</a></p>
      </section>
      <section>
        <h2 className={heading}>음력 30일 생일이면 날짜 하나를 더 확인하세요</h2>
        <p>음력 한 달은 29일 또는 30일이에요. 툴허브 연도별 표는 같은 번호의 윤달이 없으면 평달을 쓰고, 30일이 없는 달이면 마지막 날인 29일을 표시합니다. 가족이 생신을 챙기는 방식과 다르면 달력에는 가족이 정한 날을 적으세요.</p>
      </section>
      <p className="text-sm leading-6 text-sub">윤달의 원리는 <a className="underline" href="https://encykorea.aks.ac.kr/Article/E0042264">한국민족문화대백과사전 ‘윤달’</a>에서, 2027년 각 음력 달의 시작일은 <a className="underline" href="https://astro.kasi.re.kr/life/post/calendarData?year=2027">한국천문연구원 달력자료</a>에서 확인할 수 있습니다.</p>
    </div>
  )
}
