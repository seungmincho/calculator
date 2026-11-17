import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import JSZip from 'jszip'
import { createHash } from 'node:crypto'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch28/browser')
const only = process.argv[2]
const messages = Object.fromEntries(['ko', 'en'].map(language => [language, JSON.parse(readFileSync(`messages/${language}.json`, 'utf8'))]))
const tr = (ns, key, language = 'ko', values = {}) => {
  const value = key.split('.').reduce((object, key) => object?.[key], messages[language][ns])
  assert.equal(typeof value, 'string', `Missing ${language}:${ns}.${key}`)
  return value.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match)
}
const wm = (key, language = 'ko', values = {}) => tr('imageWatermark', key, language, values)
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function poll(predicate, description, attempts = 180) { for (let n = 0; n < attempts; n++) { if (await predicate()) return; await wait(100) }; assert.fail(`Timed out: ${description}`) }
const cases = [], results = []
const test = (name, fn, options = {}) => cases.push({ name, fn, options })

async function run(browser, { name, fn, options }) {
  if (only && !only.split(',').some(part => name.includes(part))) return
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch28Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch28Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:imageWatermark)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
  catch (cause) { status = 'fail'; error = redact(cause.stack ?? String(cause)); await page.screenshot({ path: resolve(out, `${name}-failure.png`), caret: 'initial', mask: options.sensitive ? [page.locator('[data-password-value]'), page.locator('[data-password-copy-recovery] textarea'), page.locator('#pg-check')] : [] }).catch(() => {}); writeFileSync(resolve(out, `${name}-failure.txt`), `${error}\n\n${options.sensitive ? 'Sensitive page body intentionally omitted.' : await page.locator('body').innerText().catch(() => '')}`) }
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
  assert.ok(box.body <= box.viewport + 1 && box.document <= box.viewport + 1, JSON.stringify(box)); assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true)
  for (const field of fields) assert.ok(await field.evaluate(node => parseFloat(getComputedStyle(node).fontSize)) >= 16)
  for (const control of controls) assert.ok((await control.boundingBox()).height >= 44)
  return box
}
async function download(page, action, filename) {
  const pending = page.waitForEvent('download'); await action(); const file = await pending; const path = resolve(out, filename ?? file.suggestedFilename()); await file.saveAs(path)
  const bytes = readFileSync(path); return { filename: file.suggestedFilename(), path, bytes, text: bytes.toString('utf8') }
}


