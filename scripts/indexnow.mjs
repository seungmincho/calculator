// IndexNow 전송 — 새로 만들었거나 바꾼 페이지를 Bing·네이버 등에 바로 알린다(Google 은 IndexNow 를 쓰지 않음).
// 배포가 끝난 뒤에 실행한다(키 파일이 운영에 있어야 받아 준다).
//   node scripts/indexnow.mjs --recent 7           menuConfig 에서 addedDate·updatedDate 가 최근 7일인 도구 + 홈
//   node scripts/indexnow.mjs /four-insurance/ ...  지정한 경로(또는 전체 URL)
//   --dry-run                                       보내지 않고 목록만 출력
// 키는 공개값(키 파일 public/<KEY>.txt 로 소유를 증명)이다. 바꾸면 키 파일 이름·내용도 같이 바꾼다.
import { menuConfig, categoryKeys } from '../src/config/menuConfig.ts'

const KEY = '39688abd60472a6f22b49655a86486b4'
const HOST = 'toolhub.ai.kr'
const SITE = `https://${HOST}`
// 공용 엔드포인트는 참여 엔진끼리 공유한다. 네이버는 주 유입원이라 직접도 보낸다.
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow']

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const recentAt = args.indexOf('--recent')
const days = recentAt >= 0 ? Number(args[recentAt + 1]) : 0
const explicit = args.filter((a, i) => !a.startsWith('--') && !(recentAt >= 0 && i === recentAt + 1))
const toUrl = (p) => {
  // Git Bash(MSYS)는 '/path' 인자를 'C:/Program Files/Git/path'로 바꾼다 → 되돌린다. 'path'처럼 슬래시 없이 넘겨도 된다.
  const u = new URL(p.replace(/^[A-Za-z]:[\\/]Program Files[\\/]Git(?=[\\/])/, '').replace(/\\/g, '/'), SITE)
  if (u.host !== HOST) throw new Error(`${p}: only ${HOST} URLs can be submitted with this key`)
  if (!u.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(u.pathname)) u.pathname += '/'
  return u.toString()
}

// process.exit() right after fetch crashes Node on Windows (libuv UV_HANDLE_CLOSING) → set exitCode instead.
async function main() {
  const urls = new Set(explicit.map(toUrl))
  if (days > 0) {
    const since = new Date(Date.now() + 9 * 3600000 - days * 86400000).toISOString().slice(0, 10)
    for (const k of categoryKeys) for (const i of menuConfig[k].items) {
      if ((i.addedDate && i.addedDate >= since) || (i.updatedDate && i.updatedDate >= since)) urls.add(toUrl(i.href))
    }
    urls.add(toUrl('/'))
  }
  if (!urls.size) { console.error('No URLs. Use --recent <days> or pass paths.'); return 1 }
  const urlList = [...urls].slice(0, 10000)
  console.log(`${urlList.length} URL(s):\n${urlList.join('\n')}`)
  if (dryRun) return 0

  // 키 파일이 운영에 없으면 엔진이 403/422 를 주므로 먼저 확인한다.
  const keyRes = await fetch(`${SITE}/${KEY}.txt`, { headers: { 'User-Agent': 'ToolHub-IndexNow/1.0' } })
  const keyBody = keyRes.ok ? (await keyRes.text()).trim() : ''
  if (keyBody !== KEY) { console.error(`Key file ${SITE}/${KEY}.txt is not live (HTTP ${keyRes.status}). Deploy first.`); return 1 }

  let failed = false
  for (const endpoint of ENDPOINTS) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
    })
    // 200 OK / 202 Accepted = 받음. 400 형식, 403 키, 422 URL·키 불일치, 429 너무 잦음
    const ok = res.status === 200 || res.status === 202
    failed ||= !ok
    console.log(`${endpoint} → HTTP ${res.status}${ok ? '' : ` ${(await res.text()).slice(0, 200)}`}`)
  }
  return failed ? 1 : 0
}
process.exitCode = await main()
