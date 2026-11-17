import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { installTetrisPorts, mockTetrisRpc, snapshot, pointer } from '../docs/verify/2026-11-17-repeat-batch40/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch40/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 900, height: 900 }, hasTouch:!!options.touch, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch40Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch40Seeded', '1') }
    window.__unhandled = []; addEventListener('unhandledrejection', event => window.__unhandled.push(String(event.reason)))

  }, options)
  await context.route('**/*', route => { const request = route.request(); network.push(request.url() + '\n' + (request.postData() ?? '')); const url = new URL(request.url()); if (url.origin === base || ['blob:', 'data:'].includes(url.protocol)) return route.continue(); external.push(url.href); return route.abort('blockedbyclient') })
  context.on('page', page => {
    page.setDefaultTimeout(16000); page.setDefaultNavigationTimeout(120000)
    page.on('pageerror', error => errors.push(error.stack ?? String(error)))
    page.on('console', message => { logs.push(message.text()); if (message.type() === 'error') { consoleErrors.push(message.text()); if (/hydration|hydrating|did not match|Minified React error/i.test(message.text())) hydration.push(message.text()) } })
    page.on('dialog', dialog => dialog.accept())
  })
  const page = await context.newPage()
  page.__verificationSecrets = []
  const redact = value => { let text = String(value); if (options.sensitive) for (const secret of page.__verificationSecrets.filter(value => value.length >= 4)) text = text.replaceAll(secret, '[redacted generated value]'); return text }
  const open = async (slug, query = '', target = page) => {
    await target.goto(`${base}/${slug}/${query}`, { waitUntil: 'domcontentloaded' }); await target.locator('main h1').first().waitFor()
    await target.waitForFunction(() => [...document.querySelectorAll('[data-language-toggle] button')].some(element => Object.keys(element).some(key => key.startsWith('__reactProps$')))); await wait(200)
  }
  let status = 'pass', detail = {}, error
  const watchdog = setTimeout(() => { void context.close().catch(() => {}) }, 120000)
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:tetris|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
  catch (cause) { status = 'fail'; error = redact(cause.stack ?? String(cause)); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial', mask: options.sensitive ? [page.locator('#dp-account'), page.locator('pre'), page.locator('[data-dutch-copy-recovery]')] : [] }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${options.sensitive ? 'Sensitive page body intentionally omitted.' : await page.locator('body').innerText().catch(() => '')}`) }
  const result = { name, status, checkedAt: new Date().toISOString(), ...detail, error, errors: errors.map(redact), hydration: hydration.map(redact), consoleErrors: consoleErrors.map(redact), external: [...new Set(external)].map(redact) }
  clearTimeout(watchdog); results.push(result); writeFileSync(resolve(out, `${name}-evidence.json`), JSON.stringify(result, null, 2)); console.log(`${status.toUpperCase()} ${name}${error ? `: ${error.split('\n')[0]}` : ''}`); await context.close()
}
async function changeLanguage(page, language) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); const toggle = page.locator('[data-language-toggle]:visible').first()
  await toggle.locator('button[aria-expanded]').click(); await toggle.getByRole('button', { name: language === 'en' ? 'English' : '한국어', exact: true }).last().click()
}
async function screenshot(page, name, panel) {
  if (panel) { await panel.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' })); await panel.screenshot({ path: resolve(out, `${name}-panel.png`), caret: 'initial' }) }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: resolve(out, `${name}-top.png`), caret: 'initial' })
}
async function mobile(page, fields, controls) {
  const box = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth }))
  if(box.body>box.viewport+1||box.document>box.viewport+1)box.overflow=await page.evaluate(()=>[...document.querySelectorAll('main *')].map(el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,class:el.className,text:el.textContent?.slice(0,100),left:r.left,right:r.right,width:r.width}}).filter(item=>item.right>innerWidth+1||item.left< -1).slice(0,20))
  assert.ok(box.body <= box.viewport + 1 && box.document <= box.viewport + 1, JSON.stringify(box)); assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  for (const field of fields) assert.ok(await field.evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 16)
  for (const control of controls) assert.ok((await control.boundingBox()).height >= 44)
  return box
}
async function download(page, action, filename) {
  const pending = page.waitForEvent('download'); await action(); const file = await pending; const path = resolve(out, filename ?? file.suggestedFilename()); await file.saveAs(path)
  const bytes = readFileSync(path); return { filename: file.suggestedFilename(), path, bytes, text: bytes.toString('utf8') }
}



