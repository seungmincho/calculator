// node scripts/check-daily-schedule.ts (Node 24) — 생활계획표 시간 계산·겹침·합계·URL 회귀 체크
import assert from 'node:assert/strict'
import {
  dur, segs, overlaps, overlapMin, summarize, templateOf, newBlock, duplicate, encodeBlocks, decodeBlocks, toQuery, fromQuery,
  hasPlanQuery, parseSaved, chartModel, exportSvg, hhmm, snap, cleanLabel, wedgePath,
  TEMPLATES, TEMPLATE_IDS, DEFAULT_PLAN, DAY, MAX_BLOCKS, LABEL_KEYS, type Block, type Plan,
} from '../src/utils/dailySchedule.ts'

const B = (s: string, e: string, label = '', color = 0): Block => {
  const m = (x: string) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3))
  return { start: m(s), end: m(e), color, key: null, label }
}
const name = (b: Block) => b.key ?? b.label
const q = (s: string) => { const p = new URLSearchParams(s); return (k: string) => p.get(k) }

// ── 자정을 넘는 시간 계산
{
  assert.equal(dur(B('22:00', '07:00')), 540, '22:00~07:00 = 9시간')
  assert.equal(dur(B('23:30', '07:30')), 480)
  assert.equal(dur(B('18:00', '00:00')), 360, '자정에 끝남')
  assert.equal(dur(B('00:00', '06:00')), 360)
  assert.equal(dur(B('09:00', '09:00')), 0, '시작 = 끝은 0분')
  assert.deepEqual(segs(B('22:00', '07:00')), [[1320, 1440], [0, 420]])
  assert.deepEqual(segs(B('18:00', '00:00')), [[1080, 1440]])
  assert.deepEqual(segs(B('09:00', '09:00')), [])
  assert.equal(hhmm(0), '00:00')
  assert.equal(hhmm(1430), '23:50')
  assert.equal(snap(1435), 0, '23:55 → 00:00')
  assert.equal(snap(-10), 1430)
  // 12시간 이하면 작은 호(플래그 0), 넘으면 큰 호(1)
  assert.match(wedgePath(1320, 540), /A128 128 0 0 1 /)
  assert.match(wedgePath(0, 800), /A128 128 0 1 1 /)
}

// ── 겹침
{
  const sleep = B('22:00', '07:00', '수면')
  assert.equal(overlapMin(sleep, B('06:00', '08:00')), 60, '자정 넘은 일정과 아침 겹침')
  assert.equal(overlapMin(sleep, B('21:00', '23:00')), 60, '밤 겹침')
  assert.equal(overlapMin(sleep, B('07:00', '09:00')), 0, '끝 = 시작은 안 겹침')
  assert.equal(overlapMin(sleep, B('23:00', '01:00')), 120, '둘 다 자정 넘음')
  assert.equal(overlapMin(B('09:00', '09:00'), B('08:00', '10:00')), 0, '0분 일정')
  assert.deepEqual(overlaps([sleep, B('07:00', '12:00'), B('11:00', '13:00'), B('06:30', '07:00')]), [
    { a: 0, b: 3, min: 30 }, { a: 1, b: 2, min: 60 },
  ])
  for (const id of TEMPLATE_IDS) assert.deepEqual(overlaps(TEMPLATES[id]), [], `${id} 겹침 없음`)
}

// ── 합계: 계획 + 빈 시간 - 겹침 = 1440
{
  for (const id of TEMPLATE_IDS) {
    const s = summarize(TEMPLATES[id], name)
    assert.equal(s.planned, DAY, `${id} 24시간`)
    assert.equal(s.gapMin, 0, `${id} 빈 시간 없음`)
    assert.equal(s.cats.reduce((n, c) => n + c.min, 0), DAY)
    assert.ok(TEMPLATES[id].every((b, i, a) => i === 0 || a[i - 1].start <= b.start), `${id} 시작순`)
    assert.ok(TEMPLATES[id].every((b) => b.start % 10 === 0 && b.end % 10 === 0 && b.key))
  }
  // 중·고등 방학: 수면 8 · 공부 5.5 · 학원 4 · 식사 2.5
  const teen = Object.fromEntries(summarize(TEMPLATES.teen, name).cats.map((c) => [c.name, c.min]))
  assert.deepEqual(teen, { sleep: 480, study: 330, academy: 240, meal: 150, free: 120, exercise: 60, wash: 60 })

  const blocks = [B('23:00', '07:00', '수면'), B('09:00', '12:00', '공부'), B('11:00', '12:30', '공부'), B('13:00', '13:00', '0분')]
  const s = summarize(blocks, name)
  assert.equal(s.planned, 480 + 180 + 90)
  assert.equal(s.overMin, 60)
  assert.equal(s.planned + s.gapMin - s.overMin, DAY)
  assert.deepEqual(s.gaps, [[420, 540], [750, 1380]])
  assert.deepEqual(s.cats, [{ name: '수면', min: 480, color: 0 }, { name: '공부', min: 270, color: 0 }], '같은 이름은 합치고 0분은 뺀다')
  // 자정 양쪽의 빈 시간은 한 구간
  const wrap = summarize([B('01:00', '23:00', 'x')], name)
  assert.deepEqual(wrap.gaps, [[1380, 60]])
  assert.equal(wrap.gapMin, 120)
  const none = summarize([], name)
  assert.equal(none.gapMin, DAY)
  assert.deepEqual(none.gaps, [[0, 0]])
}

