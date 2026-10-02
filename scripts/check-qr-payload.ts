// QR payload 회귀 체크: node scripts/check-qr-payload.ts
import QRCode from 'qrcode'
import { buildPayload, escapeWifi, escapeVcard, contrastRatio, parseHex, normalizeUrl, parseCoords, qrSvg, printQrMm, PRINT_LAYOUTS, density, EMPTY_FIELDS, type QrFields } from '../src/utils/qrPayload.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const ok = (v: boolean, msg: string) => { if (!v) { fail++; console.log('FAIL', msg) } }
const F = (p: Partial<QrFields>): QrFields => ({ ...EMPTY_FIELDS, ...p })

// Wi-Fi: \ ; , : " 이스케이프, H 포함, nopass는 P 생략
eq(escapeWifi('My;Wi,Fi:"x"\\'), 'My\\;Wi\\,Fi\\:\\"x\\"\\\\', 'Wi-Fi 이스케이프')
eq(buildPayload('wifi', F({ ssid: 'Cafe', password: 'p;ss', security: 'WPA' })), 'WIFI:T:WPA;S:Cafe;P:p\\;ss;H:false;;', 'Wi-Fi WPA')
eq(buildPayload('wifi', F({ ssid: 'Guest', password: 'ignored', security: 'nopass', hidden: true })), 'WIFI:T:nopass;S:Guest;H:true;;', 'Wi-Fi 개방·숨김')
eq(buildPayload('wifi', F({ ssid: '' })), '', 'Wi-Fi SSID 없음')

// vCard: CRLF 줄바꿈, 텍스트 값 이스케이프, 줄바꿈 주입 차단
const v = buildPayload('vcard', F({ name: '홍길동', org: '툴허브, 개발팀', tel: '010-1234 5678', email: 'a@b.com', site: 'toolhub.ai.kr' }))
eq(v.split('\r\n'), ['BEGIN:VCARD', 'VERSION:3.0', 'N:홍길동;;;;', 'FN:홍길동', 'ORG:툴허브\\, 개발팀', 'TEL;TYPE=CELL:01012345678', 'EMAIL:a@b.com', 'URL:https://toolhub.ai.kr', 'END:VCARD'], 'vCard 줄')
ok(!/[^\r]\n/.test(v), 'vCard 맨 LF 없음')
eq(escapeVcard('a\nb;c\\'), 'a\\nb\\;c\\\\', 'vCard 이스케이프')
ok(!buildPayload('vcard', F({ name: 'A', email: 'x@y.z\nORG:evil' })).includes('\nORG:evil'), 'vCard 줄바꿈 주입')
eq(buildPayload('vcard', F({ name: '  ' })), '', 'vCard 이름 없음')

// URL·문자·이메일·전화·위치
eq(normalizeUrl('toolhub.ai.kr'), 'https://toolhub.ai.kr', 'URL 스킴 추가')
eq(normalizeUrl('httpbin.org'), 'https://httpbin.org', 'http로 시작하는 도메인')
eq(normalizeUrl('http://a.com'), 'http://a.com', 'URL 스킴 유지')
eq(buildPayload('sms', F({ smsTo: '010-1234-5678', smsBody: '예약: 2명' })), 'SMSTO:01012345678:예약: 2명', 'SMSTO')
eq(buildPayload('email', F({ mailTo: 'a@b.com', subject: '문의 & 견적', body: '' })), 'mailto:a@b.com?subject=%EB%AC%B8%EC%9D%98%20%26%20%EA%B2%AC%EC%A0%81', 'mailto 제목')
eq(buildPayload('email', F({ mailTo: 'a@b.com' })), 'mailto:a@b.com', 'mailto 주소만')
eq(buildPayload('phone', F({ phone: '+82 (10) 1234-5678' })), 'tel:+821012345678', 'tel')
eq(parseCoords('37.5665, 126.978'), [37.5665, 126.978], '좌표 파싱')
eq(parseCoords('95, 10'), null, '위도 범위 밖')
eq(buildPayload('geo', F({ place: '37.5665,126.978', geoFormat: 'geo' })), 'geo:37.5665,126.978', 'geo 좌표')
eq(buildPayload('geo', F({ place: '서울시청', geoFormat: 'geo' })), 'geo:0,0?q=%EC%84%9C%EC%9A%B8%EC%8B%9C%EC%B2%AD', 'geo 주소 검색')
eq(buildPayload('geo', F({ place: '서울시청' })), 'https://www.google.com/maps/search/?api=1&query=%EC%84%9C%EC%9A%B8%EC%8B%9C%EC%B2%AD', '지도 링크')
eq(buildPayload('text', F({ text: '   ' })), '', '빈 텍스트')

// 대비 비율 (WCAG)
eq(+contrastRatio('#000', '#ffffff').toFixed(2), 21, '검정/흰색 21:1')
eq(+contrastRatio('#3182f6', '#3182F6').toFixed(2), 1, '같은 색 1:1')
eq(+contrastRatio('#777777', '#fff').toFixed(2), 4.48, '#777/흰색 4.48:1')
eq(parseHex('abc'), '#aabbcc', 'HEX 3자리')
eq(parseHex('#12345'), null, 'HEX 잘못됨')

// QR 버전·밀도·SVG
const qr = QRCode.create('https://toolhub.ai.kr', { errorCorrectionLevel: 'M' })
eq([qr.version, qr.modules.size, density(qr.version)], [2, 25, 'low'], 'toolhub URL = 버전 2')
let tooBig = false
try { QRCode.create('x'.repeat(3000), { errorCorrectionLevel: 'L' }) } catch { tooBig = true }
ok(tooBig, '3000바이트는 생성 불가')
const svg = qrSvg(qr.modules, { margin: 4, fg: '#000000', bg: '#ffffff', px: 512 })
ok(svg.includes('viewBox="0 0 33 33"') && svg.includes('<path fill="#000000" d="M'), 'SVG viewBox·path')
ok(qrSvg(qr.modules, { margin: 4, fg: '#000', bg: '#fff', px: 512, logo: { href: 'data:x', pct: 20, aspect: 1, opacity: 1 } }).includes('xlink:href="data:x"'), 'SVG 로고')

// 인쇄 배치: 모든 배치가 2cm 이상
eq(PRINT_LAYOUTS.map(([c, r]) => printQrMm(c, r, true)), [78, 55, 41], 'A4 배치 크기(캡션 포함)')

console.log(fail ? `${fail} FAILED` : 'all ok')
if (fail) process.exit(1)