// Native clipboard remains available separately; failure/delay modes do not impersonate OS success.
async function observeDecisionPorts(context) {
  await context.addInitScript(() => {
    const nativeClipboard=navigator.clipboard, nativeRead=nativeClipboard?.readText.bind(nativeClipboard), nativeWrite=nativeClipboard?.writeText.bind(nativeClipboard), legacy=document.execCommand.bind(document)
    window.__clipboardMode='native';window.__legacyMode='false';window.__clipboardCalls=[];window.__legacyCalls=[];window.__clipboardPending=[];window.__nativeClipboardRead=nativeRead
    const api={writeText(text){window.__clipboardCalls.push(String(text));if(window.__clipboardMode==='reject')return Promise.reject(new DOMException('fixture denied','NotAllowedError'));if(window.__clipboardMode==='hold')return new Promise((resolve,reject)=>window.__clipboardPending.push({text:String(text),resolve,reject}));return nativeWrite(text)}}
    window.__setClipboardMode=mode=>{window.__clipboardMode=mode;Object.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='absent'?undefined:api})};window.__setClipboardMode('native')
    document.execCommand=(command,...rest)=>{if(command!=='copy')return legacy(command,...rest);window.__legacyCalls.push({text:document.activeElement?.value??'',mode:window.__legacyMode});if(window.__legacyMode==='throw')throw new Error('fixture legacy error');if(window.__legacyMode==='native')return legacy(command,...rest);return window.__legacyMode==='true'}
    const nativeSet=setTimeout.bind(window),nativeClear=clearTimeout.bind(window);window.__orderTimers=[];window.__orderHold=false
    window.setTimeout=(callback,delay,...args)=>{if(typeof callback!=='function'||![400,500,2000].includes(delay))return nativeSet(callback,delay,...args);const item={delay,callback:()=>callback(...args),canceled:false,fired:false,held:window.__orderHold&&[400,500].includes(delay)};item.id=nativeSet(()=>{if(item.held)return;item.fired=true;item.callback()},delay);window.__orderTimers.push(item);return item.id}
    window.clearTimeout=id=>{const item=window.__orderTimers.findLast(item=>item.id===id);if(item)item.canceled=true;return nativeClear(id)}
    window.__releaseOrderTimer=()=>{const item=window.__orderTimers.findLast(item=>item.held&&!item.canceled&&!item.fired);if(item){item.fired=true;item.callback()}}
  })
}



const root = page => page.locator('[data-tetris-status]')
const pad = (page,action) => page.locator(`[data-tetris-pad="${action}"]`)
const gameStatus = (page,status) => page.locator(`[data-tetris-status="${status}"]`).waitFor()
async function setup({page,context,open},start=true) { await installTetrisPorts(context);const rpc=await mockTetrisRpc(context);await open('tetris');await gameStatus(page,'idle');await page.evaluate(()=>window.__tetrisHoldFrames());if(start){await page.locator('[data-tetris-start]').first().click();await gameStatus(page,'playing');await poll(async()=>!!await snapshot(page),'Real game ref');await poll(async()=>await page.evaluate(()=>window.__tetrisRafs.some(item=>item.held&&!item.canceled)),'Held real game RAF')}return rpc }
async function bodyFocus(page) { await page.evaluate(()=>document.activeElement?.blur()) }
async function touchSession(page,context) { const cdp=await context.newCDPSession(page);return {cdp,send:(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(point=>({radiusX:2,radiusY:2,force:1,...point}))})} }
async function center(locator) {await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2} }

test('tetris-native-start-button-keyboard-once',async args=>{
  const {page}=args;const rpc=await setup(args,false);await page.locator('[data-tetris-start]').first().focus();await page.keyboard.press('Enter');await gameStatus(page,'playing');await poll(async()=>!!await snapshot(page),'Game after keyboard start')
  await pad(page,'cw').focus();await page.keyboard.press('Tab');assert.equal(await pad(page,'hard').evaluate(el=>el===document.activeElement),true);assert.equal(await pad(page,'hard').evaluate(el=>el.matches(':focus-visible')),true)
  await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.up('Space');assert.equal((await snapshot(page)).stats.pieces,1);await page.keyboard.press('Enter');assert.equal((await snapshot(page)).stats.pieces,2);await pad(page,'hard').click();assert.equal((await snapshot(page)).stats.pieces,3)
  assert.equal((await snapshot(page)).held.owners.length,0);assert.equal(rpc.filter(x=>x.name==='submit_leaderboard_score').length,0);return {nativeTabFocus:true,spaceWithRepeatPieces:1,enterAdditionalPieces:1,pointerAndClickAdditionalPieces:1,heldAfterPulse:0,realPublicRequests:0}
})

