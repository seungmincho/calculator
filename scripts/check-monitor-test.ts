// 모니터 테스트 로직 회귀 체크: node scripts/check-monitor-test.ts
import assert from 'node:assert/strict'
import {
  TESTS, CHECKS, nextState, prevState, stepsOf, keyAction, swipeAction, estimateRefreshRate,
  quantize, steppedGradient, encodeResults, decodeResults, overallGrade, gamutFrom,
} from '../src/utils/monitorTest.ts'

// 목록 무결성
assert.equal(new Set(TESTS.map(t => t.id)).size, TESTS.length, 'test id 중복')
assert.ok(CHECKS.every(c => TESTS.some(t => t.id === c.id)), 'CHECKS id는 TESTS에 존재')
assert.equal(new Set(CHECKS.map(c => c.code)).size, CHECKS.length, 'code 중복')
assert.ok(!CHECKS.some(c => c.id === 'pixelFix'), '빠른 점검에 깜빡임 테스트 제외')

// 상태 머신
const order = ['levels', 'sharpness'] as const
let s = { order: [...order], test: 0, step: 0 }
assert.deepEqual(nextState(s), { order: [...order], test: 0, step: 1 })
s = nextState(s)!
assert.deepEqual(nextState(s), { order: [...order], test: 1, step: 0 }, '다음 테스트로')
let walk: typeof s | null = { order: [...order], test: 0, step: 0 }
let n = 0
while (walk) { walk = nextState(walk); n++ }
assert.equal(n, stepsOf('levels') + stepsOf('sharpness'), '총 단계 수만큼 진행 후 종료')
assert.deepEqual(prevState({ order: [...order], test: 1, step: 0 }), { order: [...order], test: 0, step: 1 }, '이전 테스트 마지막 단계')
assert.deepEqual(prevState({ order: [...order], test: 0, step: 0 }), { order: [...order], test: 0, step: 0 }, '처음이면 유지')
// 이미지 업로드 시 imageQuality +1 단계
assert.equal(stepsOf('imageQuality', { imageQuality: 1 }), 11)
assert.deepEqual(nextState({ order: ['imageQuality'], test: 0, step: 9 }, { imageQuality: 1 }), { order: ['imageQuality'], test: 0, step: 10 })
assert.equal(nextState({ order: ['imageQuality'], test: 0, step: 9 }), null)

// 입력
assert.equal(keyAction(' '), 'next')
assert.equal(keyAction('ArrowLeft'), 'prev')
assert.equal(keyAction('Escape'), 'exit')
assert.equal(keyAction('a'), null)
assert.equal(swipeAction(2, 3), 'next', '탭')
assert.equal(swipeAction(-120, 10), 'next', '왼쪽 스와이프')
assert.equal(swipeAction(120, 10), 'prev', '오른쪽 스와이프')
assert.equal(swipeAction(20, 200), null, '세로 스크롤성 제스처 무시')
assert.equal(swipeAction(30, 0), null, '애매한 이동 무시')

// 주사율 추정
const frames = (hz: number, k = 60) => Array.from({ length: k }, () => 1000 / hz)
assert.equal(estimateRefreshRate(frames(60)), 60)
assert.equal(estimateRefreshRate(frames(144)), 144)
assert.equal(estimateRefreshRate(frames(165)), 165)
assert.equal(estimateRefreshRate(frames(59.94)), 60, 'NTSC 59.94 → 60')
assert.equal(estimateRefreshRate([...frames(120), 33.3, 50, 50, 250, 0]), 120, '드랍·튀는 값 무시')
assert.equal(estimateRefreshRate([16.7, 16.7]), null, '샘플 부족')
assert.equal(estimateRefreshRate(frames(1000 / 9)), 111, '스냅 대상 없으면 반올림')

// 밴딩
assert.equal(quantize(0, 64), 0)
assert.equal(quantize(255, 64), 255)
assert.equal(new Set(Array.from({ length: 256 }, (_, v) => quantize(v, 64))).size, 64, '6비트 = 64단계')
const g = steppedGradient(4, [1, 0, 0])
assert.ok(g.startsWith('linear-gradient(to right, rgb(0,0,0) 0.000%'), g)
assert.ok(g.includes('rgb(255,0,0) 100.000%'), g)
assert.equal(g.match(/rgb\(/g)!.length, 8)

// 결과 인코딩
const r = { deadPixel: 3, lightBleed: 1, burnIn: 0 }
assert.equal(encodeResults(r), 'dp3.lb1.bi0')
assert.deepEqual(decodeResults('dp3.lb1.bi0'), r)
assert.deepEqual(decodeResults('lb9.xx1.dp12.garbage'), { deadPixel: 12 }, '잘못된 값 무시')
assert.deepEqual(decodeResults(null), {})
assert.equal(overallGrade({}), null)
assert.equal(overallGrade({ deadPixel: 0, lightBleed: 0 }), 0)
assert.equal(overallGrade({ deadPixel: 1, lightBleed: 0 }), 1)
assert.equal(overallGrade({ deadPixel: 5 }), 2)
assert.equal(overallGrade({ deadPixel: 0, burnIn: 2 }), 2)

assert.equal(gamutFrom(q => q.includes('p3')), 'p3')
assert.equal(gamutFrom(() => false), 'srgb')
assert.equal(gamutFrom(() => true), 'rec2020')

console.log('check-monitor-test: OK')
