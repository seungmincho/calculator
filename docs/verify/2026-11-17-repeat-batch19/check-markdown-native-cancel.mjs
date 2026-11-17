import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createMarkdownActionGuard } from '../../../src/utils/markdownActions.ts'

const path = 'src/components/MarkdownEditor.tsx'
const source = readFileSync(path, 'utf8')
const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'MarkdownEditor')
assert.ok(component?.body)
const callbacks = new Map()
let cancelEffect, mountEffect
for (const statement of component.body.statements) {
  if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer && ts.isCallExpression(declaration.initializer) && declaration.initializer.expression.getText(ast) === 'useCallback') {
        callbacks.set(declaration.name.text, declaration.initializer.arguments[0].getText(ast))
      }
    }
  }
  if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) && statement.expression.expression.getText(ast) === 'useEffect') {
    const effect = statement.expression.arguments[0].getText(ast)
    if (effect.includes("addEventListener('cancel'")) cancelEffect = effect
    if (effect.includes('mounted.current = true')) mountEffect = effect
  }
}
assert.ok(cancelEffect && mountEffect)
assert.ok(!source.includes('onCancel='), 'Unsupported React input prop must remain removed')

function fixture() {
  const input = new EventTarget()
  const actionGuard = createMarkdownActionGuard()
  const activeReader = { current: null }
  const state = { reading: false, notice: 'unchanged', fileNotice: 'loaded', draft: '현재 원고' }
  const mounted = { current: false }
  const context = vm.createContext({
    fileInputRef: { current: input }, actionGuard, activeReader, mounted,
    setReading: value => { state.reading = value },
    setNotice: value => { state.notice = value },
    setFileNotice: value => { state.fileNotice = value },
  })
  context.abortReader = vm.runInContext(`(${callbacks.get('abortReader')})`, context)
  context.cancelPendingRead = vm.runInContext(`(${callbacks.get('cancelPendingRead')})`, context)
  const setup = vm.runInContext(`(${cancelEffect})`, context)
  const mount = vm.runInContext(`(${mountEffect})`, context)
  return { input, actionGuard, activeReader, state, setup, mount, mounted }
}

{
  const f = fixture(), cleanup = f.setup()
  const token = f.actionGuard.beginRead()
  let aborts = 0
  f.activeReader.current = { abort() { aborts++ } }
  f.state.reading = true
  f.input.dispatchEvent(new Event('cancel'))
  assert.equal(aborts, 1)
  assert.equal(f.actionGuard.isCurrent(token), false)
  assert.equal(f.state.reading, false)
  assert.equal(f.state.fileNotice, null)
  assert.equal(f.state.draft, '현재 원고')
  const next = f.actionGuard.beginRead()
  assert.equal(f.actionGuard.isCurrent(next), true, 'A fresh file selection remains valid')
  cleanup()
  console.log('PASS native input cancel invalidates pending reads and keeps the current draft')
}

{
  const f = fixture()
  const cleanupOne = f.setup()
  cleanupOne()
  const cleanupTwo = f.setup()
  let invalidations = 0
  const invalidate = f.actionGuard.invalidateReads
  f.actionGuard.invalidateReads = () => { invalidations++; invalidate() }
  f.input.dispatchEvent(new Event('cancel'))
  assert.equal(invalidations, 1, 'StrictMode setup-cleanup-setup must not duplicate listeners')
  cleanupTwo()
  const token = f.actionGuard.beginRead()
  f.input.dispatchEvent(new Event('cancel'))
  assert.equal(invalidations, 1)
  assert.equal(f.actionGuard.isCurrent(token), true, 'Removed listener cannot cancel later work')
  console.log('PASS cancel listener removes cleanly and does not duplicate across effect replay')
}

{
  const f = fixture(), cleanupMount = f.mount(), cleanupCancel = f.setup()
  const read = f.actionGuard.beginRead(), copy = f.actionGuard.beginCopy()
  let aborts = 0
  f.activeReader.current = { abort() { aborts++ } }
  cleanupMount(); cleanupCancel()
  assert.equal(f.mounted.current, false)
  assert.equal(aborts, 1)
  assert.equal(f.actionGuard.isCurrent(read), false)
  assert.equal(f.actionGuard.isCurrent(copy), false)
  assert.equal(f.state.draft, '현재 원고')
  console.log('PASS unmount still invalidates copy and file completions and aborts the active reader')
}
console.log('3 native cancel event groups passed')