test('tetris-global-key-interactive-boundaries',async args=>{
  const {page}=args;await setup(args);const before=await snapshot(page);await pad(page,'hard').focus();await page.keyboard.press('ArrowLeft');assert.deepEqual((await snapshot(page)).piece,before.piece)
  await page.evaluate(()=>{const region=document.createElement('div');region.id='verification-interactives';region.innerHTML='<input aria-label="Synthetic text"><textarea aria-label="Synthetic textarea"></textarea><div contenteditable="true" aria-label="Synthetic editor"></div><a href="#synthetic" id="verification-link">Synthetic link</a>';document.querySelector('[data-tetris-status]').appendChild(region)})
  for(const selector of ['#verification-interactives input','#verification-interactives textarea','#verification-interactives [contenteditable]']){await page.locator(selector).focus();await page.keyboard.press('ArrowLeft');assert.deepEqual((await snapshot(page)).piece,before.piece)}
  await page.locator('#verification-link').focus();await page.keyboard.press('Enter');assert.ok(page.url().endsWith('#synthetic'));assert.deepEqual((await snapshot(page)).piece,before.piece)
  await pad(page,'cw').locator('svg').dispatchEvent('keydown',{key:'ArrowLeft',code:'ArrowLeft',bubbles:true});assert.deepEqual((await snapshot(page)).piece,before.piece)
  await bodyFocus(page);await page.keyboard.down('ArrowLeft');assert.equal((await snapshot(page)).piece.x,before.piece.x-1);await page.locator('#verification-interactives input').focus();await page.keyboard.up('ArrowLeft');assert.equal((await snapshot(page)).held.owners.length,0)
  const moved=(await snapshot(page)).piece;await page.evaluate(()=>{const target=document.body;target.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',isComposing:true,bubbles:true,cancelable:true}));const e=new KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',bubbles:true,cancelable:true});e.preventDefault();target.dispatchEvent(e)});assert.deepEqual((await snapshot(page)).piece,moved)
  return {nativeButtonTextLinkAndSvgBoundaries:true,nativeGlobalMovement:true,keyupAfterFocusChangeReleasesOwnKey:true,composingAndPreventedAreControlledEvents:true}
})

test('tetris-native-pointer-and-mixed-owners',async args=>{
  const {page,context}=args;await setup(args);const touch=await touchSession(page,context);const left=await center(pad(page,'left'));await bodyFocus(page);await page.keyboard.down('ArrowLeft');await touch.send('touchStart',[{id:1,x:left.x-8,y:left.y}]);await touch.send('touchStart',[{id:1,x:left.x-8,y:left.y},{id:2,x:left.x+8,y:left.y}]);assert.equal((await snapshot(page)).held.owners.length,3)
  await touch.send('touchEnd',[{id:2,x:left.x+8,y:left.y}]);assert.equal((await snapshot(page)).held.owners.length,2);assert.equal((await snapshot(page)).held.left,true);await page.keyboard.up('ArrowLeft');assert.equal((await snapshot(page)).held.owners.length,1);await touch.send('touchEnd',[]);assert.equal((await snapshot(page)).held.owners.length,0)
  const right=await center(pad(page,'right'));await bodyFocus(page);await page.keyboard.down('ArrowLeft');await touch.send('touchStart',[{id:3,...right}]);assert.equal((await snapshot(page)).held.direction,1);await touch.send('touchEnd',[]);assert.equal((await snapshot(page)).held.direction,-1);await page.keyboard.up('ArrowLeft');assert.equal((await snapshot(page)).held.direction,0);await touch.cdp.detach()
  return {nativeCdpTouchPointers:2,nativeKeyPlusSameDirectionPointers:3,singleReleasePreservesOtherOwners:true,oppositeReleaseReturnsHeldDirection:true,finalOwners:0}
},{touch:true})