// Synthetic images only; no user photos, uploads, or remote fixtures.
function sourcePng(width, height, rgba = [30, 80, 160, 255]) { const png = new PNG({ width, height }); for (let offset = 0; offset < png.data.length; offset += 4) png.data.set(rgba, offset); return PNG.sync.write(png) }
function logoPng(width = 20, height = 10) { const png = new PNG({ width, height }); for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) png.data.set([240, x < width / 2 ? 30 : 80, 20, 128], (y * width + x) * 4); return PNG.sync.write(png) }
const pngFile = (name, width, height, rgba) => ({ name, mimeType: 'image/png', buffer: sourcePng(width, height, rgba) })
function pixelBounds(png, predicate) { let left = png.width, top = png.height, right = -1, bottom = -1, count = 0; for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) { const pixel = [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)]; if (predicate(pixel, x, y)) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); count++ } }; return count ? { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, count } : null }
function pngEvidence(bytes) { const png = PNG.sync.read(bytes); return { width: png.width, height: png.height, rgbaSha256: createHash('sha256').update(png.data).digest('hex'), fileSha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, corner: [...png.data.subarray(0, 4)] } }
async function inspectPngZip(bytes) { const zip = await JSZip.loadAsync(bytes, { checkCRC32: true }), entries = []; for (const item of Object.values(zip.files).filter(item => !item.dir)) { assert.match(item.name, /\.png$/i); const content = await item.async('nodebuffer'); entries.push({ name: item.name, ...pngEvidence(content) }) }; assert.equal(new Set(entries.map(item => item.name.toLocaleLowerCase())).size, entries.length); return entries }
async function observeWatermarkIo(context) {
  await context.addInitScript(() => {
    window.__wmReadModes = {}; window.__wmReads = []; window.__wmHeldReads = []; window.__wmEncodes = []; window.__wmHeldEncodes = []; window.__wmEncodeMode = 'native'; window.__wmActiveEncodes = 0; window.__wmMaxEncodes = 0; window.__wmUrls = []; window.__wmZipMode = 'native'; window.__wmZipReads = []
    const read = File.prototype.arrayBuffer
    File.prototype.arrayBuffer = async function() { const item = { name: this.name, size: this.size, mode: window.__wmReadModes[this.name] ?? 'native' }; window.__wmReads.push(item); const result = await read.call(this); if (item.mode === 'failOnce') { window.__wmReadModes[this.name] = 'native'; throw new DOMException('Synthetic transient image read failure', 'NotReadableError') }; if (item.mode === 'hold') await new Promise(resolve => window.__wmHeldReads.push({ name: this.name, release: resolve })); return result }
    const toBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) { const item = { width: this.width, height: this.height, type, mode: window.__wmEncodeMode, delivered: false }; window.__wmEncodes.push(item); window.__wmActiveEncodes++; window.__wmMaxEncodes = Math.max(window.__wmMaxEncodes, window.__wmActiveEncodes); return toBlob.call(this, blob => { const deliver = () => { if (item.delivered) return; item.delivered = true; window.__wmActiveEncodes--; callback(item.mode === 'null' ? null : blob) }; item.actualBlobBytes = blob?.size; if (item.mode === 'hold') window.__wmHeldEncodes.push({ item, deliver }); else deliver() }, type, quality) }
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
    URL.createObjectURL = blob => { const url = create(blob); window.__wmUrls.push({ url, bytes: blob.size, type: blob.type, revoked: false }); return url }; URL.revokeObjectURL = url => { const item = window.__wmUrls.find(item => item.url === url); if (item) item.revoked = true; return revoke(url) }
    const reader = FileReader.prototype.readAsArrayBuffer
    FileReader.prototype.readAsArrayBuffer = function(blob) { if (!(blob instanceof File) && /^image\//.test(blob.type) && window.__wmZipMode !== 'native') { const item = { bytes: blob.size, type: blob.type, mode: window.__wmZipMode }; window.__wmZipReads.push(item); if (item.mode === 'fail') { Object.defineProperty(this, 'error', { configurable: true, value: new DOMException('Synthetic ZIP read failure', 'NotReadableError') }); queueMicrotask(() => this.dispatchEvent(new ProgressEvent('error'))); return }; item.release = () => reader.call(this, blob); return }; return reader.call(this, blob) }
    window.__wmRelease = () => { for (const item of window.__wmHeldReads.splice(0)) item.release(); for (const item of window.__wmHeldEncodes.splice(0)) item.deliver() }
    window.__wmReleaseZip = () => { window.__wmZipMode = 'native'; for (const item of window.__wmZipReads) if (item.release) { item.release(); delete item.release } }
  })
}
const wmAction = (page, name) => page.locator(`[data-watermark-action="${name}"]`)
const wmRows = page => page.locator('[data-watermark-row]')
async function wmStates(page) { return wmRows(page).evaluateAll(nodes => nodes.map(node => ({ id:node.dataset.watermarkRow,status:node.dataset.watermarkStatus,name:node.querySelector('[data-watermark-select-preview]').textContent }))) }
async function expectWm(page, statuses) { await poll(async()=>JSON.stringify((await wmStates(page)).map(row=>row.status))===JSON.stringify(statuses),`watermark statuses ${statuses}`); return wmStates(page) }
async function wmOption(page,name,value) { const field=page.locator(`[data-watermark-option="${name}"]`); if(typeof value==='boolean') await field.setChecked(value); else if(name==='fontFamily') await field.selectOption(value); else await field.evaluate((element,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element,String(value));element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}))},value) }
async function wmBoot(context,open) { await observeWatermarkIo(context); await open('image-watermark'); await poll(async()=>!await context.pages()[0].locator('[data-watermark-files]').isDisabled(),'watermark mounted') }
async function wmFiles(page,files) { await page.locator('[data-watermark-files]').setInputFiles(files) }
async function wmPreview(page) { await page.locator('[data-watermark-preview]').waitFor(); return PNG.sync.read(Buffer.from((await page.locator('[data-watermark-preview]').evaluate(canvas=>canvas.toDataURL('image/png'))).split(',')[1],'base64')) }
async function wmMake(page,count=1) { await wmAction(page,'start').click(); return expectWm(page,Array(count).fill('done')) }
async function wmPng(page,id,name) { return download(page,()=>page.locator(`[data-watermark-png="${id}"]`).click(),name) }
async function wmLogo(page) { await page.locator('[data-watermark-type="image"]').click(); await page.locator('[data-watermark-logo]').setInputFiles({name:'synthetic-logo.png',mimeType:'image/png',buffer:logoPng()}); await poll(async()=>await page.locator('[data-watermark-logo-name]').count()>0,'valid logo') }
async function wmHeld(page) { await poll(()=>page.evaluate(()=>window.__wmHeldEncodes.length>0),'native toBlob result held') }

