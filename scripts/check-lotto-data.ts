// 로또 당첨번호 데이터 검사: node scripts/check-lotto-data.ts
// 회차 연속(1회부터 빈 회차 없음) · 추첨일 7일 간격 · 본번호 6개 1~45 오름차순(중복 없음) · 보너스 1~45 본번호와 다름
import { lottoData } from '../public/lottoData.ts'

type Draw = {
  drwNo: number; drwNoDate: string; bnusNo: number
  drwtNo1: number; drwtNo2: number; drwtNo3: number; drwtNo4: number; drwtNo5: number; drwtNo6: number
}

const data = lottoData as Record<string, Draw>
const errors: string[] = []
const DAY = 86_400_000
const isBall = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 45
const keys = Object.keys(data).map(Number).sort((a, b) => a - b)

if (keys[0] !== 1) errors.push(`첫 회차가 1회가 아니다: ${keys[0]}`)
if (data['1']?.drwNoDate !== '2002-12-07') errors.push(`1회 추첨일이 2002-12-07 이 아니다: ${data['1']?.drwNoDate}`)

keys.forEach((no, i) => {
  const d = data[no]
  const at = `${no}회`
  if (d.drwNo !== no) errors.push(`${at}: 키와 drwNo(${d.drwNo})가 다르다`)
  if (i > 0 && no !== keys[i - 1] + 1) errors.push(`${at}: 앞 회차가 ${keys[i - 1]}회 — 사이가 비었다`)

  const t = Date.parse(`${d.drwNoDate}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.drwNoDate) || Number.isNaN(t)) errors.push(`${at}: 날짜 형식 ${d.drwNoDate}`)
  else if (i > 0) {
    const gap = (t - Date.parse(`${data[keys[i - 1]].drwNoDate}T00:00:00Z`)) / DAY
    if (gap !== 7) errors.push(`${at}: 앞 회차와 ${gap}일 간격(${data[keys[i - 1]].drwNoDate} → ${d.drwNoDate})`)
  }

  const main = [d.drwtNo1, d.drwtNo2, d.drwtNo3, d.drwtNo4, d.drwtNo5, d.drwtNo6]
  if (!main.every(isBall)) errors.push(`${at}: 본번호 범위 밖 ${main}`)
  if (!main.every((n, j) => j === 0 || n > main[j - 1])) errors.push(`${at}: 본번호가 오름차순이 아니거나 중복 ${main}`)
  if (!isBall(d.bnusNo)) errors.push(`${at}: 보너스 범위 밖 ${d.bnusNo}`)
  if (main.includes(d.bnusNo)) errors.push(`${at}: 보너스 ${d.bnusNo} 가 본번호와 겹친다`)
})

const last = data[keys[keys.length - 1]]
if (errors.length) {
  errors.slice(0, 50).forEach(e => console.log('FAIL', e))
  console.log(`FAIL ${errors.length}건 (회차 ${keys.length}개, 마지막 ${last.drwNo}회 ${last.drwNoDate})`)
  process.exit(1)
}
console.log(`OK 회차 ${keys.length}개, 1회 ~ ${last.drwNo}회 (${last.drwNoDate})`)