test('tetris-board-gesture-pause-and-old-up',async args=>{
  const {page,context}=args;await setup(args);const touch=await touchSession(page,context);const board=page.locator('[data-tetris-board]');const at=await center(board);const before=await snapshot(page)
  await touch.send('touchStart',[{id:1,...at}]);await pointer(page,'[data-tetris-board]','pointerup',{id:999,...at});assert.equal((await snapshot(page)).piece.rot,before.piece.rot);await touch.send('touchEnd',[]);assert.equal((await snapshot(page)).piece.rot,(before.piece.rot+1)%4)
  await touch.send('touchStart',[{id:2,...at}]);await page.locator('[data-tetris-pause]').evaluate(el=>el.click());await gameStatus(page,'paused');await page.locator('[data-tetris-resume]').first().click();await gameStatus(page,'playing');const resumed=await snapshot(page);await touch.send('touchEnd',[]);assert.deepEqual((await snapshot(page)).piece,resumed.piece)
  await board.evaluate(el=>{el.__originalRect=el.getBoundingClientRect;el.getBoundingClientRect=()=>({...el.__originalRect(),width:0})});await pointer(page,'[data-tetris-board]','pointerdown',{id:88,...at});await pointer(page,'[data-tetris-board]','pointermove',{id:88,x:at.x+1e6,y:at.y+1e6});await pointer(page,'[data-tetris-board]','pointerup',{id:88,...at});assert.deepEqual((await snapshot(page)).piece,resumed.piece);await board.evaluate(el=>el.getBoundingClientRect=el.__originalRect);await touch.cdp.detach()
  return {nativeBoardTapOnce:true,foreignPointerUpIgnored:true,oldNativeUpAfterResumeIgnored:true,zeroWidthIsControlledGeometry:true}
},{touch:true})

test('tetris-old-raf-popup-and-new-game',async args=>{
  const {page}=args;await setup(args);await page.evaluate(()=>window.__oldTetrisRaf=window.__tetrisRafs.findLast(item=>item.held&&!item.canceled).callback);const oldRun=(await snapshot(page)).run;await page.locator('[data-tetris-start]').first().click();await poll(async()=>(await snapshot(page)).run!==oldRun,'New game generation');const fresh=await snapshot(page);await page.evaluate(()=>window.__oldTetrisRaf(performance.now()+9999));assert.deepEqual((await snapshot(page)).piece,fresh.piece);assert.equal((await snapshot(page)).stats.pieces,0)
  await page.evaluate(()=>{const g=window.__tetrisRefs().game.current;g.lastClear={lines:1,tspin:'none',b2b:false,combo:0,points:100};g.events=['clear']});await pad(page,'cw').click();await page.locator('[data-tetris-popup]').waitFor();const first=await page.locator('[data-tetris-popup]').getAttribute('data-tetris-popup');await page.evaluate(()=>window.__oldTetrisTimer=window.__tetrisTimers.at(-1).callback)
  await page.evaluate(()=>{const g=window.__tetrisRefs().game.current;g.lastClear={lines:2,tspin:'none',b2b:false,combo:1,points:300};g.events=['clear']});await pad(page,'cw').click();const next=await page.locator('[data-tetris-popup]').getAttribute('data-tetris-popup');assert.notEqual(next,first);await page.evaluate(()=>window.__oldTetrisTimer());assert.equal(await page.locator('[data-tetris-popup]').getAttribute('data-tetris-popup'),next)
  return {actualGameOldRafCallbackNoMutation:true,newGameGenerationChanged:true,oldPopupTimeoutCannotClearNewPopup:true,eventsAreSyntheticStateFixture:true,realSpeakerOutput:0}
})