test('watermark-single-text-native-png-alpha',async({page,context,open})=>{
  await wmBoot(context,open); await page.locator('[data-watermark-text]').fill('TEST\nPNG'); await wmOption(page,'fontSize',40); await page.locator('[data-watermark-color]').fill('#ffffff'); await page.locator('[data-watermark-position="center"]').click()
  await wmFiles(page,[pngFile('transparent-source.png',640,360,[0,0,0,0])]); await wmPreview(page)
  assert.equal(await page.locator('[data-watermark-normalized]').innerText(),'TEST PNG'); assert.deepEqual((await wmStates(page)).map(row=>row.status),['pending']); assert.equal(await page.evaluate(()=>window.__wmEncodes.length),0)
  const [row]=await wmMake(page); const file=await wmPng(page,row.id,'single-text-native.png'); const png=PNG.sync.read(file.bytes); assert.equal(file.filename,'transparent-source_watermarked.png'); assert.equal(png.width,640); assert.equal(png.height,360)
  const bounds=pixelBounds(png,p=>p[3]>0); assert.ok(bounds.count>300); assert.ok(Math.abs((bounds.left+bounds.right)/2-320)<4); assert.ok(bounds.top>=130&&bounds.bottom<=210); assert.equal(png.data.reduce((max,value,index)=>index%4===3?Math.max(max,value):max,0),128); assert.deepEqual([...png.data.subarray(0,4)],[0,0,0,0])
  await wmOption(page,'bold',true); await wmOption(page,'fontFamily','serif'); await wmOption(page,'rotation',90); await wmMake(page); const rotated=await wmPng(page,row.id,'single-text-native-rotated.png'); assert.notEqual(pngEvidence(rotated.bytes).rgbaSha256,pngEvidence(file.bytes).rgbaSha256)
  return { nativeCanvasPng:true, originalDimensions:[png.width,png.height], maxAlpha:128, transparentCorner:true,bounds, rasterChangedWithFontBoldRotation:true, bytes:file.bytes.length }
})

test('watermark-nine-logo-positions-preview-and-output-geometry',async({page,context,open})=>{
  await wmBoot(context,open); await wmFiles(page,[pngFile('geometry.png',1200,800,[0,0,0,0])]); await wmLogo(page); await wmOption(page,'margin',20); await wmOption(page,'watermarkSize',20)
  const positions=['topLeft','topCenter','topRight','middleLeft','center','middleRight','bottomLeft','bottomCenter','bottomRight'], evidence=[]
  for(let index=0;index<positions.length;index++) { const position=positions[index]; await page.locator(`[data-watermark-position="${position}"]`).click(); const preview=await wmPreview(page); const [row]=await wmMake(page); const file=await wmPng(page,row.id,`logo-${position}.png`); const png=PNG.sync.read(file.bytes); const box=pixelBounds(png,p=>p[3]>0); const x=[20,480,940][index%3],y=[20,340,660][Math.floor(index/3)]; assert.deepEqual({left:box.left,top:box.top,width:box.width,height:box.height},{left:x,top:y,width:240,height:120}); assert.equal(png.data[((y+60)*1200+x+60)*4+3],64)
    const shown=pixelBounds(preview,p=>p[3]>0); assert.equal(preview.width,900); assert.equal(preview.height,600); for(const [key,value] of Object.entries({left:x*.75,top:y*.75,width:180,height:90})) assert.ok(Math.abs(shown[key]-value)<=1,`${position} ${key}`); evidence.push({position,output:box,preview:shown}) }
  await page.locator('[data-watermark-position="center"]').click(); await wmOption(page,'rotation',90); let [row]=await wmMake(page); let file=await wmPng(page,row.id,'logo-center-rotate90.png'); const rotated=pixelBounds(PNG.sync.read(file.bytes),p=>p[3]>0); assert.deepEqual({width:rotated.width,height:rotated.height},{width:120,height:240})
  await wmOption(page,'rotation',0); await wmOption(page,'tileMode',true); [row]=await wmMake(page); file=await wmPng(page,row.id,'logo-tile.png'); const tiled=pixelBounds(PNG.sync.read(file.bytes),p=>p[3]>0); assert.ok(tiled.count>240*120*5)
  return { positions:evidence, originalDimensions:[1200,800], previewDimensions:[900,600], composedAlpha:64, rotation90:rotated, tiledPixels:tiled.count }
})

