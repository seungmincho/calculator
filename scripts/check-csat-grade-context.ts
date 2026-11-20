// node scripts/check-csat-grade-context.ts — actual component SSR + unchanged scoring data.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { build } from 'esbuild'
import { CUTS, CUT_YEAR, CSAT_YEAR, csatToday, daysUntil, estimate, gradeOf, bestSum, gradeAverages } from '../src/utils/csatGrade.ts'

type Dict = { [key: string]: unknown }
type Share = { card: { label: string; sub: string; headline: string; rows: { label: string; value: string }[] }; text: string }
const require = createRequire(import.meta.url)
const patch = JSON.parse(readFileSync('docs/verify/2026-11-17-repeat-batch15/translations-grade.json', 'utf8')) as Record<string, { csatGrade: Dict }>
const goalPatch = JSON.parse(readFileSync('docs/verify/2026-11-17-repeat-batch17/translations-csat-goals.json', 'utf8')) as Record<string, { csatGrade: Dict }>
const merge = (a: Dict, b: Dict): Dict => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(key => {
  const value = b[key]
  return [key, value && typeof value === 'object' && !Array.isArray(value) ? merge((a[key] ?? {}) as Dict, value as Dict) : value ?? a[key]]
}))
const valueAt = (root: Dict, key: string): unknown => key.split('.').reduce<unknown>((value, part) => (value as Dict)?.[part], root)
const flatten = (value: unknown, prefix = ''): string[] => !value || typeof value !== 'object' || Array.isArray(value)
  ? [prefix] : Object.entries(value).flatMap(([key, val]) => flatten(val, prefix ? `${prefix}.${key}` : key))
let checks = 0
const check = (name: string, run: () => void) => { run(); checks++; console.log(`PASS ${name}`) }

check('all existing cutoff, standard-score and percentile numbers remain unchanged', () => {
  assert.equal(createHash('sha256').update(JSON.stringify(CUTS)).digest('hex'), '137d11fd379ac5627f9a789f2b088ecdeab84145593ce5de224bbfafeff5bcd5')
  assert.equal(CSAT_YEAR, 2027); assert.equal(CUT_YEAR, 2026)
})
check('KST midnight, exam day and the end of the year are independent of host timezone', () => {
  assert.equal(csatToday(new Date('2026-11-18T14:59:59.999Z')), '2026-11-18')
  assert.equal(csatToday(new Date('2026-11-18T15:00:00.000Z')), '2026-11-19')
  assert.equal(daysUntil(csatToday(new Date('2026-11-18T15:00:00.000Z'))), 0)
  assert.equal(csatToday(new Date('2026-12-31T15:00:00.000Z')), '2027-01-01')
})
check('absolute grading boundaries and absent standard-score estimates stay distinct', () => {
  for (const [key, step, first] of [['english', 10, 90], ['koreanHistory', 5, 40]] as const) {
    for (let grade = 1; grade <= 8; grade++) {
      const threshold = first - (grade - 1) * step
      assert.equal(gradeOf(key, threshold), grade)
      assert.equal(gradeOf(key, threshold - 1), grade + 1)
      assert.equal(estimate(key, threshold), null)
    }
  }
})
check('average and minimum-sum Inquiry assumptions remain different', () => {
  const grades = { kor: 3, math: 4, eng: 2, hist: 9, inq1: 1, inq2: 7 }
  assert.equal(gradeAverages(grades).all, 3.25)
  assert.equal(bestSum(grades, 3), 6)
  assert.deepEqual(gradeAverages({ ...grades, hist: 1 }), gradeAverages(grades))
  assert.equal(bestSum({ ...grades, hist: 1 }, 3), 6)
})
check('Korean and English patches have identical keys and variable sets', () => {
  assert.deepEqual(flatten(patch.ko.csatGrade).sort(), flatten(patch.en.csatGrade).sort())
  for (const key of flatten(patch.ko.csatGrade)) {
    const tokens = (value: unknown) => [...JSON.stringify(value).matchAll(/\{([A-Za-z]+)\}/g)].map(match => match[1]).sort()
    assert.deepEqual(tokens(valueAt(patch.ko.csatGrade, key)), tokens(valueAt(patch.en.csatGrade, key)), key)
  }
})