test('tetris-stats-finish-once-and-mocked-submit',async args=>{
  const {page}=args;const rpc=await setup(args);await page.evaluate(()=>{const original=Date.now;Date.now=()=>original()+6000;const g=window.__tetrisRefs().game.current;g.score=3210;g.lines=12;g.stats.pieces=10;g.over=true;g.events=['gameover'];window.__finishRaf=window.__tetrisRafs.findLast(item=>item.held&&!item.canceled).callback;window.__tetrisStepFrame()});await gameStatus(page,'over');const stats=await page.evaluate(()=>JSON.parse(localStorage.getItem('tetris-stats')));assert.deepEqual(stats,{games:1,totalLines:12,bestLines:12});assert.equal(await page.evaluate(()=>localStorage.getItem('tetris-best-score')),'3210')
  await page.evaluate(()=>{window.__finishRaf(performance.now()+400);window.__finishRaf(performance.now()+600)});assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('tetris-stats'))),stats);const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.locator('input').fill('Synthetic tester');const over=await snapshot(page);await dialog.locator('input').press('ArrowLeft');assert.deepEqual((await snapshot(page)).piece,over.piece);await dialog.getByRole('button',{name:tr('leaderboard','submit'),exact:true}).click();await dialog.waitFor({state:'detached'});await poll(()=>rpc.some(row=>row.name==='submit_leaderboard_score'),'Mock submit only');const submissions=rpc.filter(row=>row.name==='submit_leaderboard_score');assert.equal(submissions.length,1);assert.equal(submissions[0].body.p_score,3210);assert.equal(submissions[0].body.p_player_name,'Synthetic tester');return {syntheticFinishStatistics:stats,finishRepeatedCallbacksAddedGames:0,publicRpcIntercepted:true,mockedSubmissions:1,realPublicSubmissions:0,nameInputDoesNotPlay:true}
})

test('tetris-handling-locale-and-unmount',async args=>{
  const {page}=args;await setup(args);await page.getByText(tr('tetris','settings.title'),{exact:true}).click();const das=page.locator('[data-tetris-handling="das"]');await das.press('Home');await das.press('ArrowRight');await das.press('ArrowRight');assert.equal(await das.inputValue(),'70');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tetris-handling')).das),70)
  const before=await snapshot(page);await changeLanguage(page,'en');assert.deepEqual((await snapshot(page)).piece,before.piece);assert.equal(await root(page).getAttribute('data-tetris-status'),'playing');await page.locator('[data-tetris-pause]').click();await gameStatus(page,'paused');await page.locator('[data-tetris-resume]').first().click();await gameStatus(page,'playing');await bodyFocus(page);await page.keyboard.down('ArrowRight');assert.equal((await snapshot(page)).held.right,true)
  await page.evaluate(()=>{window.__leavingGame=window.__tetrisRefs().game.current;window.__leavingPiece={...window.__leavingGame.piece};window.__leavingRaf=window.__tetrisRafs.findLast(item=>item.held&&!item.canceled)?.callback});await page.locator('header a[href="/"]').first().click();await root(page).waitFor({state:'detached'});await page.keyboard.up('ArrowRight');await page.evaluate(()=>window.__leavingRaf?.(performance.now()+1000));assert.deepEqual(await page.evaluate(()=>window.__leavingGame.piece),await page.evaluate(()=>window.__leavingPiece));return {handlingDas70Persisted:true,localePreservesGame:true,pauseResumeWorks:true,realSpaUnmountOldFrameNoMutation:true}
})

test('tetris-320-dark-ko-en',async args=>{
  const {page}=args;await setup(args);const controls=[pad(page,'left'),pad(page,'right'),pad(page,'cw'),pad(page,'hard'),page.locator('[data-tetris-pause]')];const ko=await mobile(page,[],controls);await screenshot(page,'tetris-320-ko',page.locator('[data-tetris-pad="hold"]').locator('..'));await changeLanguage(page,'en');const en=await mobile(page,[],controls);await screenshot(page,'tetris-320-en',page.locator('[data-tetris-pad="hold"]').locator('..'));await pad(page,'ccw').focus();await page.keyboard.press('Tab');assert.equal(await pad(page,'cw').evaluate(el=>el.matches(':focus-visible')),true);return {ko,en,padAtLeast44:true,nativeKeyboardFocusVisible:true,realAudioOutput:0}
},{width:320,dark:true,touch:true})

// Final product selectors are registered; execution waits for author/canonical readiness.
const planned = [
  "tetris-native-start-button-keyboard-once",
  "tetris-global-key-interactive-boundaries",
  "tetris-native-pointer-and-mixed-owners",
  "tetris-board-gesture-pause-and-old-up",
  "tetris-old-raf-popup-and-new-game",
  "tetris-stats-finish-once-and-mocked-submit",
  "tetris-handling-locale-and-unmount",
  "tetris-320-dark-ko-en"
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Final ready and native cases pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}

export { tr, wait, poll, test, changeLanguage, screenshot, mobile, download, observeDecisionPorts }
