// Browser-free harness for the actual changed React components. No external network or browser.
const vm = require('node:vm')
const esbuild = require('esbuild')

const equalDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children)

function eventTarget() {
  const listeners = new Map()
  return {
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback) },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback) },
    dispatch(name, event = {}) { listeners.get(name)?.forEach(callback => callback(event)) },
  }
}

async function componentHarness(entry, setup = {}) {
  const externals = ['react', 'react/jsx-runtime', '@/lib/i18n', '@/hooks/useSearchParams', '@/hooks/useHydrated', 'lucide-react', 'next/link']
  const built = await esbuild.build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', external: [...externals, '@/lib/i18n/ns/*'] })
  const hooks = [], effects = new Map(), timers = new Map()
  let cursor = 0, dirty = false, tree, timerSequence = 0, hydrated = setup.hydrated ?? true
  const react = {
    useState(initial) {
      const index = cursor++
      if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial }
      return [hooks[index].value, next => { const value = typeof next === 'function' ? next(hooks[index].value) : next; if (!Object.is(value, hooks[index].value)) { hooks[index].value = value; dirty = true } }]
    },
    useRef(initial) { const index = cursor++; if (!hooks[index]) hooks[index] = { current: initial }; return hooks[index] },
    useMemo(factory, deps) { const index = cursor++; if (!hooks[index] || !equalDeps(hooks[index].deps, deps)) hooks[index] = { value: factory(), deps }; return hooks[index].value },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps) },
    useEffect(effect, deps) { const index = cursor++; if (!hooks[index]) hooks[index] = { deps: undefined, cleanup: undefined }; effects.set(index, { effect, deps }) },
  }
  const translation = (key, vars) => key + (vars ? JSON.stringify(vars) : '')
  translation.raw = key => setup.rawTranslations?.[key] ?? []
  const jsx = (type, props) => ({ type, props })
  let location = new URL(setup.url ?? 'https://toolhub.ai.kr/')
  const win = { ...eventTarget(), get location() { return location }, ...(setup.window ?? {}) }
  win.history = { state: null, replaceState(_state, _title, url) { location = new URL(url, location) } }
  const stored = new Map(Object.entries(setup.storage ?? {}))
  const storage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) }
  const document = { ...eventTarget(), visibilityState: 'visible', ...(setup.document ?? {}) }
  const module = { exports: {} }
  const context = vm.createContext({ module, exports: module.exports, console, TextEncoder, TextDecoder, URL, URLSearchParams, Blob, structuredClone,
    window: win, navigator: setup.navigator ?? { userAgent: 'Windows' }, document, localStorage: storage, sessionStorage: storage,
    setTimeout(callback, delay) { const id = ++timerSequence; timers.set(id, { callback, delay, interval: false }); return id },
    clearTimeout(id) { timers.delete(id) },
    setInterval(callback, delay) { const id = ++timerSequence; timers.set(id, { callback, delay, interval: true }); return id },
    clearInterval(id) { timers.delete(id) }, queueMicrotask,
    ...setup.globals,
    require(name) {
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' }
      if (name === '@/lib/i18n') return { useTranslations: () => translation }
      if (name.startsWith('@/lib/i18n/ns/')) return {}
      if (name === '@/hooks/useSearchParams') return { useSearchParams: () => new URLSearchParams(location.search) }
      if (name === '@/hooks/useHydrated') return { useHydrated: () => hydrated }
      if (name === 'lucide-react') return new Proxy({}, { get: (_target, key) => `icon:${String(key)}` })
      if (name === 'next/link') return { default: 'a' }
      return require(name)
    },
  })
  vm.runInContext(built.outputFiles[0].text, context)
  const render = () => {
    for (let iteration = 0; iteration < 40; iteration++) {
      dirty = false; cursor = 0; effects.clear(); tree = module.exports.default(setup.props)
      if (dirty) continue // React discards effects from a render-phase update.
      for (const [index, pending] of effects) {
        if (!equalDeps(hooks[index].deps, pending.deps)) {
          hooks[index].cleanup?.(); hooks[index].deps = pending.deps; hooks[index].cleanup = pending.effect()
        }
      }
      if (!dirty) return tree
    }
    throw new Error('Harness render failed to settle')
  }
  return {
    render, all: () => all(tree), text: () => text(tree), window: win, document, context, module, stored,
    setHydrated(value) { hydrated = value; return render() },
    find(predicate) { const found = all(tree).find(predicate); if (!found) throw new Error('Missing rendered element'); return found },
    button(label) { const found = all(tree).find(node => node.type === 'button' && text(node).includes(label)); if (!found) throw new Error(`Missing button ${label}`); return found },
    tick(delay) { const ready = [...timers.entries()].filter(([_id, timer]) => timer.delay === delay); for (const [id, timer] of ready) { if (!timer.interval) timers.delete(id); timer.callback() } return render() },
    cleanup() { hooks.forEach(hook => hook?.cleanup?.()); timers.clear() },
  }
}
module.exports = { componentHarness, all, text, eventTarget }