test('watermark-multi-partial-zip-crc-and-stable-names',async({page,context,open})=>{
  await wmBoot(context,open); await page.locator('[data-watermark-text]').fill('ZIP'); await wmOption(page,'fontSize',12)
  await wmFiles(page,[pngFile('same.png',96,64,[255,0,0,255]),pngFile('same.png',80,60,[0,255,0,255]),pngFile('same (2).png',72,48,[0,0,255,255])]); await wmMake(page,3); const rows=await wmStates(page)
  await page.locator(`[data-watermark-up="${rows[2].id}"]`).click(); const ordered=await wmStates(page); assert.deepEqual(ordered.map(row=>row.id),[rows[0].id,rows[2].id,rows[1].id])
  await page.locator(`[data-watermark-select="${rows[1].id}"]`).uncheck(); let file=await download(page,()=>wmAction(page,'zip').click(),'partial-native.zip'); let entries=await inspectPngZip(file.bytes); assert.equal(entries.length,2); assert.deepEqual(entries.map(item=>[item.width,item.height]),[[96,64],[72,48]]); assert.deepEqual(entries.map(item=>item.corner),[[255,0,0,255],[0,0,255,255]])
  await wmAction(page,'select-completed').click(); file=await download(page,()=>wmAction(page,'zip').click(),'all-native.zip'); entries=await inspectPngZip(file.bytes); assert.equal(entries.length,3); assert.equal(entries[0].name,'same_watermarked.png'); assert.ok(entries.some(item=>item.name==='same_watermarked (2).png')); assert.equal(file.filename,'watermarked-images.zip')
  const png=await wmPng(page,rows[1].id,'green-individual.png'); assert.equal(pngEvidence(png.bytes).rgbaSha256,entries[2].rgbaSha256)
  return { crc32Checked:true, partialEntries:2, allEntries:entries, stableIdsAfterMove:true, individualEqualsZip:true, zipFilename:file.filename }
})

test('watermark-invalid-limits-and-retained-logo',async({page,context,open})=>{
  await wmBoot(context,open); await wmFiles(page,[pngFile('kept.png',160,100)]); await wmLogo(page); await wmMake(page); const id=(await wmStates(page))[0].id
  await page.locator('[data-watermark-logo]').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')}); await poll(async()=>!await wmAction(page,'start').isDisabled(),'bad logo settled'); assert.match(await page.locator('[data-watermark-logo-name]').innerText(),/synthetic-logo/); await wmMake(page)
  assert.equal((await wmStates(page))[0].id,id); await wmFiles(page,Array.from({length:10},(_,i)=>pngFile(`extra-${i}.png`,2,2))); assert.equal(await wmRows(page).count(),1)
  const oversized=Buffer.alloc(8*1024*1024+1); sourcePng(1,1).copy(oversized); const huge=sourcePng(1,1); huge.writeUInt32BE(4097,16); huge.writeUInt32BE(4097,20)
  await wmFiles(page,[{name:'oversize.png',mimeType:'image/png',buffer:oversized},{name:'dimensions.png',mimeType:'image/png',buffer:huge},{name:'invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')}]); await wmAction(page,'start').click(); const rows=await expectWm(page,['done','error','error','error'])
  assert.ok(!await page.evaluate(()=>window.__wmReads.some(row=>row.name==='oversize.png')),'size checked before file read')
  await page.locator('[data-watermark-type="text"]').click(); await page.locator('[data-watermark-text]').fill('🙂'.repeat(201)); assert.equal(await wmAction(page,'start').isDisabled(),true)
  await page.locator('[data-watermark-text]').fill('valid'); await page.locator('[data-watermark-color]').fill('invalid raw color'); assert.equal(await wmAction(page,'start').isDisabled(),true); assert.equal(await page.locator('[data-watermark-color]').inputValue(),'invalid raw color')
  await page.locator('[data-watermark-type="image"]').click(); assert.equal(await wmAction(page,'start').isDisabled(),false,'inactive invalid text field does not block image')
  await wmAction(page,'clear').click(); assert.equal(await wmRows(page).count(),0); assert.match(await page.locator('[data-watermark-logo-name]').innerText(),/synthetic-logo/)
  await wmAction(page,'reset').click(); assert.equal(await page.locator('[data-watermark-type="text"]').getAttribute('aria-pressed'),'true'); assert.equal(await page.locator('[data-watermark-logo-name]').count(),0)
  return { retainedValidLogoAfterFailure:true, countRejectionPreservesExisting:true, invalidRows:rows.slice(1).map(row=>row.name), preReadFileLimit:8*1024*1024, preDecodePixelsLimit:16777216, textCodePoints:201, clearPreservesLogoResetRemoves:true }
})

