// 화면 정보 로직 회귀 체크: node scripts/check-screen-info.ts
import { physicalPx, ppiCalc, activeBreakpoint, resolutionName, estimateHz, ratioLabel, DEVICE_REFERENCE } from '../src/utils/screenInfo.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const r = (n: number | undefined, d = 2) => (n === undefined ? n : +n.toFixed(d))

// 실제 픽셀 = CSS px × DPR
eq(physicalPx(1280, 1.5), 1920, 'Windows 150%')
eq(physicalPx(1536, 1.25), 1920, 'Windows 125%')
eq(physicalPx(390, 3), 1170, 'iPhone 13')

// PPI: 24" FHD ≈ 91.79, 27" QHD ≈ 108.79, 27" 4K ≈ 163.18, 6.1" 1170x2532 ≈ 457
const fhd = ppiCalc(1920, 1080, 24)
eq(r(fhd?.ppi), 91.79, '24 FHD ppi')
eq(r(fhd?.dotPitchMm, 3), 0.277, '24 FHD dot pitch')
eq(r(fhd?.widthCm, 1), 53.1, '24 FHD width cm')
eq(r(fhd?.heightCm, 1), 29.9, '24 FHD height cm')
eq(r(ppiCalc(2560, 1440, 27)?.ppi), 108.79, '27 QHD')
eq(r(ppiCalc(3840, 2160, 27)?.ppi), 163.18, '27 4K')
eq(Math.round(ppiCalc(1170, 2532, 6.1)!.ppi), 457, 'iPhone 13 ppi')
eq(ppiCalc(1920, 1080, 0), null, '0 inch')
eq(ppiCalc(NaN, 1080, 24), null, 'NaN')

// 브레이크포인트 (min-width 경계)
eq(activeBreakpoint(375, 'tailwind'), 'base', 'tw 375')
eq(activeBreakpoint(639, 'tailwind'), 'base', 'tw 639')
eq(activeBreakpoint(640, 'tailwind'), 'sm', 'tw 640')
eq(activeBreakpoint(1024, 'tailwind'), 'lg', 'tw 1024')
eq(activeBreakpoint(1920, 'tailwind'), '2xl', 'tw 1920')
eq(activeBreakpoint(575, 'bootstrap'), 'xs', 'bs 575')
eq(activeBreakpoint(576, 'bootstrap'), 'sm', 'bs 576')
eq(activeBreakpoint(991, 'bootstrap'), 'md', 'bs 991')
eq(activeBreakpoint(992, 'bootstrap'), 'lg', 'bs 992')
eq(activeBreakpoint(1400, 'bootstrap'), 'xxl', 'bs 1400')

// 비율 라벨
eq(ratioLabel(1920, 1080), '16:9', '1920x1080')
eq(ratioLabel(1080, 1920), '9:16', 'portrait')
eq(ratioLabel(1440, 900), '16:10', '1440x900')
eq(ratioLabel(1280, 1024), '5:4', '1280x1024')
eq(ratioLabel(2560, 1080), '≈ 21:9', '2560x1080')
eq(ratioLabel(1366, 768), '≈ 16:9', '1366x768')
eq(ratioLabel(3440, 1440), '≈ 21:9', '3440x1440')
eq(ratioLabel(390, 844), '1:2.16', 'iPhone portrait')
eq(ratioLabel(0, 100), '—', 'zero')

// 해상도 이름
eq(resolutionName(1920, 1080), 'FHD', 'FHD')
eq(resolutionName(1080, 1920), 'FHD', 'FHD portrait')
eq(resolutionName(3840, 2160), '4K UHD', '4K')
eq(resolutionName(1170, 2532), null, 'phone none')

// 주사율 추정
const frames = (ms: number, n = 60) => Array.from({ length: n }, (_, i) => ms + (i % 2 ? 0.2 : -0.2))
eq(estimateHz(frames(1000 / 60)), 60, '60Hz')
eq(estimateHz(frames(1000 / 144)), 144, '144Hz')
eq(estimateHz(frames(1000 / 120)), 120, '120Hz')
eq(estimateHz([...frames(1000 / 60), 200, 50, 0]), 60, 'outliers ignored')
eq(estimateHz(frames(16, 5)), null, 'too few samples')
eq(estimateHz(frames(1000 / 37)), 37, 'unusual rate stays raw')

// 참고표 무결성: DPR 3 폰은 실제 픽셀이 정수
for (const d of DEVICE_REFERENCE) {
  eq(Number.isInteger(d.css[0] * d.dpr) && Number.isInteger(d.css[1] * d.dpr), true, `ref integer ${d.name}`)
}
eq(physicalPx(430, 3), 1290, 'iPhone 15 Pro Max width')

console.log(fail ? `${fail} FAIL` : 'all ok')
if (fail) process.exit(1)
