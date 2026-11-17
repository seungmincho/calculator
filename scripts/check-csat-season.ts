import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CSAT_GUIDANCE_CHECKED, CSAT_GUIDANCE_URL, INQ_DETAIL, PRACTICE_TIMERS, SCHEDULE, SHEET,
  cleanAnswer, countdown, kstToMs, progress, slotAt, toMin, TIMELINE,
} from '../src/utils/csatDday.ts'
import { parseQuery } from '../src/utils/timer.ts'

let count = 0
const check = (name: string, run: () => void) => { run(); count++; console.log(`PASS ${name}`) }

check('standard-candidate schedule matches the 2027 official timetable', () => {
  assert.deepEqual(SCHEDULE.map(slot => [slot.key, slot.start, slot.end ?? null]), [
    ['arrive', '08:10', null], ['kor', '08:40', '10:00'], ['math', '10:30', '12:10'],
    ['lunch', '12:10', '13:00'], ['eng', '13:10', '14:20'], ['inq', '14:50', '16:37'], ['lang2', '17:05', '17:45'],
  ])
})

check('period 4 keeps collection separate and both inquiry slots at 30 minutes', () => {
  assert.deepEqual(INQ_DETAIL.map(slot => [slot.key, slot.start, slot.end]), [
    ['hist', '14:50', '15:20'], ['swap', '15:20', '15:35'], ['inq1', '15:35', '16:05'],
    ['collect', '16:05', '16:07'], ['inq2', '16:07', '16:37'],
  ])
  assert.deepEqual(slotAt(toMin('16:05'), INQ_DETAIL), { type: 'now', idx: 3, left: 2 })
  assert.deepEqual(slotAt(toMin('16:07'), INQ_DETAIL), { type: 'now', idx: 4, left: 30 })
})

check('six explicit practice links restore only their official subject duration', () => {
  assert.deepEqual(PRACTICE_TIMERS.map(item => [item.key, item.minutes]), [['kor', 80], ['math', 100], ['eng', 70], ['hist', 30], ['inq1', 30], ['lang2', 40]])
  for (const preset of PRACTICE_TIMERS) {
    const url = new URL(preset.href, 'https://toolhub.ai.kr')
    assert.equal(url.pathname, '/timer/')
    assert.deepEqual([...url.searchParams.keys()], ['m'], 'no autoplay or unrelated timer parameter')
    assert.deepEqual(parseQuery(url.search), { sec: preset.minutes * 60, mode: 'timer' })
  }
})

check('D-2 and exam-day boundaries stay KST-based', () => {
  assert.equal(countdown(kstToMs('2026-11-17', '00:00')).dday, 2)
  assert.equal(countdown(kstToMs('2026-11-17', '23:59')).dday, 2)
  assert.deepEqual([countdown(kstToMs('2026-11-19', '08:10')).dday, countdown(kstToMs('2026-11-19', '08:10')).phase], [0, 'before'])
  assert.equal(countdown(kstToMs('2026-11-19', '08:40')).phase, 'during')
  assert.equal(countdown(kstToMs('2026-11-19', '17:45')).phase, 'after')
})

check('answer counts, answer cleaning, and old checklist keys remain compatible', () => {
  assert.deepEqual(SHEET.map(item => item.count), [45, 30, 45, 20, 20, 20, 30])
  assert.equal(cleanAnswer('math', 16, '012'), '012')
  assert.equal(cleanAnswer('math', 29, '9876'), '987')
  assert.equal(cleanAnswer('kor', 1, '3'), '3')
  assert.equal(cleanAnswer('eng', 1, '9'), '')
  const saved = JSON.parse('{"admitCard":true,"idCard":true,"watch":false}')
  assert.deepEqual(progress(saved, ['admitCard', 'idCard', 'watch', 'signPen', 'correctionTape']), { done: 2, total: 5 })
})

check('ICS source dates stay unchanged when additional-offer labels become precise', () => {
  assert.deepEqual(TIMELINE.map(item => [item.key, item.start, item.end ?? null]), [
    ['exam', '2026-11-19', null], ['score', '2026-12-11', null], ['susiResult', '2026-12-18', null],
    ['susiReg', '2026-12-21', '2026-12-23'], ['susiExtra', '2026-12-24', '2026-12-29'],
    ['jeongsiApply', '2027-01-04', '2027-01-07'], ['jeongsiResult', '2027-02-05', null],
    ['jeongsiReg', '2027-02-10', '2027-02-12'], ['jeongsiExtra', '2027-02-13', '2027-02-17'], ['addRecruit', '2027-02-19', '2027-02-26'],
  ])
})

check('official guidance has a concrete checked date and a direct announcement URL', () => {
  assert.equal(CSAT_GUIDANCE_CHECKED, '2026-11-17')
  const url = new URL(CSAT_GUIDANCE_URL)
  assert.equal(url.hostname, 'www.moe.go.kr')
  assert.equal(url.searchParams.get('boardSeq'), '107599')
})

check('both languages supply practice/period-4 notes and official source links', () => {
  const patch = JSON.parse(readFileSync(new URL('../docs/verify/2026-11-17-repeat-batch15/translations-dday.json', import.meta.url), 'utf8'))
  for (const locale of ['ko', 'en']) {
    const content = patch[locale].csatDday
    assert.equal(content.schedule.inqRules.length, 3)
    assert.equal(typeof content.schedule.inqSingle, 'string')
    assert.equal(typeof content.sheet.printScope, 'string')
    for (const preset of PRACTICE_TIMERS) assert.equal(typeof content.practice.subjects[preset.key], 'string')
    assert.ok(content.guide.sources.note.includes('{date}'))
    assert.ok(content.guide.sources.items.some((item: { url: string }) => item.url === CSAT_GUIDANCE_URL))
    assert.ok(content.guide.sources.items.every((item: { url: string }) => /^https:\/\/(www\.)?(moe\.go\.kr|korea\.kr|pen\.go\.kr|kcue\.or\.kr)\//.test(item.url)))
  }
})

console.log(`${count} CSAT season guidance/timer regression checks passed`)
