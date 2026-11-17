import assert from 'node:assert/strict'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const flush = () => new Promise(resolve => setImmediate(resolve))
async function fixture() {
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')), copies = [], fallback = [], microtasks = []
  let port = async () => {}, selected
  class Field { value = ''; style = {}; isConnected = true; focus() {} select() {} setSelectionRange() {} remove() {} }
  const document = { activeElement: new Field(), body: { appendChild() {} }, createElement(tag) { assert.equal(tag, 'textarea'); selected = new Field(); return selected }, execCommand() { fallback.push(selected.value); return true } }
  const navigator = { clipboard: { writeText(text) { copies.push(text); return port(text) } } }
  const translate = namespace => (key, values = {}) => {
    const value = key.split('.').reduce((item, part) => item?.[part], messages[namespace]); assert.equal(typeof value, 'string')
    return value.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`))
  }
  const base = { messages, navigator, document, globals: { HTMLElement: Field, queueMicrotask: callback => microtasks.push(callback) }, url: 'https://toolhub.ai.kr/aspect-ratio/' }
  const parent = await componentHarness('src/components/AspectRatio.tsx', { ...base, modules: {
    '@/components/AspectRatioImagePanel': { __esModule: true, default: 'ImagePanel' },
    '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' },
    '@/contexts/LanguageContext': { useOptionalLanguage: () => ({ language: 'ko' }) },
  } })
  parent.render(); for (const callback of microtasks.splice(0)) callback(); parent.render()
  const props = () => parent.find(node => node.type === 'ShareResult').props
  const share = await componentHarness('src/components/ShareResult.tsx', { ...base, props: props(), modules: { '@/lib/i18n/shared': { useTranslations: translate }, '@/utils/shareCard': { renderShareCard: async () => new Blob(['unused']) } } })
  share.render()
  const sync = () => { parent.render(); share.setProps(props()) }
  return { parent, share, copies, fallback, port(next) { port = next },
    own() { parent.find(node => node.props['data-aspect-copy'] === 'size').props.onClick(); sync() },
    link() { parent.all().find(node => Object.hasOwn(node.props, 'data-aspect-share-boundary'))?.props.onClickCapture(); share.find(node => node.props['data-share-action'] === 'copy').props.onClick(); sync() },
    async settle() { await flush(); sync() }, cleanup() { share.cleanup(); parent.cleanup() },
  }
}
const observations = []
for (const order of ['own-link', 'link-own']) {
  const f = await fixture(), pending = deferred()
  f.port(() => pending.promise)
  if (order === 'own-link') f.own(); else f.link()
  f.port(async () => {})
  if (order === 'own-link') f.link(); else f.own()
  await f.settle(); pending.reject(new Error('older native refusal')); await f.settle()
  assert.deepEqual(f.copies, order === 'own-link' ? ['1920×1080', 'https://toolhub.ai.kr/aspect-ratio/'] : ['https://toolhub.ai.kr/aspect-ratio/', '1920×1080'])
  observations.push({ order, fallback: [...f.fallback], copies: [...f.copies] }); f.cleanup()
}
const report = { sourceSha256: crypto.createHash('sha256').update(fs.readFileSync('src/components/AspectRatio.tsx')).digest('hex'), observations }
if (process.argv.includes('--record')) {
  fs.writeFileSync('docs/verify/2026-11-17-repeat-batch37/share-ownership-observed.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} else {
  for (const item of observations) assert.deepEqual(item.fallback, [], item.order)
  console.log('PASS 2 independent actual AspectRatio/ShareResult directions: stale native rejection never invokes legacy copy')
}
