import assert from 'node:assert/strict'
import fs from 'node:fs'
import harness from '../2026-11-17-repeat-batch19/component-harness.cjs'

const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')).shareResult
const after = process.argv.includes('--after')
const initial = { card: { tool: '합성 도구', label: '조건 A', headline: '100원', rows: [{ label: '수량', value: '1' }] }, text: '처음 결과', fileName: 'synthetic-result' }
const changed = { ...initial, card: { ...initial.card, headline: '200원' }, text: '바뀐 결과' }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
async function fixture() {
  const image = deferred(), clipboard = deferred(), clicks = [], shares = [], legacy = [], urls = [], releases = []
  class TestURL extends URL {
    static createObjectURL(blob) { const url = `blob:synthetic-${urls.length}`; urls.push({ blob, url }); return url }
    static revokeObjectURL(url) { releases.push(url) }
  }
  const h = await harness.componentHarness('src/components/ShareResult.tsx', {
    props: structuredClone(initial), url: 'https://toolhub.ai.kr/synthetic/?value=100',
    modules: {
      '@/lib/i18n/shared': { useTranslations: () => key => messages[key] ?? key },
      '@/utils/shareCard': { renderShareCard: () => image.promise },
    },
    globals: { URL: TestURL, File },
    navigator: { clipboard: { writeText: () => clipboard.promise }, canShare: () => false, share: async data => { shares.push(data) } },
    document: {
      body: { appendChild() {}, removeChild() {} },
      createElement(tag) { return { tag, style: {}, value: '', select() {}, setSelectionRange() {}, focus() {}, remove() {}, click() { clicks.push({ href: this.href, download: this.download }) } } },
      execCommand(command) { legacy.push(command); return true },
    },
  })
  h.render()
  return { h, image, clipboard, clicks, shares, legacy, urls, releases }
}

const results = []
{
  const f = await fixture()
  const pending = f.h.button(messages.save).props.onClick()
  f.h.setProps(changed)
  f.image.resolve(new Blob(['synthetic-png'], { type: 'image/png' })); await pending; await flush()
  assert.equal(f.clicks.length, after ? 0 : 1)
  results.push({ flow: 'save -> result edit -> old render completes', downloads: f.clicks.length })
  f.h.cleanup()
}
{
  const f = await fixture()
  const pending = f.h.button(messages.save).props.onClick()
  f.h.cleanup()
  f.image.resolve(new Blob(['synthetic-png'], { type: 'image/png' })); await pending; await flush()
  assert.equal(f.clicks.length, after ? 0 : 1)
  results.push({ flow: 'save -> unmount -> old render completes', downloads: f.clicks.length })
}
{
  const f = await fixture()
  const pending = f.h.button(messages.share).props.onClick()
  f.h.window.history.replaceState(null, '', '?value=200'); f.h.setProps(changed)
  f.image.resolve(new Blob(['synthetic-png'], { type: 'image/png' })); await pending; await flush()
  assert.equal(f.shares.length, after ? 0 : 1)
  if (!after) { assert.equal(f.shares[0].text, '처음 결과'); assert.equal(new URL(f.shares[0].url).searchParams.get('value'), '200') }
  results.push({ flow: 'share -> edit result and URL -> old render completes', shares: f.shares.length, mixedOldTextNewUrl: !after })
  f.h.cleanup()
}
{
  const f = await fixture()
  const pending = f.h.button(messages.copyLink).props.onClick()
  f.h.setProps(changed)
  f.clipboard.reject(new Error('Synthetic permission refusal')); await pending; await flush()
  assert.equal(f.legacy.length, after ? 0 : 1)
  results.push({ flow: 'copy -> result edit -> old permission failure', automaticFallbacks: f.legacy.length })
  f.h.cleanup()
}
console.log(JSON.stringify({ mode: after ? 'same-flow regression after change' : 'existing defects reproduced; product unchanged', checks: results }, null, 2))