// ── 추가·복제
{
  assert.deepEqual(newBlock([]), { start: 540, end: 600, color: 0, key: null, label: '' })
  const b = newBlock([B('00:00', '07:00'), B('07:30', '23:00')])
  assert.equal(b.start, 420)
  assert.equal(b.end, 450, '빈 시간이 30분이면 30분')
  assert.equal(newBlock(TEMPLATES.teen).start, TEMPLATES.teen[TEMPLATES.teen.length - 1].end, '빈 시간이 없으면 마지막 끝에서')
  assert.deepEqual(duplicate(B('22:00', '01:00', 'x')), B('01:00', '04:00', 'x'))
}

// ── URL
{
  assert.equal(toQuery(DEFAULT_PLAN), '', '기본 예시는 쿼리 없음')
  assert.equal(toQuery({ ...DEFAULT_PLAN, blocks: TEMPLATES.teen.map((b) => ({ ...b })) }), '')
  assert.equal(templateOf(DEFAULT_PLAN.blocks), 'teen')
  assert.equal(templateOf(TEMPLATES.worker.map((b) => ({ ...b }))), 'worker')
  assert.equal(templateOf([{ ...TEMPLATES.teen[0], end: 470 }, ...TEMPLATES.teen.slice(1)]), null)
  assert.deepEqual(fromQuery(() => null), DEFAULT_PLAN)
  assert.equal(hasPlanQuery(() => null), false)
  assert.equal(hasPlanQuery(q('t=')), true)

  for (const id of TEMPLATE_IDS) assert.deepEqual(decodeBlocks(encodeBlocks(TEMPLATES[id])), TEMPLATES[id], `${id} 왕복`)
  const custom: Plan = {
    blocks: [
      { ...B('22:00', '07:00', ''), key: 'sleep', color: 0 },
      B('07:00', '07:10', '아침 스트레칭 - 10분', 3),
      B('09:00', '09:00', '', 7),
      B('12:00', '13:00', 'Lunch & 산책', 5),
    ],
    title: '나의 겨울방학 "계획"',
    goal: '매일 책 30쪽 읽기',
  }
  const qs = toQuery(custom)
  assert.deepEqual(fromQuery(q(qs)), custom, '사용자 계획 왕복')
  assert.equal(encodeBlocks([{ ...B('22:00', '07:00'), key: 'sleep' }]), '3o1600', '22:00 = 132칸 = 3o')
  assert.ok(encodeBlocks(TEMPLATES.teen).length < 80, 'p 는 짧게')
  assert.deepEqual(fromQuery(q('t=')), { ...DEFAULT_PLAN, title: '' }, '빈 제목도 유지')
  assert.equal(decodeBlocks(encodeBlocks([B('01:00', '02:00', 'a*b\u0001c')]))![0].label, 'abc', '구분자·제어문자 제거')
  assert.equal(cleanLabel('x'.repeat(40)).length, 20)

  // 틀린 p 는 기본값으로
  for (const bad of ['', 'zz', '3u1600*', '3u16000', '3u169x', '3u168z', '4016-0', '3u16', 'ABCD0-a', Array(MAX_BLOCKS + 1).fill('3u1600').join('*')]) {
    assert.equal(decodeBlocks(bad), null, `틀린 p: ${bad.slice(0, 20)}`)
    assert.deepEqual(fromQuery(q(`p=${encodeURIComponent(bad)}`)).blocks, DEFAULT_PLAN.blocks)
  }
  assert.equal(LABEL_KEYS.length <= 36, true, '키는 36진 한 자리')

  // 저장값
  assert.equal(parseSaved(null), null)
  assert.equal(parseSaved('p=%%%'), null)
  assert.deepEqual(parseSaved(qs), custom)
  assert.deepEqual(parseSaved('t=x'), { ...DEFAULT_PLAN, title: 'x' })
}

// ── 차트·내보내기
{
  const m = chartModel([B('22:00', '07:00', '수면'), B('07:00', '07:40', '씻기'), B('07:40', '09:00', '아침 식사'), B('10:00', '10:00', '0')], name, (b) => `${hhmm(b.start)}~${hhmm(b.end)}`)
  assert.equal(m.length, 3, '0분 칸은 그리지 않음')
  assert.deepEqual(m[0].lines.map((l) => l.text), ['수면', '22:00~07:00'], '긴 칸은 이름 + 시간')
  assert.deepEqual(m[1].lines, [], '40분 칸은 글자 없음')
  assert.deepEqual(m[2].lines.map((l) => l.text), ['아침'], '80분 칸은 두 글자')
  const { svg, height } = exportSvg(m, '<제목> & "따옴표"', '다짐', '비어 있음')
  assert.ok(svg.includes('&#60;제목&#62; &#38; &#34;따옴표&#34;'), '제목 이스케이프')
  assert.ok(!svg.includes('<제목>'))
  assert.ok(svg.includes('다짐') && svg.includes('toolhub.ai.kr') && height > 700)
  assert.ok(exportSvg([], '', '', '비어 있음').svg.includes('비어 있음'))
}

console.log('check-daily-schedule: all passed')
