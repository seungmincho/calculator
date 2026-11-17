import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const results = [], messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
async function fixture() {
  const io = { failed: false, copied: [], legacy: 0 }
  const h = await componentHarness('src/components/ColorConverter.tsx', { messages,
    navigator: { clipboard: { async writeText(text) { io.copied.push(text); if (io.failed) throw new Error('denied') } } },
    document: { body: { appendChild() {}, removeChild() {} }, createElement() { return { value: '', select() {} } }, execCommand() { io.legacy++; return false } },
  }); h.render()
  return { h, io, input() { return h.find(node => node.type === 'input' && node.props.type === 'text') }, change(value) { this.input().props.onChange({ target: { value } }); h.render() },
    copy() { h.find(node => node.type === 'button' && node.props.children?.type === 'icon:Copy').props.onClick(); h.render() },
    ranges: () => h.all().filter(node => node.type === 'input' && node.props.type === 'range').length,
    checks: () => h.all().filter(node => node.type === 'icon:Check').length,
    async settle() { await new Promise(resolve => setImmediate(resolve)); h.render() },
  }
}
{
  const f = await fixture(); assert.equal(f.ranges(), 6); f.copy(); await f.settle(); assert.equal(f.io.copied[0], '#3B82F6'); assert.equal(f.checks(), 1)
  results.push({ scenario: 'valid six-digit default', sliders: 6, copied: f.io.copied[0] }); f.h.cleanup()
}
{
  const f = await fixture(); f.change('#abc'); assert.equal(f.ranges(), 0)
  assert.equal(f.h.find(node => node.type === 'input' && node.props.type === 'color').props.value, '#abc')
  assert.equal(f.h.find(node => node.props.style?.backgroundColor === '#abc').props.style.backgroundColor, '#abc')
  results.push({ scenario: 'valid CSS shorthand has no conversion results or sliders', draft: '#abc', sliders: 0, pickerReceivesRawShorthand: true }); f.h.cleanup()
}
{
  const f = await fixture(); f.change('#ab'); assert.equal(f.ranges(), 0); assert.equal(f.input().props.value, '#ab')
  assert.equal(f.h.find(node => node.type === 'input' && node.props.type === 'color').props.value, '#ab')
  results.push({ scenario: 'incomplete draft removes last valid results and feeds raw invalid picker value', draft: '#ab', sliders: 0 }); f.h.cleanup()
}
{
  const f = await fixture(); f.io.failed = true; f.copy(); await f.settle(); assert.equal(f.io.legacy, 1); assert.equal(f.checks(), 1)
  results.push({ scenario: 'native rejection and false legacy copy still show copied icon', legacyFalse: 1, copiedIcons: 1 }); f.h.cleanup()
}
const report = { actualParent: true, controlledIO: true, nativeBrowser: false, sourceSha256: createHash('sha256').update(fs.readFileSync('src/components/ColorConverter.tsx')).digest('hex'), results }
if (process.argv.includes('--record')) {
  const target = 'docs/verify/2026-11-17-repeat-batch53/before-fix.json'
  if (fs.existsSync(target)) throw new Error('Preserve the original baseline')
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify(report))
