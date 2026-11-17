import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'
import * as review from '../../../src/utils/typingReview.ts'

export async function fixture(snapshot, { active = true, locale = 'ko' } = {}) {
  const translations = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch54/translations-typing-review.json', 'utf8'))
  const messages = structuredClone(translations[locale]), timers = [], io = { now: 1000, focuses: 0, focusThrows: false, reads: 0, writes: 0 }
  let serial = 0, props = { snapshot, active }
  const storage = { getItem() { io.reads++; return null }, setItem() { io.writes++ }, removeItem() { io.writes++ } }
  const h = await componentHarness('src/components/TypingMistakePractice.tsx', { props, messages, storagePort: storage, modules: { '@/utils/typingReview': review },
    globals: { performance: { now: () => io.now }, setInterval(callback, ms) { const timer = { id: ++serial, callback, ms, active: true }; timers.push(timer); return timer.id }, clearInterval(id) { const timer = timers.find(item => item.id === id); if (timer) timer.active = false } },
    beforeEffects(tree) {
      const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (!node || typeof node !== 'object') return; if (node.type === 'textarea' && node.props.ref) node.props.ref.current = { focus() { io.focuses++; if (io.focusThrows) throw Error('focus') } }; walk(node.props?.children) }; walk(tree)
    },
  }); h.render()
  const attr = (name, value = '') => h.find(node => node.props['data-typing-review-' + name] === value)
  const click = name => { const button = attr(name); if (button.props.disabled) throw Error(`Disabled ${name}`); button.props.onClick(); h.render() }
  const select = index => { h.find(node => node.type === 'input' && node.props.value === props.snapshot.fragments[index].id).props.onChange({ target: { checked: true } }); h.render() }
  return { h, io, timers, attr, click, select, translations,
    type(value, nativeComposing = false) { attr('input').props.onChange({ target: { value }, nativeEvent: { isComposing: nativeComposing } }); h.render() },
    end(value) { attr('input').props.onCompositionEnd({ currentTarget: { value } }); h.render() },
    advance(ms) { io.now += ms; timers.filter(timer => timer.active).forEach(timer => timer.callback()); h.render() },
    setProps(next) { props = { ...props, ...next }; h.setProps(props) },
    locale(next) { Object.assign(messages, structuredClone(translations[next])); h.render() },
    cleanup() { h.cleanup() },
  }
}
