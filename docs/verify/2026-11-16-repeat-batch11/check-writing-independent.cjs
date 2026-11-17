// Executes the real component event handlers with deferred file reads/locks; no browser or product mutation.
const assert = require('node:assert/strict')
const vm = require('node:vm')
const esbuild = require('esbuild')

async function main() {
  const built = await esbuild.build({ entryPoints: ['src/components/WritingVersionsBackup.tsx'], bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react/jsx-runtime', '@/lib/i18n', '@/lib/i18n/ns/characterCounter'] })
  const all = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(all) : [node, ...all(node.props?.children)]
  const text = node => typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children)
  const settle = () => new Promise(resolve => setImmediate(resolve))
  const value = id => ({ id, name: id, title: `제목 ${id}`, text: `원고 ${id}`, target: 500, basis: 'chars', sourceTab: 3, createdAt: '2026-11-16T00:00:00.000Z' })
  const file = (id, waiting) => {
    const raw = JSON.stringify({ format: 'toolhub-writing-versions', version: 1, exportedAt: '2026-11-16T00:00:00.000Z', versions: [value(id)] })
    return { name: `${id}.json`, size: raw.length, text: () => waiting ? waiting.then(() => raw) : Promise.resolve(raw) }
  }
  const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
  function harness() {
    let cursor = 0, tree, writes = 0
    const hooks = [], effects = [], locks = []
    const raw = JSON.stringify({ version: 1, versions: [] })
    const values = new Map([['characterCounter.writingVersions.v1', raw], ['characterCounter.v2', 'FIVE_DRAFTS_UNCHANGED']])
    const react = {
      useState(initial) { const index = cursor++; if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial }; return [hooks[index].value, next => { hooks[index].value = typeof next === 'function' ? next(hooks[index].value) : next }] },
      useRef(initial) { const index = cursor++; if (!hooks[index]) hooks[index] = { current: initial }; return hooks[index] },
      useEffect(effect, deps) { const index = cursor++, old = hooks[index]; if (!old || deps.some((item, n) => !Object.is(item, old.deps[n]))) { hooks[index] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); hooks[index].cleanup = effect() }) } },
      useMemo(factory, deps) { const index = cursor++, old = hooks[index]; if (!old || deps.some((item, n) => !Object.is(item, old.deps[n]))) hooks[index] = { deps, value: factory() }; return hooks[index].value },
    }
    const module = { exports: {} }, jsx = (type, props) => ({ type, props })
    const context = vm.createContext({ module, exports: module.exports, console, TextEncoder, setTimeout, clearTimeout, queueMicrotask,
      require(name) { if (name === 'react') return react; if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' }; if (name === '@/lib/i18n') return { useTranslations: () => (key, vars) => key + (vars ? JSON.stringify(vars) : '') }; if (name.startsWith('@/lib/i18n/ns/')) return {}; return require(name) },
      window: { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, raw) => { writes++; assert.equal(key, 'characterCounter.writingVersions.v1'); values.set(key, raw) } } },
      navigator: { locks: { request: (_key, callback) => new Promise((resolve, reject) => locks.push(() => { try { resolve(callback()) } catch (error) { reject(error) } })) } },
      crypto: { randomUUID: () => 'copied-id' },
    })
    vm.runInContext(built.outputFiles[0].text, context)
    const props = { stored: { ok: true, raw, versions: [] }, disabled: false, activeTab: 0, onCommitted(result) { props.stored = result }, onRefresh() {} }
    const render = () => { cursor = 0; tree = module.exports.default(props); while (effects.length) effects.shift()(); return tree }
    const choose = selected => all(tree).find(node => node.type === 'input' && node.props.type === 'file').props.onChange({ target: { files: [selected], value: '' } })
    const click = key => { const node = all(tree).find(node => node.type === 'button' && text(node).startsWith(key)); assert.ok(node, key); assert.ok(!node.props.disabled, `${key} must be enabled`); return node.props.onClick() }
    render()
    return { props, values, locks, render, choose, click, get output() { return text(tree) }, get writes() { return writes } }
  }

  { const h = harness(), a = deferred(); h.choose(file('A', a.promise)); h.render(); h.choose(file('B')); await settle(); h.render(); a.resolve(); await settle(); h.render(); assert.ok(h.output.includes('B.json')); assert.ok(!h.output.includes('A.json')); assert.equal(h.writes, 0); console.log('PASS later file wins over old read') }
  { const h = harness(), a = deferred(); h.choose(file('A', a.promise)); h.render(); h.click('backup.cancel'); a.resolve(); await settle(); h.render(); assert.ok(!h.output.includes('A.json')); assert.equal(h.writes, 0); console.log('PASS cancelled file read cannot restore preview') }
  { const h = harness(); h.choose(file('A')); await settle(); h.render(); h.click('backup.add'); h.render(); assert.equal(h.locks.length, 1); h.click('backup.cancel'); h.render(); h.choose(file('B')); await settle(); h.render(); h.locks.shift()(); await settle(); h.render(); assert.ok(h.output.includes('B.json')); assert.equal(h.writes, 0); console.log('PASS old cancelled lock cannot write or clear new preview') }
  { const h = harness(); h.choose(file('A')); await settle(); h.render(); h.click('backup.add'); h.render(); h.props.activeTab = 4; h.render(); await settle(); h.locks.shift()(); await settle(); h.render(); assert.equal(h.writes, 0); assert.ok(h.output.includes('backup.errors.stale')); console.log('PASS switching writing tab invalidates pending lock') }
  { const h = harness(); h.choose(file('A')); await settle(); h.render(); h.click('backup.add'); h.render(); h.values.set('characterCounter.writingVersions.v1', JSON.stringify({ version: 1, versions: [value('other-tab')] })); h.locks.shift()(); await settle(); h.render(); assert.equal(h.writes, 0); assert.ok(h.output.includes('backup.errors.conflict')); console.log('PASS actual raw change without storage event rejects pending write') }
  { const h = harness(); h.choose(file('A')); await settle(); h.render(); h.click('backup.add'); h.locks.shift()(); await settle(); h.render(); await settle(); h.render(); assert.equal(h.writes, 1); assert.equal(JSON.parse(h.values.get('characterCounter.writingVersions.v1')).versions[0].id, 'A'); assert.equal(h.values.get('characterCounter.v2'), 'FIVE_DRAFTS_UNCHANGED'); assert.ok(h.output.includes('backup.notices.imported')); console.log('PASS explicit import writes only versions and preserves success notice') }
  console.log('Writing independent component races: 6 checks passed')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