test('watermark-native-slot-pause-resume-failed-only-retry',async({page,context,open})=>{
  await wmBoot(context,open); await wmFiles(page,[pngFile('a.png',160,100),pngFile('b.png',140,90),pngFile('c.png',120,80)]); await wmPreview(page)
  await page.evaluate(()=>{window.__wmReadModes['a.png']='failOnce';window.__wmEncodeMode='hold'}); await wmAction(page,'start').click(); await wmHeld(page); await expectWm(page,['error','processing','pending'])
  await wmAction(page,'pause').click(); assert.equal(await page.evaluate(()=>window.__wmActiveEncodes),1); await page.evaluate(()=>{window.__wmEncodeMode='native';window.__wmRelease()}); await poll(async()=>await page.locator('[data-watermark-progress]').getAttribute('data-watermark-phase')==='paused','pause settles actual native toBlob')
  await wmAction(page,'retry').click(); await expectWm(page,['done','pending','pending']); assert.equal(await page.evaluate(()=>window.__wmMaxEncodes),1)
  await wmMake(page,3)
  await wmOption(page,'opacity',51); await wmPreview(page); await page.evaluate(()=>window.__wmEncodeMode='hold'); await wmAction(page,'start').click(); await wmHeld(page); await wmAction(page,'pause').click(); await wmAction(page,'resume').click(); assert.equal(await page.evaluate(()=>window.__wmActiveEncodes),1)
  await page.evaluate(()=>{window.__wmEncodeMode='native';window.__wmRelease()}); await expectWm(page,['done','done','done']); const metrics=await page.evaluate(()=>({max:window.__wmMaxEncodes,encodes:window.__wmEncodes.map(row=>({width:row.width,actualBytes:row.actualBlobBytes,delivered:row.delivered}))})); assert.equal(metrics.max,1)
  return { nativeCanvasEncodes:metrics.encodes, maxConcurrentNativeEncodes:1, failedOnlyRetryLeavesPausedOthers:true, resumeBeforeOldNativeCompletion:true }
})

