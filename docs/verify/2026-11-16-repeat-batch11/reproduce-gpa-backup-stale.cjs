// Independent, browser-free event harness for the actual GpaScenarioBackup component.
// node docs/verify/2026-11-16-repeat-batch11/reproduce-gpa-backup-stale.cjs
const assert = require('node:assert/strict')
const vm = require('node:vm')
const esbuild = require('esbuild')

async function main() {
  const built = await esbuild.build({ entryPoints: ['src/components/GpaScenarioBackup.tsx'], bundle: true, write: false,
    format: 'cjs', platform: 'node', jsx: 'automatic',
    external: ['react', 'react/jsx-runtime', '@/lib/i18n', '@/lib/i18n/ns/gpaCalculator'] })
  const hooks = [], pendingEffects = []
  let cursor = 0
  const react = {
    useState(initial) {
      const index = cursor++
      if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial }
      return [hooks[index].value, next => { hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next }]
    },
    useRef(initial) { const index = cursor++; if (!hooks[index]) hooks[index] = { current: initial }; return hooks[index] },
    useEffect(effect, deps) {
      const index = cursor++, previous = hooks[index]
      if (!previous || deps.some((item, n) => !Object.is(item, previous.deps[n]))) {
        hooks[index] = { deps, cleanup: previous?.cleanup }
        pendingEffects.push(() => { previous?.cleanup?.(); hooks[index].cleanup = effect() })
      }
    },
  }
  const jsx = (type, props) => ({ type, props })
  const store = { version: 1, revision: 'initial', scenarios: [] }
  const raw = JSON.stringify(store)
  const values = new Map([['toolhub-gpa-scenarios-v1', raw]])
  const locks = []
  const module = { exports: {} }
  const context = vm.createContext({ module, exports: module.exports, console, setTimeout, clearTimeout, queueMicrotask,
    TextEncoder, structuredClone,
    require(name) {
      if (name === 'react') return react
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' }
      if (name === '@/lib/i18n') return { useTranslations: () => (key, vars) => key + (vars ? JSON.stringify(vars) : '') }
      if (name.startsWith('@/lib/i18n/ns/')) return {}
      return require(name)
    },
    window: { addEventListener() {}, removeEventListener() {} },
    document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    navigator: { locks: { request: (_key, _options, callback) => new Promise((resolve, reject) => locks.push(() => {
      try { resolve(callback()) } catch (error) { reject(error) }
    })) } },
    crypto: { randomUUID: () => 'generated-id' },
  })
  vm.runInContext(built.outputFiles[0].text, context)
  const Component = module.exports.default
  const props = { view: { ok: true, raw, store }, disabled: false, onCommitted() { throw new Error('Cancelled import must not commit') } }
  const render = () => { cursor = 0; const tree = Component(props); while (pendingEffects.length) pendingEffects.shift()(); return tree }
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(all) : [node, ...all(node.props?.children)]
  const text = node => typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : Array.isArray(node)
    ? node.map(text).join(' ') : text(node.props?.children)
  const scenario = id => ({ id, name: id, createdAt: '2026-11-16T00:00:00.000Z', snapshot: {
    scale: '4.5', targetGpa: '4.0', remainingCredits: '20', semesters: [{ id: 'semester', courses: [] }],
  } })
  const file = id => { const contents = JSON.stringify({ format: 'toolhub-gpa-scenarios', version: 1, exportedAt: '2026-11-16T00:00:00.000Z', scenarios: [scenario(id)] }); return { name: `${id}.json`, size: contents.length, text: async () => contents } }
  const settle = () => new Promise(resolve => setImmediate(resolve))
  let tree = render()
  const choose = selected => all(tree).find(node => node.type === 'input' && node.props.type === 'file').props.onChange({ currentTarget: { files: [selected], value: '' } })
  choose(file('A')); await settle(); tree = render()
  assert.ok(text(tree).includes('A.json'))
  const pendingImport = all(tree).find(node => node.type === 'button' && text(node).includes('scenarioBackup.add')).props.onClick()
  assert.equal(locks.length, 1)
  tree = render()
  choose(file('B')); await settle(); tree = render()
  assert.ok(text(tree).includes('B.json'), 'new B preview is ready while A waits for its lock')
  locks.shift()(); await pendingImport; await settle(); tree = render()
  const retained = text(tree).includes('B.json')
  console.log(JSON.stringify({ oldImport: 'A waiting on lock', newestPreview: 'B.json', newestPreviewRetained: retained, storedUnchanged: values.get('toolhub-gpa-scenarios-v1') === raw }))
  assert.ok(retained, 'An obsolete A import must not clear the newer B preview or its selection')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
