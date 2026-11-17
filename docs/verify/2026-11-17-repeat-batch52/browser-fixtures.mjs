// Hand-calculated representative cases; no calculator/product imports.
export const percentExamples = [
  { kind: 'of', values: { a: '120', b: '25' }, result: 30, unit: '' },
  { kind: 'ratio', values: { p: '25', w: '200' }, result: 12.5, unit: '%' },
  { kind: 'change', values: { f: '80', t: '100' }, result: 25, unit: '%' },
  { kind: 'discount', values: { dp: '10000', dr: '15' }, result: 8500, unit: '' },
  { kind: 'reverse', values: { rs: '8500', rr: '15' }, result: 10000, unit: '' },
  { kind: 'chain', values: { cp: '10000' }, chain: ['10', '20', '5'], result: 31.6, unit: '%' },
  { kind: 'pp', values: { x: '3.2', y: '4.7' }, result: 1.5, unit: '%p' },
  { kind: 'vat', values: { v: '11000' }, result: 10000, unit: '' },
]

export function percentFixtureUrl(origin, values = {}, options = {}) {
  const url = new URL('/percent-calculator/', origin)
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value)
  if (options.chain) url.searchParams.set('c', options.chain.join(','))
  if (options.decimals !== undefined) url.searchParams.set('d', String(options.decimals))
  if (options.korean) url.searchParams.set('k', '1')
  url.searchParams.append('nativeFixture', 'first'); url.searchParams.append('nativeFixture', 'second'); url.hash = 'native-percent'
  return url.href
}

export async function inspectPercentMemory(page) {
  return page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage }, url: location.href, history: history.state }))
}

export async function installPercentRestorePort(context, hold = false) {
  await context.addInitScript(hold => {
    const microtask = window.queueMicrotask.bind(window)
    window.__percentRestorePending = []; window.__percentRestoreObserved = 0
    window.queueMicrotask = callback => {
      const source = String(callback)
      if (source.includes('URLSearchParams') && source.includes('setChain') && source.includes('setReady')) {
        window.__percentRestoreObserved++
        if (hold) { window.__percentRestorePending.push(callback); return }
      }
      return microtask(callback)
    }
    window.__releasePercentRestore = () => { const callbacks = window.__percentRestorePending.splice(0); callbacks.forEach(callback => callback()) }
  }, hold)
}