test('watermark-stale-canvas-reset-remove-and-unmount',async({page,context,open})=>{
  await wmBoot(context,open); await wmFiles(page,[pngFile('late.png',160,100)]); await wmPreview(page); await page.evaluate(()=>window.__wmEncodeMode='hold'); await wmAction(page,'start').click(); await wmHeld(page)
  await wmOption(page,'opacity',70); await page.evaluate(()=>{window.__wmEncodeMode='native';window.__wmRelease()}); await expectWm(page,['pending']); assert.equal(await page.locator('[data-watermark-png]').isDisabled(),true)
  await wmMake(page); const urls=await page.evaluate(()=>window.__wmUrls.filter(item=>item.type==='image/png').map(item=>item.url)); assert.ok(urls.length)
  await wmOption(page,'opacity',71); await wmPreview(page); await page.evaluate(()=>window.__wmEncodeMode='hold'); await wmAction(page,'start').click(); await wmHeld(page); await page.locator('[data-watermark-remove]').click(); await page.evaluate(()=>{window.__wmEncodeMode='native';window.__wmRelease()}); await poll(async()=>await wmRows(page).count()===0,'removed late row stays removed')
  await page.evaluate(()=>window.__wmReadModes['held-source.png']='hold'); await wmFiles(page,[pngFile('held-source.png',90,60)]); await poll(()=>page.evaluate(()=>window.__wmHeldReads.length>0),'source preview read held'); await wmAction(page,'reset').click(); await page.evaluate(()=>window.__wmRelease()); await wait(80); assert.equal(await page.locator('[data-watermark-preview]').count(),0)
  await wmFiles(page,[pngFile('unmount.png',100,60)]); await wmPreview(page); await page.evaluate(()=>window.__wmEncodeMode='hold'); await wmAction(page,'start').click(); await wmHeld(page)
  await page.locator('header a[href="/"]').filter({visible:true}).first().click(); await poll(async()=>await page.locator('[data-watermark-workspace]').count()===0,'actual SPA unmount'); await page.evaluate(()=>window.__wmRelease()); await poll(()=>page.evaluate(()=>window.__wmActiveEncodes===0),'native encoding released after unmount')
  assert.equal(await page.evaluate(urls=>window.__wmUrls.filter(item=>urls.includes(item.url)).every(item=>item.revoked),urls),true)
  return { changedSettingsRejectOldPng:true, removedRowNotResurrected:true, resetCancelsLateSourcePreview:true, spaUnmountNativeFinallySettled:true, ownedResultUrlsRevoked:true }
})

test('watermark-zip-snapshot-and-late-download',async({page,context,open})=>{
  await wmBoot(context,open); await wmFiles(page,[pngFile('zip-a.png',100,60,[255,0,0,255]),pngFile('zip-b.png',80,50,[0,255,0,255])]); await wmMake(page,2); const rows=await wmStates(page); let downloads=0; page.on('download',()=>downloads++)
  await page.evaluate(()=>window.__wmZipMode='hold'); await wmAction(page,'zip').click(); await poll(()=>page.evaluate(()=>window.__wmZipReads.some(item=>!!item.release)),'real ZIP blob reads held')
  await wmAction(page,'deselect').click(); await page.locator(`[data-watermark-remove="${rows[0].id}"]`).click(); const promised=page.waitForEvent('download'); await page.evaluate(()=>window.__wmReleaseZip()); const snapshot=await promised; const snapshotPath=resolve(out,'zip-click-snapshot.zip'); await snapshot.saveAs(snapshotPath); const entries=await inspectPngZip(readFileSync(snapshotPath)); assert.equal(entries.length,2)
  await wmAction(page,'select-completed').click(); await page.evaluate(()=>window.__wmZipMode='hold'); await wmAction(page,'zip').click(); await poll(()=>page.evaluate(()=>window.__wmZipReads.some(item=>!!item.release)),'second ZIP held'); await wmOption(page,'opacity',73); const count=downloads; await page.evaluate(()=>window.__wmReleaseZip()); await poll(async()=>!(await page.locator('[data-watermark-notice]').count())||await page.locator('[data-watermark-notice]').innerText()===wm('batch.changed'),'canceled ZIP settled'); await wait(120); assert.equal(downloads,count)
  await wmMake(page); await wmAction(page,'select-completed').click(); await page.evaluate(()=>window.__wmZipMode='fail'); await wmAction(page,'zip').click(); await poll(async()=>await page.locator('[data-watermark-notice]').innerText()===wm('batch.zipFailed'),'ZIP error keeps output'); assert.equal((await wmStates(page))[0].status,'done')
  await page.evaluate(()=>window.__wmZipMode='native'); const retry=await download(page,()=>wmAction(page,'zip').click(),'zip-retry-native.zip'); assert.equal((await inspectPngZip(retry.bytes)).length,1)
  await page.evaluate(()=>{window.__wmAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download)throw new Error('fixture download failure');return window.__wmAnchorClick.call(this)}}); await page.locator('[data-watermark-png]').click(); assert.equal(await page.locator('[data-watermark-notice]').innerText(),wm('batch.downloadFailed')); assert.equal((await wmStates(page))[0].status,'done'); await page.evaluate(()=>HTMLAnchorElement.prototype.click=window.__wmAnchorClick)
  return { nativeZipSnapshotEntries:entries.length, selectionDeletionAfterClickPreservedSnapshot:true, settingsCanceledLateDownload:true, encodeFailureRetry:true, anchorFailureKeepsResult:true, crc32Checked:true }
})

