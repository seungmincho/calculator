// 화면 크기 비교 회귀 체크: node scripts/check-screen-compare.ts
import {
  screenGeom, screenRatioLabel, applyRatio, autoScale, pctMore, serializeScreens, parseScreens, layoutBoxes, findPreset, PRESETS, SCENARIOS,
} from '../src/utils/screenCompare.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const r1 = (n: number) => Math.round(n * 10) / 10

// 27" QHD: 59.8 × 33.6 cm, 108.8 PPI, 피치 0.233mm, 레티나 거리 ≈ 80cm
const a = screenGeom({ d: 27, w: 2560, h: 1440, scale: 0 })!
eq([r1(a.widthCm), r1(a.heightCm), r1(a.ppi), Math.round(a.dotPitchMm * 1000)], [59.8, 33.6, 108.8, 233], '27 QHD 치수')
eq(Math.round(a.distRetinaCm), 80, '27 QHD 레티나 거리')
eq([a.scale, a.workspace, r1(a.workspaceVsFhd!)], [100, [2560, 1440], 1.8], '27 QHD 작업공간')

// 32" 4K: 면적 40% 큼, PPI 137.7(27% 촘촘), 자동 125% → 3072×1728
const b = screenGeom({ d: 32, w: 3840, h: 2160, scale: 0 })!
eq(Math.round(pctMore(a.areaCm2, b.areaCm2)), 40, '32 vs 27 면적')
eq([r1(b.ppi), Math.round(pctMore(a.ppi, b.ppi))], [137.7, 27], '32 4K PPI')
eq([b.scale, b.autoScale, b.workspace], [125, true, [3072, 1728]], '32 4K 자동 배율')
eq(screenGeom({ d: 32, w: 3840, h: 2160, scale: 150 })!.workspace, [2560, 1440], '32 4K 150% 수동')

// 65" 4K TV: 143.9 × 80.9 cm, THX 40° ≈ 198cm, SMPTE 30° ≈ 268cm, 레티나 ≈ 129cm
const tv = screenGeom({ d: 65, w: 3840, h: 2160, scale: 0 })!
eq([r1(tv.widthCm), r1(tv.heightCm)], [143.9, 80.9], '65 TV 치수')
eq([Math.round(tv.distThxCm), Math.round(tv.distSmpteCm), Math.round(tv.distRetinaCm)], [198, 269, 129], '65 TV 시청거리')

// 폰은 작업공간 계산 안 함
eq(screenGeom({ d: 6.3, w: 1206, h: 2622, scale: 0 })!.workspace, null, '폰 작업공간 없음')
eq(screenGeom({ d: 0, w: 1920, h: 1080, scale: 0 }), null, '잘못된 입력')

// 자동 배율
eq([24, 27, 15.6, 14, 13.3].map((d, i) => autoScale(screenGeom({ d, w: [1920, 3840, 1920, 1920, 1920][i], h: [1080, 2160, 1080, 1080, 1080][i], scale: 0 })!.ppi)),
  [100, 150, 125, 150, 150], '자동 배율 표')

// 비율 라벨
eq([screenRatioLabel(2556, 1179), screenRatioLabel(1179, 2556), screenRatioLabel(5120, 1440), screenRatioLabel(2560, 1600),
  screenRatioLabel(3440, 1440), screenRatioLabel(1920, 1080), screenRatioLabel(2856, 1280)],
  ['19.5:9', '9:19.5', '32:9', '16:10', '≈ 21:9', '16:9', '20:9'], '비율 라벨')
eq([applyRatio(2560, 1440, 21, 9), applyRatio(1200, 2600, 19.5, 9)], [[2560, 1097], [1200, 2600]], '비율 적용')

// URL
const list = [{ d: 27, w: 2560, h: 1440, scale: 0 }, { d: 6.3, w: 1206, h: 2622, scale: 125 }]
eq(serializeScreens(list), '27_2560_1440-6.3_1206_2622_125', '직렬화')
eq(parseScreens(serializeScreens(list)), list, '왕복')
eq(parseScreens('27_2560_1440_133-x-0_1_1-32_3840_2160'), [{ d: 27, w: 2560, h: 1440, scale: 0 }, { d: 32, w: 3840, h: 2160, scale: 0 }], '잘못된 항목 무시')
eq(parseScreens(''), null, '빈 파라미터')

// 레이아웃
const L = layoutBoxes([{ w: 60, h: 34 }, { w: 70, h: 40 }], 'bl')
eq([L.vbW, L.vbH, L.boxes[0]], [70, 40, { x: 0, y: 6, w: 60, h: 34 }], '왼쪽 아래 정렬')
eq(layoutBoxes([{ w: 60, h: 34 }, { w: 70, h: 40 }], 'center').boxes[0], { x: 5, y: 3, w: 60, h: 34 }, '가운데 정렬')
eq(r1(layoutBoxes([{ w: 60, h: 34 }, { w: 70, h: 40 }], 'side').vbW), 134.2, '나란히')

// 프리셋 무결성
eq(new Set(PRESETS.map(p => p.id)).size, PRESETS.length, '프리셋 id 중복')
eq(SCENARIOS.flat().every(id => PRESETS.some(p => p.id === id)), true, '조합 id 존재')
eq(findPreset({ d: 6.3, w: 2622, h: 1206 })?.id, 'iphone-17', '회전해도 프리셋 인식')

if (fail) { console.log(`${fail} failed`); process.exit(1) }
console.log('check-screen-compare: all passed')
