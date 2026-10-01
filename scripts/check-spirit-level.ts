// 수평계 회귀 체크: node scripts/check-spirit-level.ts
import {
  upVector, toScreen, lowPass, surfaceReading, edgeReading, slopePercent, mmPerMeter, isLevel, bubbleScale,
  nearestAxis, reversalZero, rotateFromTo, applyCalibration, parseCalibration, compassHeading, smoothAngle, compassKey,
  norm, type Vec3,
} from '../src/utils/spiritLevel.ts'

let fail = 0
const eq = (a: unknown, b: unknown, msg: string) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', msg, JSON.stringify(a), '!=', JSON.stringify(b)) }
}
const r = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d + 0 // +0: -0 → 0
const rv = (v: number[], d = 3) => v.map(x => r(x, d))
const D = Math.PI / 180

// 위쪽 벡터: 눕힘 = +z, 세움(beta 90) = +y
eq(rv(upVector(0, 0)), [0, 0, 1], '평평')
eq(rv(upVector(90, 0)), [0, 1, 0], '세로로 세움')
// gamma +10 = 오른쪽 변이 내려감 → 오른쪽 변 높이각 -10 (버블은 왼쪽, 높은 쪽)
eq(r(surfaceReading(upVector(0, 10)).x, 2), -10, 'gamma → 오른쪽 낮음')
eq(r(surfaceReading(upVector(5, 0)).y, 2), 5, 'beta → 위쪽 높음')
// 전체 기울기 = acos(cosβ·cosγ) (√(β²+γ²) 근사 아님)
eq(r(surfaceReading(upVector(30, 40)).total, 3), r(Math.acos(Math.cos(30 * D) * Math.cos(40 * D)) / D, 3), '전체 기울기')
eq(r(surfaceReading(upVector(0, 0)).total, 3), 0, '평평 0°')

// 화면 회전: angle 90(반시계) → 기기 +x가 화면 위쪽
eq(rv(toScreen([1, 0, 0], 90)), [0, 1, 0], '가로 화면 +x')
eq(rv(toScreen([0, 1, 0], 90)), [-1, 0, 0], '가로 화면 +y')
eq(rv(toScreen([0.1, 0.2, 0.97], 0)), [0.1, 0.2, 0.97], '세로 화면 그대로')

// 모서리 모드
const tiltIn = (deg: number): Vec3 => [Math.sin(deg * D), Math.cos(deg * D), 0]
eq({ ...edgeReading(tiltIn(0)), offset: r(edgeReading(tiltIn(0)).offset) }, { offset: 0, abs: 0, vertical: false, upright: true }, '세로로 세워 수평')
eq(r(edgeReading(tiltIn(2)).offset), 2, '오른쪽 끝 높음 +')
eq(r(edgeReading(tiltIn(-1.5)).offset), -1.5, '왼쪽 끝 높음 -')
eq([edgeReading(tiltIn(89)).vertical, r(edgeReading(tiltIn(89)).offset)], [true, 1], '가로로 세움(화면 회전 없음): 위쪽 끝 높음')
eq([edgeReading(tiltIn(178)).vertical, r(edgeReading(tiltIn(178)).offset)], [false, 2], '거꾸로: 화면 오른쪽 끝 높음')
eq(edgeReading([0.1, 0.1, 0.99]).upright, false, '눕힌 상태 감지')

// 단위 환산
eq(r(slopePercent(45), 6), 100, '45° = 100%')
eq(r(mmPerMeter(1), 2), 17.46, '1° = 17.46mm/m')
eq(r(slopePercent(-2), 2), -3.49, '음수 경사')

// 수평 판정 (0.1° 반올림 기준 ±0.2°)
eq([isLevel(0.24), isLevel(0.25), isLevel(-0.15), isLevel(1)], [true, false, true, false], '수평 판정')
eq([bubbleScale(0), r(bubbleScale(1)), r(bubbleScale(3)), r(bubbleScale(-3))], [0, 0.25, 0.5, -0.5], '버블 눈금')

// 저역통과: 첫 값 그대로, 큰 dt면 새 값에 수렴, 결과는 단위벡터
eq(lowPass(null, [0, 0, 1], 0.016), [0, 0, 1], '첫 샘플')
eq(rv(lowPass([0, 0, 1], [0, 1, 0], 100)), [0, 1, 0], '수렴')
eq(r(Math.hypot(...lowPass([0, 0, 1], [0, 1, 0], 0.05))), 1, '정규화')

// 보정
eq(nearestAxis([0.1, -0.9, 0.2]).key, '-y', '가까운 축')
eq(rv(rotateFromTo([0.6, 0, 0.8], [0.6, 0, 0.8], [0, 0, 1])), [0, 0, 1], 'from→to')
eq(rv(rotateFromTo([0, 1, 0], [0, 0, 1], [0, 0, 1])), [0, 1, 0], '항등')
// 뒤집기 보정: 면 기울기 2°(+ 센서 오차). 180° 돌리면 면 기울기만 부호 반전.
const bias: Vec3 = [0.01, -0.02, 0]
const meas = (t: Vec3): Vec3 => norm([t[0] + bias[0], t[1] + bias[1], t[2]])
const zero = reversalZero(meas(upVector(0, 2)), meas(upVector(0, -2)))
eq(rv(zero, 4), rv(norm([0.01, -0.02, Math.cos(2 * D)]), 4), '뒤집기 보정 = 센서 오차')
// 보정 후 진짜 수평면은 0°, 기울어진 면은 원래 각도 (±0.05°)
eq(r(surfaceReading(applyCalibration(meas([0, 0, 1]), { '+z': zero })).total, 1), 0, '보정 후 수평 0')
eq(r(surfaceReading(applyCalibration(meas(upVector(0, 2)), { '+z': zero })).x, 1), -2, '보정 후 2° 유지')
// 다른 자세의 보정은 적용 안 됨
eq(applyCalibration([0, 1, 0], { '+z': zero }), [0, 1, 0], '자세별 보정')
eq(parseCalibration('{"+z":[0.01,0.02,1],"+y":[1,0,0],"-x":"x"}'), { '+z': norm([0.01, 0.02, 1]) }, '저장값 검증')
eq(parseCalibration('garbage'), {}, '손상 저장값')
eq(parseCalibration(null), {}, '저장값 없음')

// 나침반: Android absolute alpha는 반시계 → 동쪽을 보면 alpha 270, 방위 90
eq(compassHeading(270, true, undefined, 0), 90, 'Android 동쪽')
eq(compassHeading(0, true, undefined, 0), 0, 'Android 북쪽')
eq(compassHeading(123, false, undefined, 0), null, '상대 alpha는 방위 아님')
eq(compassHeading(10, false, 45, 0), 45, 'iOS webkitCompassHeading')
eq(compassHeading(0, true, undefined, 90), 90, '가로 화면 보정')
eq(r(smoothAngle(350, 10, 100)), 10, '각도 수렴')
eq(r(smoothAngle(350, 10, 0.3 * Math.LN2)), 0, '359↔0 경계 통과')
eq([compassKey(350), compassKey(22), compassKey(23), compassKey(180), compassKey(300)], ['north', 'north', 'northeast', 'south', 'northwest'], '8방위')

console.log(fail ? `${fail} FAILED` : 'all passed')
if (fail) process.exit(1)
