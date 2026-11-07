// 로또 당첨번호 갱신: node scripts/update-lotto-data.mjs
// public/lottoData.ts 마지막 회차 다음부터 동행복권 공식 조회(회차별 당첨번호 화면이 쓰는 JSON)로 받아 끝에 이어 붙인다.
// 기존 항목은 글자 하나 건드리지 않고, 붙인 뒤 check-lotto-data.ts 가 실패하면 원래 파일로 되돌린다.
// 예전 API(common.do?method=getLottoNumber)는 2025년 사이트 개편 후 홈으로 302 → 이 엔드포인트로 바꿨다.
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { DH_API, DH_HEADERS, parseDhList } from '../src/utils/lottoRemote.ts' // Pages Function /api/lotto-latest 와 같은 파서

const FILE = fileURLToPath(new URL('../public/lottoData.ts', import.meta.url))
const CHECK = fileURLToPath(new URL('./check-lotto-data.ts', import.meta.url))

const src = readFileSync(FILE, 'utf8')
const end = src.lastIndexOf('}')
const data = JSON.parse(src.slice(src.indexOf('{'), end + 1))
let last = Math.max(...Object.keys(data).map(Number))
const added = []

for (;;) {
  const res = await fetch(DH_API + last, { headers: DH_HEADERS, redirect: 'manual' })
  const type = res.headers.get('content-type') ?? ''
  if (res.status !== 200 || !type.includes('json')) {
    console.error(`응답 이상: ${res.status} ${type} ${res.headers.get('location') ?? ''} — 동행복권 엔드포인트가 바뀌었는지 확인`)
    break
  }
  const list = parseDhList(await res.json(), last) // 끊기거나 번호가 이상한 회차에서 멈춤
  if (!list.length) break
  added.push(...list)
  last = list.at(-1).drwNo
  await new Promise(r => setTimeout(r, 500))
}

// process.exit() 은 쓰지 않는다 — Windows Node 24 에서 fetch 소켓이 닫히는 중에 부르면 libuv assert 로 죽는다
if (!added.length) {
  console.log(`새 회차 없음 (마지막 ${last}회)`)
} else {
  const tail = added.map(x => `,"${x.drwNo}":${JSON.stringify(x)}`).join('')
  writeFileSync(FILE, src.slice(0, end) + tail + src.slice(end))
  const check = spawnSync(process.execPath, [CHECK], { stdio: 'inherit' })
  if (check.status !== 0) {
    writeFileSync(FILE, src)
    console.error('검사 실패 — public/lottoData.ts 를 원래대로 되돌렸다')
    process.exitCode = 1
  } else {
    console.log(`${added[0].drwNo}~${last}회 ${added.length}개 추가 (마지막 ${added.at(-1).drwNoDate})`)
  }
}
