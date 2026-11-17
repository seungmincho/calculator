import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Read and execute the actual effect/handler bodies with state/storage doubles.
// This is a bounded call-site regression test, not a browser or WebRTC test.
function extract(file, predicate, expression) {
  const source = fs.readFileSync(file, 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const matches = []
  function visit(node) { if (predicate(node, ast)) matches.push(node); ts.forEachChild(node, visit) }
  visit(ast)
  assert.equal(matches.length, 1, file)
  return expression(matches[0], ast)
}
function effect(file, marker) {
  return extract(file, (node, ast) => ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0].getText(ast).includes(marker), (node, ast) => node.arguments[0].getText(ast))
}
function handler(file, name) {
  return extract(file, node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name, (node, ast) => node.initializer.getText(ast))
}
function install(context, name, expression) {
  const javascript = ts.transpileModule(`globalThis.${name} = ${expression}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInContext(javascript, context)
}
const markdownFile = 'src/components/MarkdownEditor.tsx'
const ko = JSON.parse(fs.readFileSync('messages/ko.json', 'utf8')).markdownEditor.sample
const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf8')).markdownEditor.sample
assert.notEqual(ko, en)
const saveEffect = effect(markdownFile, 'localStorage.removeItem(DRAFT_KEY)')
const loadSample = handler(markdownFile, 'loadSample')
const newDoc = handler(markdownFile, 'newDoc')

function markdownFixture(markdown = ko) {
  const storage = new Map(), tasks = []
  const context = {
    markdown, sample: ko, sampleBaseline: ko, loaded: { current: true }, DRAFT_KEY: 'draft', confirm: true,
    t: key => key, setSaveState: () => {},
    localStorage: { setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout: callback => { tasks.push(callback); return tasks.length }, clearTimeout: () => {},
  }
  context.window = { confirm: () => context.confirm }
  context.setMarkdown = value => { context.markdown = value }
  context.setSampleBaseline = value => { context.sampleBaseline = value }
  vm.createContext(context)
  install(context, 'save', saveEffect); install(context, 'loadSample', loadSample); install(context, 'newDoc', newDoc)
  return { context, storage, save: () => { context.save(); tasks.shift()() } }
}

let count = 0
function test(label, run) { run(); count++; console.log(`PASS ${label}`) }

test('locale change cannot delete an explicitly saved draft equal to the other language example', () => {
  const f = markdownFixture(en)
  f.save(); assert.equal(f.storage.get('draft'), en)
  f.context.sample = en; f.save()
  assert.equal(f.storage.get('draft'), en)
  assert.equal(f.context.markdown, en)
})
test('untouched initial example stays excluded without creating a draft when locale changes', () => {
  const f = markdownFixture()
  f.save(); f.context.sample = en; f.save()
  assert.equal(f.storage.has('draft'), false)
  assert.equal(f.context.markdown, ko)
})
test('ordinary edited draft remains saved through both language directions', () => {
  const f = markdownFixture('# 직접 쓴 원고\n본문')
  f.save(); f.context.sample = en; f.save(); f.context.sample = ko; f.save()
  assert.equal(f.storage.get('draft'), '# 직접 쓴 원고\n본문')
})
test('explicit example button uses the current language and updates only its exclusion baseline', () => {
  const f = markdownFixture('my draft')
  f.save(); f.context.sample = en; f.context.loadSample(); f.save()
  assert.equal(f.context.markdown, en)
  assert.equal(f.context.sampleBaseline, en)
  assert.equal(f.storage.has('draft'), false)
  f.context.sample = ko; f.save()
  assert.equal(f.context.markdown, en)
  assert.equal(f.storage.has('draft'), false)
})
test('cancelled example load keeps the current draft and baseline', () => {
  const f = markdownFixture('keep me')
  f.context.sample = en; f.context.confirm = false; f.context.loadSample(); f.save()
  assert.equal(f.context.markdown, 'keep me')
  assert.equal(f.context.sampleBaseline, ko)
  assert.equal(f.storage.get('draft'), 'keep me')
})
test('new-document confirmation and cancellation retain their original behavior', () => {
  const f = markdownFixture('keep me')
  f.context.confirm = false; f.context.newDoc(); assert.equal(f.context.markdown, 'keep me')
  f.context.confirm = true; f.context.newDoc(); f.save()
  assert.equal(f.context.markdown, '')
  assert.equal(f.storage.get('draft'), '')
  assert.equal(f.context.sampleBaseline, ko)
})

const messageEffect = effect('src/components/Othello.tsx', 'const { type, payload } = lastMessage')
function othelloFixture() {
  const state = { chats: [], unread: 0, game: { moves: 0 }, phase: 'playing', ids: 0 }
  const context = {
    lastMessage: null, processedMessageRef: { current: null }, myColor: 'black', showChat: false,
    t: key => `ko:${key}`, showToast: () => {}, Date,
    crypto: { randomUUID: () => String(++state.ids) },
    setChatMessages: update => { state.chats = update(state.chats) },
    setUnreadCount: update => { state.unread = update(state.unread) },
    setGameState: update => { state.game = typeof update === 'function' ? update(state.game) : update },
    setGamePhase: phase => { state.phase = phase },
    createInitialOthelloState: () => ({ moves: 0 }),
    makeMove: previous => ({ moves: previous.moves + 1 }),
    setOpponentName: () => {}, handleBackToLobby: () => {},
  }
  vm.createContext(context); install(context, 'receive', messageEffect)
  return { context, state }
}
test('same chat message is applied once across t changes and repeated effect setups', () => {
  const f = othelloFixture()
  f.context.lastMessage = { type: 'chat', payload: { sender: 'other', content: 'hello' } }
  f.context.receive(); f.context.receive()
  f.context.t = key => `en:${key}`; f.context.receive()
  assert.equal(f.state.chats.length, 1)
  assert.equal(f.state.unread, 1)
})
test('new message objects with identical content still represent new messages', () => {
  const f = othelloFixture()
  f.context.lastMessage = { type: 'chat', payload: { sender: 'other', content: 'hello' } }; f.context.receive()
  f.context.lastMessage = { type: 'chat', payload: { sender: 'other', content: 'hello' } }; f.context.receive()
  assert.equal(f.state.chats.length, 2)
})
test('latest restart is not replayed over a later local move when locale changes', () => {
  const f = othelloFixture()
  f.context.lastMessage = { type: 'restart', payload: {} }; f.context.receive()
  f.state.game = { moves: 1 }
  f.context.t = key => `en:${key}`; f.context.receive()
  assert.equal(f.state.game.moves, 1)
})
test('disconnect null clears the consumed marker for a new connection', () => {
  const f = othelloFixture(), message = { type: 'chat', payload: { sender: 'other', content: 'hello' } }
  f.context.lastMessage = message; f.context.receive()
  f.context.lastMessage = null; f.context.receive()
  assert.equal(f.context.processedMessageRef.current, null)
  f.context.lastMessage = message; f.context.receive()
  assert.equal(f.state.chats.length, 2)
})
test('move events remain one-time and distinct new moves still apply', () => {
  const f = othelloFixture()
  f.context.lastMessage = { type: 'move', payload: { x: 2, y: 3, player: 'black' } }; f.context.receive(); f.context.receive()
  f.context.lastMessage = { type: 'move', payload: { x: 2, y: 4, player: 'white' } }; f.context.receive()
  assert.equal(f.state.game.moves, 2)
})
console.log(`${count} actual locale-effect groups passed`)
