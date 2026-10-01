// 색맹 시뮬레이터 회귀 체크: node scripts/check-color-blindness.ts
import {
  cvdMatrix, applyM, simulateHex, simulatePixels, hexToLab, ciede2000, hexDeltaE, parseHexList, normalizeHex,
  checkPalette, PALETTE_RISKY, PALETTE_OKABE_ITO, type Cvd,
} from '../src/utils/colorBlindnessSim.ts'
import { hexToLinear, linearToHex } from '../src/utils/colorBlindTest.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const near = (a: number, b: number, eps: number, msg: string) => {
  if (!(Math.abs(a - b) <= eps)) { fail++; console.log('FAIL', msg, a, '!~', b) }
}
const r4 = (m: number[]) => m.map((v) => Math.round(v * 1e6) / 1e6)

// ── 1. Machado 2009 행렬 표·보간 (colorspacious 테스트값) ──
eq(r4(cvdMatrix('deutan', 50)), [0.547494, 0.607765, -0.155259, 0.181692, 0.781742, 0.036566, -0.01041, 0.027275, 0.983136], 'deutan 50')
const d50 = cvdMatrix('deutan', 50), d60 = cvdMatrix('deutan', 60)
eq(r4(cvdMatrix('deutan', 53.1)), r4(d50.map((v, i) => 0.69 * v + 0.31 * d60[i])), 'deutan 53.1 보간')
near(cvdMatrix('protan', 100)[0], 0.152286, 1e-9, 'protan 100 [0,0]')
near(cvdMatrix('tritan', 100)[7], 0.691367, 1e-9, 'tritan 100 [2,1]')
for (const t of ['protan', 'deutan', 'tritan', 'achroma'] as Cvd[]) {
  eq(r4(cvdMatrix(t, 0)), [1, 0, 0, 0, 1, 0, 0, 0, 1], `${t} 심각도 0 = 항등`)
  for (const s of [0, 30, 55, 100]) eq(simulateHex('#ffffff', t, s), '#ffffff', `${t} ${s} 흰색 보존`)
  eq(simulateHex('#000000', t, 100), '#000000', `${t} 검정 보존`)
}
eq(r4(cvdMatrix('protan', 140)), r4(cvdMatrix('protan', 100)), '심각도 상한 클램프')
eq(r4(cvdMatrix('protan', -5)), r4(cvdMatrix('protan', 0)), '심각도 하한 클램프')
eq(simulateHex('#3182f6', 'normal'), '#3182f6', '정상 = 원본')

// 전색맹: 선형 휘도 회색 (sRGB 평균이 아님)
eq(simulateHex('#ff0000', 'achroma'), '#7f7f7f', '빨강 휘도 0.2126 → #7f7f7f')
eq(simulateHex('#00ff00', 'achroma'), '#dcdcdc', '초록 휘도 0.7152')

// 선형 RGB에서 적용했는지: 감마 공간 적용과 결과가 달라야 하고, 직접 계산과 같아야 한다
const m = cvdMatrix('deutan', 100)
eq(simulateHex('#8e3a2b', 'deutan'), linearToHex(applyM(m, hexToLinear('#8e3a2b'))), '선형 RGB 경로')

// 혼동선: Machado 행렬의 영공간 방향으로만 다른 두 색은 정상에겐 다르고 해당 유형에겐 같다
for (const t of ['protan', 'deutan'] as const) {
  const k = cvdMatrix(t, 100)
  const n = [k[1] * k[5] - k[2] * k[4], k[2] * k[3] - k[0] * k[5], k[0] * k[4] - k[1] * k[3]]
  const s = 0.12 / Math.max(...n.map(Math.abs))
  const base: [number, number, number] = [0.3, 0.3, 0.3]
  const a = linearToHex(base), b = linearToHex([base[0] + n[0] * s, base[1] + n[1] * s, base[2] + n[2] * s])
  const [row0, rowT] = checkPalette([a, b], 100, ['normal', t])
  if (!(row0.minDe > 10)) { fail++; console.log('FAIL', t, '정상 ΔE', row0.minDe, a, b) }
  if (!(rowT.minDe < 2)) { fail++; console.log('FAIL', t, '혼동 ΔE', rowT.minDe, a, b) }
  eq(rowT.issues.length, 1, `${t} 혼동쌍 1개 검출`)
}