test('watermark-320-dark-ko-en-and-private-inputs',async({page,context,open,network,logs})=>{
  await wmBoot(context,open); const secret='WM-SYNTHETIC-PRIVATE-7421'; await page.locator('[data-watermark-text]').fill(secret); await wmOption(page,'fontSize',12); await wmFiles(page,[pngFile('mobile-private.png',320,180)]); await wmMake(page); const rows=await wmStates(page)
  const fields=[page.locator('[data-watermark-text]'),page.locator('[data-watermark-color]'),page.locator('[data-watermark-option="fontFamily"]')], controls=[wmAction(page,'start'),wmAction(page,'zip'),page.locator('[data-watermark-position="center"]')]; const ko=await mobile(page,fields,controls); await screenshot(page,'watermark-320-ko',page.locator('#image-watermark-result'))
  await page.locator('[data-watermark-files]').focus(); assert.ok(await page.locator('[data-watermark-files]').evaluate(node=>getComputedStyle(node.parentElement).boxShadow)!=='none'); assert.ok(await page.locator('a[href="#image-watermark-result"]').count()>0)
  const stateBefore=await page.evaluate(()=>({local:JSON.stringify(localStorage),session:JSON.stringify(sessionStorage),url:location.href})); await changeLanguage(page,'en'); await poll(async()=>await wmAction(page,'start').innerText()===wm('batch.makeAll','en'),'English watermark')
  assert.equal(await page.locator('[data-watermark-text]').inputValue(),secret); assert.deepEqual(await wmStates(page),rows); const en=await mobile(page,fields,controls); await screenshot(page,'watermark-320-en',page.locator('#image-watermark-result'))
  const file=await wmPng(page,rows[0].id,'watermark-mobile-native.png'); assert.equal(pngEvidence(file.bytes).width,320)
  const stored=await page.evaluate(()=>JSON.stringify(localStorage)+JSON.stringify(sessionStorage)+location.href); assert.ok(!stored.includes(secret)); assert.ok(!network.some(value=>value.includes(secret))); assert.ok(!logs.some(value=>value.includes(secret))); assert.ok(!stateBefore.url.includes(secret))
  return { ko,en,fontMinimumPx:16,primaryTouchMinimumPx:44, localeKeepsSourceTextAndCompletedPng:true, nativeUploadFocusRing:true, privateTextStorageUrlNetworkLogs:0 }
},{width:320,dark:true})


const planned = [
  "watermark-single-text-native-png-alpha",
  "watermark-nine-logo-positions-preview-and-output-geometry",
  "watermark-multi-partial-zip-crc-and-stable-names",
  "watermark-invalid-limits-and-retained-logo",
  "watermark-native-slot-pause-resume-failed-only-retry",
  "watermark-stale-canvas-reset-remove-and-unmount",
  "watermark-zip-snapshot-and-late-download",
  "watermark-320-dark-ko-en-and-private-inputs"
]
const productCasesReady = true
if (only === '--list') console.log(planned.join('\n'))
else {
  assert.ok(productCasesReady, 'Parent final ready and translation signal pending; Chrome was not started')
  const selected = cases.filter(item => !only || only.split(',').some(part => item.name.includes(part))); assert.ok(selected.length, 'No selected cases')
  mkdirSync(out, { recursive: true }); const browser = await chromium.launch({ channel: 'chrome' })
  try { for (const scenario of selected) await run(browser, scenario) }
  finally { await browser.close(); const merged = readdirSync(out).filter(name => name.endsWith('-evidence.json')).map(name => JSON.parse(readFileSync(resolve(out, name), 'utf8'))); const final = { checkedAt: new Date().toISOString(), passed: merged.filter(item => item.status === 'pass').length, failed: merged.filter(item => item.status === 'fail').length, browserClosed: true, results: merged }; writeFileSync(resolve(out, 'final-results.json'), JSON.stringify(final, null, 2)); console.log(JSON.stringify({ passed: final.passed, failed: final.failed, browserClosed: true })) }
  if (results.some(item => item.status !== 'pass')) process.exitCode = 1
}
