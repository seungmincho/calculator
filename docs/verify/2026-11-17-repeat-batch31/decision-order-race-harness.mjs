import fs from 'node:fs'
import { componentHarness } from '../2026-11-17-repeat-batch29/team-parent-harness.mjs'

const content = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(content).join(' ') : content(node.props?.children)
const descendants = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(descendants) : [node, ...descendants(node.props?.children)]

/** Actual parent, deterministic RNG and captured native timers. Never opens a browser. */
export async function decisionOrderRaceHarness(options = {}) {
  const messages = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8'))
  const patch = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch31/translations-decision-order.json', 'utf8')).ko.decisionTools
  messages.decisionTools = { ...messages.decisionTools, order: { ...messages.decisionTools.order, ...patch.order }, resultActions: patch.resultActions }
  const jobs = [], labels = messages.decisionTools.order, focuses = []
  let draws = 0, sequence = 0
  const schedule = (callback, delay, interval = false) => {
    const job = { id: ++sequence, callback, delay, active: true, interval }
    jobs.push(job); return job.id
  }
  const cancel = id => { const job = jobs.find(item => item.id === id); if (job) job.active = false }
  const h = await componentHarness('src/components/DecisionTools.tsx', {
    props: { initialTab: 'order', single: true, ...options.props }, messages, url: options.url,
    storage: options.storage, storagePort: options.storagePort, navigator: options.navigator, document: options.document,
    beforeEffects(tree) {
      for (const node of descendants(tree)) {
        if (node.type === 'button' && node.props.ref) {
          const id = Object.keys(node.props).find(key => key.startsWith('data-')) ?? node.props['aria-label'] ?? content(node)
          node.props.ref.current = { disabled: !!node.props.disabled, isConnected: true, focus() { focuses.push(id) } }
        }
      }
    },
    globals: {
      setTimeout: (callback, delay) => schedule(callback, delay), clearTimeout: cancel,
      setInterval: (callback, delay) => schedule(callback, delay, true), clearInterval: cancel,
      requestAnimationFrame: callback => schedule(callback, 16), cancelAnimationFrame: cancel,
      AbortController, DOMException,
      ...options.globals,
    },
    modules: {
      '@/utils/password': { shuffle(items) { draws++; return [...items].reverse() } },
      '@/components/MealHistoryPanel': { __esModule: true, default: 'MealHistoryPanel' },
      '@/components/MealPlanPanel': { __esModule: true, default: 'MealPlanPanel' },
      '@/components/MobileResultLink': { __esModule: true, default: 'MobileResultLink' },
    },
  })
  const settle = async () => { for (let count = 0; count < 8; count++) { await Promise.resolve(); h.render() } }
  h.render(); await settle()
  const pending = delay => jobs.filter(job => job.active && job.delay === delay)
  const fire = async (job, argument) => {
    if (!job) throw new Error('Missing expected native timer')
    if (!job.interval) job.active = false
    job.callback(argument); await settle()
  }
  const button = (key, data) => h.all().find(node => node.type === 'button' && (data && Object.hasOwn(node.props, data) || content(node).includes(labels[key]) || node.props['aria-label'] === labels[key]))
  const draw = () => { const target = button('draw', 'data-order-draw'); if (!target) throw new Error('Missing draw button'); const promise = target.props.onClick(); h.render(); return promise }
  const revealAll = () => { const target = button('revealAll', 'data-order-reveal-all'); if (!target) throw new Error('Missing reveal-all button'); target.props.onClick(); h.render() }
  const reset = () => { const target = button('reset', 'data-order-reset'); if (!target) throw new Error('Missing reset button'); target.props.onClick(); h.render() }
  const visible = () => {
    // New parent selectors can use the same race fixture; legacy cards expose only their rendered name spans.
    const result = h.all().find(node => Object.hasOwn(node.props, 'data-order-revealed-count'))
    if (result) return Number(result.props['data-order-revealed-count'])
    const grid = h.all().find(node => node.type === 'div' && node.props['aria-live'] === 'polite' && node.props.className?.includes('grid'))
    return grid ? descendants(grid).filter(node => node.type === 'span' && node.props.className?.includes('text-base font-bold')).length : 0
  }
  const canCopy = () => !!button('copyResult', 'data-order-copy')
  const english = () => {
    const source = JSON.parse(fs.readFileSync('messages/en.json', 'utf8'))
    const extra = JSON.parse(fs.readFileSync('docs/verify/2026-11-17-repeat-batch31/translations-decision-order.json', 'utf8')).en.decisionTools
    messages.decisionTools = { ...source.decisionTools, order: { ...source.decisionTools.order, ...extra.order }, resultActions: extra.resultActions }; h.render()
  }
  return { h, jobs, pending, fire, settle, draw, revealAll, reset, visible, canCopy, focuses, english, draws: () => draws }
}