// ── 2. 이미지 경로 = 색 경로 (LUT 오차 ±1) ──
const px = [0x8e, 0x3a, 0x2b, 200, 0x12, 0xc4, 0x7a, 0]
for (const t of ['protan', 'deutan', 'tritan', 'achroma'] as Cvd[]) {
  const out = simulatePixels(px, t, 70)
  for (let p = 0; p < 2; p++) {
    const hex = '#' + px.slice(p * 4, p * 4 + 3).map((v) => v.toString(16).padStart(2, '0')).join('')
    const want = parseInt(simulateHex(hex, t, 70).slice(1), 16)
    ;[(want >> 16) & 255, (want >> 8) & 255, want & 255].forEach((v, c) => near(out[p * 4 + c], v, 1, `${t} 픽셀 ${p}.${c}`))
  }
  eq([out[3], out[7]], [200, 0], `${t} 알파 유지`)
}

// ── 3. CIELAB · CIEDE2000 (Sharma, Wu & Dalal 2005 시험 데이터) ──
const lab = hexToLab('#ff0000')
near(lab[0], 53.24, 0.01, 'L* 빨강'); near(lab[1], 80.09, 0.02, 'a* 빨강'); near(lab[2], 67.20, 0.02, 'b* 빨강')
eq(hexToLab('#ffffff').map((v) => Math.round(v * 1000) / 1000), [100, 0, 0], '흰색 Lab')
const sharma: [number[], number[], number][] = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
  [[50, 2.5, 0], [73, 25, -18], 27.1492],
  [[50, 2.5, 0], [50, 3.1736, 0.5854], 1.0],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
]
sharma.forEach(([a, b, d], i) => near(ciede2000(a as never, b as never), d, 1e-4, `Sharma #${i}`))
near(hexDeltaE('#123456', '#123456'), 0, 1e-12, '같은 색 ΔE 0')

// ── 4. HEX 파싱 ──
eq(normalizeHex('#ABC'), '#aabbcc', '3자리')
eq(normalizeHex('zzz'), null, '잘못된 값')
eq(parseHexList('#E53935, 43a047\n#fff #fff xyz 1e88e5-8e24aa'), ['#e53935', '#43a047', '#ffffff', '#1e88e5', '#8e24aa'], '목록 파싱·중복 제거')
eq(parseHexList(Array.from({ length: 20 }, (_, i) => (i * 99999).toString(16).padStart(6, '0')).join(',')).length, 12, '최대 12색')

// ── 5. 프리셋: 빨강·초록 팔레트는 적록 유형에서 걸리고, Okabe-Ito는 적록에서 통과 ──
const risky = checkPalette(PALETTE_RISKY, 100)
eq(risky.find((r) => r.type === 'normal')!.issues.length, 0, '위험 팔레트 정상 시야 OK')
if (!(risky.find((r) => r.type === 'deutan')!.issues.length > 0)) { fail++; console.log('FAIL 위험 팔레트 deutan 미검출') }
if (!(risky.find((r) => r.type === 'protan')!.issues.length > 0)) { fail++; console.log('FAIL 위험 팔레트 protan 미검출') }
const oi = checkPalette(PALETTE_OKABE_ITO, 100)
for (const t of ["protan", "deutan"]) eq(oi.find((r) => r.type === t)!.issues.length, 0, `Okabe-Ito ${t} 통과`)

if (fail) { console.log(`${fail} FAIL`); process.exit(1) }
console.log('color-blindness OK')