const built = await build({ entryPoints: ['src/components/CsatGrade.tsx'], bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react/jsx-runtime', '@/lib/i18n', '@/lib/i18n/ns/csatGrade', '@/hooks/useSearchParams', '@/hooks/useHydrated', '@/components/ShareResult', '@/components/CsatScoreRecords'] })
function render(language: 'ko' | 'en', query = '', table?: string, hydrated = false) {
  const original = JSON.parse(readFileSync(`messages/${language}.json`, 'utf8')).csatGrade as Dict
  const messages = merge(merge(original, patch[language].csatGrade), goalPatch[language].csatGrade)
  const t = Object.assign((key: string, vars?: Dict) => {
    const value = valueAt(messages, key)
    assert.equal(typeof value, 'string', `translation ${language}:${key}`)
    return (value as string).replace(/\{([A-Za-z]+)\}/g, (_, token: string) => {
      assert.ok(vars && token in vars, `missing argument ${key}:${token}`)
      return String(vars[token])
    })
  }, { raw: (key: string) => { const value = valueAt(messages, key); assert.ok(Array.isArray(value), `array ${key}`); return value } })
  const shares: Share[] = []
  const loaded = { exports: {} as { default?: React.ComponentType } }
  const context = vm.createContext({ module: loaded, exports: loaded.exports, URL, URLSearchParams, console,
    require(name: string) {
      if (name === 'react') return { ...React, useState(initial: unknown) {
        const state = React.useState(initial)
        return table && initial === 'korLm' ? [table, state[1]] : state
      } }
      if (name === '@/lib/i18n') return { useTranslations: () => t }
      if (name === '@/lib/i18n/ns/csatGrade') return {}
      if (name === '@/hooks/useSearchParams') return { useSearchParams: () => new URLSearchParams(query) }
      if (name === '@/hooks/useHydrated') return { useHydrated: () => hydrated }
      if (name === '@/components/CsatScoreRecords') return { __esModule: true, default: () => null }
      if (name === '@/components/ShareResult') return { __esModule: true, default: (props: Share) => { shares.push(props); return null } }
      return require(name)
    },
  })
  vm.runInContext(built.outputFiles[0].text, context)
  assert.ok(loaded.exports.default)
  const html = renderToStaticMarkup(React.createElement(loaded.exports.default)).replaceAll('&#x27;', "'").replaceAll('&amp;', '&')
  assert.equal(shares.length, 1)
  return { html, share: shares[0], t }
}
for (const language of ['ko', 'en'] as const) {
  check(`${language}: static first render explains both years and calculation limits`, () => {
    const { html, t } = render(language)
    assert.ok(html.includes('id="csat-grade-context"'))
    // 기본 = 2027 가채점 예상(종로학원 추정), 출처 링크 포함
    assert.ok(html.includes(t('est.relative', { year: 2027, agency: '종로학원', checked: '2026-11-20 09:03' })))
    assert.ok(html.includes(t('context.interpolation', { year: 2027 })))
    assert.ok(html.includes(t('context.minimumLimit', { year: 2027 })))
    assert.ok(html.includes('b.jongro.co.kr/exam/ex261119/go3_cut.asp'))
    assert.ok(html.includes('aria-pressed="true"'))
    assert.ok(html.includes('boardSeq=105756'))
    assert.ok(!html.includes('{year}'))
    assert.ok(!html.includes('확정 등급컷'))
    assert.ok(!html.includes('confirmed cutoffs'))
  })
  check(`${language}: image and share text retain year, estimate and absolute-grading qualifiers`, () => {
    const { share, t } = render(language, 'kor=85&math=87&eng=90&hist=40&inq1=44&inq2=41', undefined, true)
    assert.equal(share.card.label, t('est.referenceLabel', { year: 2027 }))
    assert.equal(share.card.sub, t('context.shareScope', { year: 2027 }))
    assert.ok(share.text.includes('2027'))
    // cut=2026 공유 링크는 2026 참고 표로 복원
    const old = render(language, 'kor=85&math=87&eng=90&hist=40&inq1=44&inq2=41&cut=2026', undefined, true)
    assert.equal(old.share.card.label, t('context.referenceLabel', { year: 2026 }))
    assert.ok(old.share.text.includes('2026')); assert.ok(old.share.text.includes('2027'))
    assert.ok(share.card.rows[0].value.includes(t('context.estimatedShort')))
    assert.ok(share.card.rows[1].value.includes(t('context.estimatedShort')))
    assert.ok(share.card.rows[2].value.includes(t('context.absoluteShort')))
    assert.ok(share.card.rows[3].value.includes(t('context.absoluteShort')))
    assert.ok(share.card.rows[4].value.toLowerCase().includes(t('context.estimatedShort').toLowerCase()))
  })
  check(`${language}: table captions distinguish estimated raw cutoffs and absolute boundaries`, () => {
    const relative = render(language)
    assert.ok(relative.html.includes(`<caption class="text-left text-sm font-medium text-body pb-3">${relative.t('context.relativeCaption', { year: 2027 })}</caption>`))
    const absolute = render(language, '', 'english')
    const table = absolute.html.slice(absolute.html.indexOf('<table'), absolute.html.indexOf('</table>'))
    assert.ok(table.includes(absolute.t('context.absoluteCaption', { year: 2027 })))
    assert.ok(table.includes(absolute.t('context.absoluteCut')))
    assert.ok(!table.includes(absolute.t('u.stdAtCut')))
    assert.ok(!table.includes(absolute.t('u.cumTop')))
  })
}
check('legacy and current queries restore their selected scores after hydration', () => {
  assert.ok(render('ko', 'subject=mathCalc&score=98', undefined, true).html.includes('id="csat-math" type="number" inputMode="numeric" min="0" max="100" class="ui-field min-h-11 px-3 py-2 w-20 text-base text-right tabular-nums" value="98"'))
  assert.ok(render('ko', 'kor=96&korSel=hj&inq1Type=earth2&inq1=49&minN=2&minSum=4', undefined, true).html.includes('value="96"'))
})
check('server and first hydration HTML match even with non-default or legacy shared queries', () => {
  const initial = render('ko').html
  for (const query of ['kor=90&math=85&eng=89&hist=39&inq1=46&inq2=42&korSel=hj&mathSel=calc&inq1Type=earth1&inq2Type=bio1&minN=4&minSum=6', 'subject=english&score=90']) {
    assert.equal(render('ko', query).html, initial)
    assert.notEqual(render('ko', query, undefined, true).html, initial)
  }
})
check('explicit blank shared inputs remain distinct from missing parameters and zero', () => {
  const blank = render('ko', 'kor=&eng=0', undefined, true).html
  assert.match(blank, /id="csat-kor"[^>]*value=""/)
  assert.match(blank, /id="csat-eng"[^>]*value="0"/)
  assert.match(render('ko', '', undefined, true).html, /id="csat-kor"[^>]*value="84"/)
  assert.match(render('ko', 'subject=english&score=', undefined, true).html, /id="csat-eng"[^>]*value=""/)
})
console.log(`CSAT grade context checks: ${checks} passed`)
