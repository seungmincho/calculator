import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PNG } from 'pngjs'
import { syntheticPng, coverOracle, pngPixel, withExifOrientation, observeAspectNativeIo } from '../docs/verify/2026-11-17-repeat-batch37/browser-fixtures.mjs'




// Independent real-browser checks. --list never starts Chrome; case-name filters
// preserve previous evidence so only changed boundaries need to be rerun.
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3039'
const out = resolve('docs/verify/2026-11-17-repeat-batch37/browser')
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
  const context = await browser.newContext({ viewport: { width: options.width ?? 1280, height: 900 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'], acceptDownloads: true })
  const errors = [], hydration = [], external = [], consoleErrors = [], network = [], logs = []
  await context.addInitScript(options => {
    if (!/^https?:$/.test(location.protocol)) return
    if (!localStorage.getItem('__batch37Seeded')) { localStorage.setItem('language', options.language ?? 'ko'); localStorage.setItem('theme', options.dark ? 'dark' : 'light'); localStorage.setItem('__batch37Seeded', '1') }
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
  try { detail = await fn({ page, context, open, network, logs }) ?? {}; assert.deepEqual(errors, [], 'JS page errors'); assert.deepEqual(hydration, [], 'Hydration errors'); assert.deepEqual(consoleErrors.filter(value=>/ErrorBoundary|NotFoundError|The above error occurred/i.test(value)),[],'React caught runtime errors'); for (const active of context.pages()) assert.deepEqual(await active.evaluate(() => window.__unhandled), [], 'Unhandled rejections'); assert.ok(!/\b(?:aspectRatio|shareResult)\.[a-zA-Z][\w.]+/.test(await page.locator('body').innerText()), 'Raw translation key') }
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



const imagePanel = page => page.locator('[data-aspect-image-panel]')
const imageFile = page => page.locator('[data-aspect-image-file]')
const imageExport = page => page.locator('[data-aspect-image-download]')
const ready = page => page.locator('[data-aspect-ready="true"]').waitFor()
async function upload(page,buffer,name='synthetic.png',mimeType='image/png') { await imageFile(page).setInputFiles({name,mimeType,buffer}); await poll(async()=>await imagePanel(page).getAttribute('data-aspect-image-source')===name,'Committed source'); await preview(page) }
async function preview(page) { await poll(async()=>await page.locator('[data-aspect-image-preview] canvas').count()===1,'Current preview canvas') }
async function outputPng(page,filename,action=()=>imageExport(page).click()) { const result=await download(page,action,filename); const png=PNG.sync.read(result.bytes); return {...result,png} }
async function previewPng(page) { const base64=await page.locator('[data-aspect-image-preview] canvas').evaluate(canvas=>canvas.toDataURL('image/png').split(',')[1]); return PNG.sync.read(Buffer.from(base64,'base64')) }
async function dimensions(page,width,height) { if(await page.locator('[data-aspect-lock]').getAttribute('aria-pressed')==='true')await page.locator('[data-aspect-lock]').click(); await page.locator('#ar-w').fill(String(width)); await page.locator('#ar-h').fill(String(height)) }
function checkColors(actual,source,width,height,x,y) { const rectangle=coverOracle(source.width,source.height,width,height,x,y); for(const [fx,fy] of [[.21,.22],[.71,.72]]) {const ax=Math.floor(actual.width*fx),ay=Math.floor(actual.height*fy), sx=Math.floor(rectangle.x+(ax+.5)/actual.width*rectangle.width),sy=Math.floor(rectangle.y+(ay+.5)/actual.height*rectangle.height); assert.deepEqual(pngPixel(actual,ax,ay),pngPixel(source,sx,sy))} }

test('aspect-finite-url-preset-and-lock-regression', async ({page,context,open}) => {
  await observeAspectNativeIo(context); await open('aspect-ratio','?w=1080&h=1920&lock=1&zone=reels&keep=yes#fixture'); await ready(page); assert.equal(await page.locator('#ar-w').inputValue(),'1080'); assert.equal(await page.locator('#ar-h').inputValue(),'1920'); assert.equal(new URL(page.url()).searchParams.get('keep'),'yes')
  await page.locator('#ar-w').fill('540'); assert.equal(await page.locator('#ar-h').inputValue(),'960'); await poll(()=>new URL(page.url()).searchParams.get('w')==='540','Debounced URL write'); await page.locator('[data-aspect-swap]').click(); assert.equal(await page.locator('#ar-w').inputValue(),'960'); assert.equal(await page.locator('#ar-h').inputValue(),'540')
  await page.locator('[data-aspect-custom-ratio]').fill('1e309:1'); assert.equal(await page.locator('[data-aspect-apply-ratio]').isDisabled(),true); await page.locator('[data-aspect-custom-ratio]').fill('4:3'); await page.locator('[data-aspect-apply-ratio]').click(); assert.equal(await page.locator('#ar-w').inputValue(),'720'); assert.equal(await page.locator('#ar-h').inputValue(),'540'); await page.locator('#ar-tw').fill('400'); assert.equal(await page.locator('[data-aspect-copy="resize"]').innerText(),'400×300')
  await open('aspect-ratio','?w=Infinity&h=0&keep=bad#preserve'); await ready(page); const bad=page.url(); await wait(350); assert.equal(page.url(),bad); assert.equal(await page.locator('[data-aspect-copy="size"]').count(),0)
  await dimensions(page,16000000,1); await page.locator('[data-aspect-custom-ratio]').fill('16000000:0.5'); assert.equal(await page.locator('[data-aspect-apply-ratio]').isDisabled(),true)
  await page.getByRole('button',{name:new RegExp(tr('aspectRatio','platforms.items.youtubeThumb'))}).click(); assert.equal(await page.locator('#ar-w').inputValue(),'1280'); assert.equal(await page.locator('#ar-h').inputValue(),'720'); return {initialURL1080x1920:true,lock540x960:true,swapAndResize400x300:true,invalidURLUnchanged:true,finiteCustomBounds:true,preset1280x720:true}
})

test('aspect-native-nine-position-png-and-preview', async ({page,context,open}) => {
  await observeAspectNativeIo(context); await open('aspect-ratio','?w=120&h=120'); await ready(page); const source=PNG.sync.read(syntheticPng()); await upload(page,syntheticPng()); const positions=[]
  for(let index=0;index<9;index++){const button=page.locator('[data-aspect-crop-position]').nth(index); await button.click(); await preview(page); const x=Number(await imagePanel(page).getAttribute('data-aspect-image-x')), y=Number(await imagePanel(page).getAttribute('data-aspect-image-y')); const output=await outputPng(page,`nine-position-${index}.png`); assert.deepEqual([output.png.width,output.png.height],[120,120]); checkColors(output.png,source,120,120,x,y); const shown=await previewPng(page); checkColors(shown,source,120,120,x,y); positions.push({id:await button.getAttribute('data-aspect-crop-position'),x,y,bytes:output.bytes.length})}
  assert.equal(await page.locator('[data-aspect-crop-axis="y"]').isDisabled(),true); assert.equal(await page.locator('[data-aspect-crop-axis="x"]').isDisabled(),false)
  await page.locator('[data-aspect-crop-axis="x"]').press('Home'); for(let step=0;step<37;step++)await page.locator('[data-aspect-crop-axis="x"]').press('ArrowRight'); await preview(page); const arbitrary=await outputPng(page,'arbitrary-37-percent.png'); checkColors(arbitrary.png,source,120,120,37,100)
  const tall=syntheticPng(120,240),tallSource=PNG.sync.read(tall); await upload(page,tall,'tall.png'); for(const index of [0,4,8]) {await page.locator('[data-aspect-crop-position]').nth(index).click(); await preview(page); const y=Number(await imagePanel(page).getAttribute('data-aspect-image-y')); const result=await outputPng(page,`vertical-${index}.png`); checkColors(result.png,tallSource,120,120,50,y)}
  const box=await page.locator('[data-aspect-image-frame]').boundingBox(); assert.ok(Math.abs(box.width/box.height-1)<.02); return {ninePositions:positions,wideUniqueCrops:3,verticalSamples:3,arbitrarySliderPercent:37,nativeCanvasPreviewAndPngOracle:true,frameSquare:true,sourceSize:[240,120],outputSize:[120,120]}
})

test('aspect-native-pad-alpha-and-limited-output', async ({page,context,open}) => {
  await observeAspectNativeIo(context); await open('aspect-ratio','?w=120&h=120'); await ready(page); await upload(page,syntheticPng(240,120,128),'alpha.png'); const crop=await outputPng(page,'alpha-crop.png'); assert.equal(pngPixel(crop.png,20,20)[3],128)
  await page.locator('[data-aspect-image-fit="pad"]').click(); await preview(page); const black=await outputPng(page,'pad-black.png'); assert.deepEqual(pngPixel(black.png,60,5),[0,0,0,255]); await page.locator('[data-aspect-image-pad="#ffffff"]').click(); await preview(page); const white=await outputPng(page,'pad-white.png'); assert.deepEqual(pngPixel(white.png,60,5),[255,255,255,255]); assert.equal(pngPixel(white.png,60,60)[3],255)
  await page.locator('[data-aspect-image-fit="crop"]').click(); await dimensions(page,8192,8192); await preview(page); const limited=await outputPng(page,'limited-4000-square.png'); assert.deepEqual([limited.png.width,limited.png.height],[4000,4000]); assert.match(await page.locator('[data-aspect-image-output]').innerText(),/4000.*4000/)
  await dimensions(page,108,192); await page.locator('[data-aspect-zone="reels"]').click(); await preview(page); const safeZone=await outputPng(page,'safe-zone-not-baked.png'); const original=PNG.sync.read(syntheticPng(240,120,128)); assert.equal(pngPixel(safeZone.png,10,10)[3],128); assert.equal(original.data[3],128)
  await dimensions(page,1,16000000); await page.locator('[data-aspect-image-error="tooThin"]').waitFor(); assert.equal(await imageExport(page).count(),0)
  return {pngAlpha128Preserved:true,padBlackWhiteOpaque:true,requested:[8192,8192],actualLimited:[4000,4000],actualPixels:16000000,limitedPngBytes:limited.bytes.length,safeZoneNotBaked:true,zeroSideAfterScalingRefused:true}
})

test('aspect-input-limits-exif-and-failed-replacement', async ({page,context,open}) => {
  await observeAspectNativeIo(context); await open('aspect-ratio','?w=120&h=120'); await ready(page); await upload(page,syntheticPng(),'baseline.png'); await page.locator('[data-aspect-crop-position]').last().click(); await preview(page)
  const before=await page.evaluate(()=>({reads:window.__aspectReads.length,decodes:window.__aspectDecodes.length})); await imageFile(page).setInputFiles({name:'oversize.png',mimeType:'image/png',buffer:Buffer.alloc(8*1024*1024+1)}); await page.locator('[data-aspect-image-error]').waitFor(); assert.equal(await imagePanel(page).getAttribute('data-aspect-image-source'),'baseline.png'); assert.equal(await imagePanel(page).getAttribute('data-aspect-image-x'),'100'); assert.equal(await page.evaluate(()=>window.__aspectReads.length),before.reads)
  const huge=Buffer.from(syntheticPng()); huge.writeUInt32BE(4001,16); huge.writeUInt32BE(4000,20); await imageFile(page).setInputFiles({name:'oversize-header.png',mimeType:'image/png',buffer:huge}); await page.locator('[data-aspect-image-error="dimensions"]').waitFor(); assert.equal(await page.evaluate(()=>window.__aspectDecodes.length),before.decodes)
  await imageFile(page).setInputFiles({name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<svg></svg>')}); await page.locator('[data-aspect-image-error]').waitFor(); assert.equal(await imagePanel(page).getAttribute('data-aspect-image-source'),'baseline.png')
  const invalidPng=Buffer.from(syntheticPng());invalidPng[25]=7;await imageFile(page).setInputFiles({name:'invalid-color-type.png',mimeType:'image/png',buffer:invalidPng}); await page.locator('[data-aspect-image-error="decode"]').waitFor(); assert.equal(await imagePanel(page).getAttribute('data-aspect-image-source'),'baseline.png'); assert.equal(await imagePanel(page).getAttribute('data-aspect-image-x'),'100')
  const exact=Buffer.alloc(8*1024*1024); syntheticPng().copy(exact); await upload(page,exact,'exact-8MiB.png'); assert.equal(await imagePanel(page).getAttribute('data-aspect-image-x'),'50')
  await upload(page,syntheticPng(4000,4000),'exact-16MP.png'); assert.deepEqual(await page.evaluate(()=>[window.__aspectDecodes.at(-1).width,window.__aspectDecodes.at(-1).height]),[4000,4000])
  const jpeg=Buffer.from(await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=40;const ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,40,40);ctx.fillStyle='#00ff00';ctx.fillRect(40,0,40,40);return [...new Uint8Array(await (await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',1))).arrayBuffer())]})); await upload(page,withExifOrientation(jpeg),'oriented.jpg','image/jpeg'); await page.locator('[data-aspect-image-use-size]').click(); await preview(page); assert.equal(await page.locator('#ar-w').inputValue(),'40'); assert.equal(await page.locator('#ar-h').inputValue(),'80'); const exif=await download(page,()=>imageExport(page).click(),'exif-oriented.jpg'); assert.equal(exif.bytes.readUInt16BE(0),0xffd8)
  const decoded=await page.evaluate(async bytes=>{const b=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/jpeg'}));const c=document.createElement('canvas');c.width=b.width;c.height=b.height;const ctx=c.getContext('2d');ctx.drawImage(b,0,0);const data={width:b.width,height:b.height,top:[...ctx.getImageData(20,10,1,1).data],bottom:[...ctx.getImageData(20,70,1,1).data]};b.close();return data},[...exif.bytes]); assert.deepEqual([decoded.width,decoded.height],[40,80]); assert.ok(decoded.top[0]>240&&decoded.top[1]<15&&decoded.bottom[1]>240&&decoded.bottom[0]<15)
  return {oversizeBeforeRead:true,over16MpHeaderBeforeDecode:true,invalidReplacementRetainsSourceAndPosition:true,exact8MiBAccepted:true,actual16MpInputDecoded:true,exifNativeDecodedDimensions:[40,80],jpegOutputBytes:exif.bytes.length,exifPixelOrientation:true}
})

test('aspect-late-read-decode-clear-and-unmount', async ({page,context,open}) => {
  await observeAspectNativeIo(context); await open('aspect-ratio','?w=120&h=120'); await ready(page); await upload(page,syntheticPng(),'base.png'); await page.evaluate(()=>window.__aspectReadModes['held.png']='hold'); await imageFile(page).setInputFiles({name:'held.png',mimeType:'image/png',buffer:syntheticPng()}); await poll(async()=>await page.evaluate(()=>window.__aspectHeld.some(item=>item.type==='read')),'Native read delivery held'); await imageFile(page).setInputFiles({name:'latest.png',mimeType:'image/png',buffer:syntheticPng(120,240)}); assert.equal(await page.evaluate(()=>window.__aspectReads.some(item=>item.name==='latest.png')),false); await page.evaluate(()=>window.__releaseAspect('read')); await poll(async()=>await imagePanel(page).getAttribute('data-aspect-image-source')==='latest.png','Only latest source commits'); await preview(page)
  await page.evaluate(()=>window.__aspectDecodeMode='hold'); await imageFile(page).setInputFiles({name:'decode-held.png',mimeType:'image/png',buffer:syntheticPng()}); await poll(async()=>await page.evaluate(()=>window.__aspectHeld.some(item=>item.type==='decode')),'Native decode held'); await page.locator('[data-aspect-image-clear]').click(); await page.evaluate(()=>{window.__aspectDecodeMode='native';window.__releaseAspect('decode')}); await poll(async()=>await page.evaluate(()=>window.__aspectDecodes.at(-1).closed===1),'Canceled native bitmap released'); assert.equal(await imagePanel(page).getAttribute('data-aspect-image-source'),''); assert.equal(await page.locator('#ar-w').inputValue(),'120')
  await upload(page,syntheticPng(),'last.png'); await page.evaluate(()=>window.__aspectEncodeMode='hold'); await imageExport(page).click(); await poll(async()=>await page.evaluate(()=>window.__aspectHeld.some(item=>item.type==='encode')),'Export held before unmount'); const downloads=[];page.on('download',event=>downloads.push(event.suggestedFilename())); await page.locator('header a[href="/"]').first().click(); await imagePanel(page).waitFor({state:'detached'}); await page.goBack({waitUntil:'domcontentloaded'}); await ready(page); assert.equal(await page.evaluate(()=>window.__aspectActiveEncode),1); await imageFile(page).setInputFiles({name:'after-remount.png',mimeType:'image/png',buffer:syntheticPng()}); await page.locator('[data-aspect-image-status="loading"]').waitFor(); assert.equal(await page.evaluate(()=>window.__aspectReads.some(item=>item.name==='after-remount.png')),false); await page.evaluate(()=>{window.__aspectEncodeMode='native';window.__releaseAspect('encode')}); await poll(async()=>await page.evaluate(()=>window.__aspectActiveEncode===0),'Native encode delivery released'); await poll(async()=>await imagePanel(page).getAttribute('data-aspect-image-source')==='after-remount.png','Remounted source starts after previous physical work'); await preview(page); assert.equal(downloads.length,0)
  return {supersededQueuedReadIO:0,latestSourceOnly:true,clearDisposesLateBitmap:true,clearPreservesDimensions:true,nativeLateExportAfterSpaUnmountDownloads:0,remountedAdapterReadBeforePreviousPhysicalCompletion:0}
})

test('aspect-native-encoder-physical-gate-and-retry', async ({page,context,open}) => {
  await observeAspectNativeIo(context); await open('aspect-ratio','?w=120&h=120'); await ready(page); await upload(page,syntheticPng()); const downloads=[];page.on('download',event=>downloads.push(event.suggestedFilename())); await page.evaluate(()=>window.__aspectEncodeMode='hold'); await imageExport(page).click(); await poll(async()=>await page.evaluate(()=>window.__aspectHeld.some(item=>item.type==='encode')),'First actual encoder callback held'); await page.locator('[data-aspect-crop-position]').first().click(); await imageExport(page).click(); assert.equal(await page.evaluate(()=>window.__aspectEncodes.length),1); await page.evaluate(()=>{window.__aspectEncodeMode='native';window.__releaseAspect('encode')}); await poll(async()=>downloads.length===1,'Only newest output downloads'); assert.equal(await page.evaluate(()=>window.__aspectMaxEncode),1); await preview(page)
  await page.evaluate(()=>window.__aspectEncodeMode='null'); await imageExport(page).click(); await page.locator('[data-aspect-image-retry="export"]').waitFor(); assert.equal(downloads.length,1); await page.evaluate(()=>window.__aspectEncodeMode='native'); const retried=await outputPng(page,'encoder-retry.png',()=>page.locator('[data-aspect-image-retry="export"]').click()); assert.deepEqual([retried.png.width,retried.png.height],[120,120]); await poll(async()=>await page.evaluate(()=>window.__aspectUrls.filter(item=>item.type==='image/png').every(item=>item.revoked)),'Owned output URLs revoked')
  return {actualToBlobCalls:await page.evaluate(()=>window.__aspectEncodes.length),maximumConcurrentNativeDelivery:1,staleDownloadSuppressed:true,nullBlobFailedWithoutDownload:true,retryNativePngBytes:retried.bytes.length,ownedBlobUrlsRevoked:true}
})

test('aspect-copy-recovery-aba-and-stale', async ({page,context,open}) => {
  await observeAspectNativeIo(context); await observeDecisionPorts(context); await open('aspect-ratio','?w=1920&h=1080'); await ready(page); const size=page.locator('[data-aspect-copy="size"]'),css=page.locator('[data-aspect-copy="css"]'),manual=page.locator('[data-aspect-copy-manual]')
  await size.click(); assert.equal(await page.evaluate(()=>window.__nativeClipboardRead()),'1920×1080'); await page.evaluate(()=>window.__setClipboardMode('absent')); await css.click(); await manual.waitFor(); assert.equal(await manual.inputValue(),'aspect-ratio: 16 / 9;'); await page.locator('[data-aspect-copy-select]').click(); assert.deepEqual(await manual.evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,'aspect-ratio: 16 / 9;'.length]); await page.evaluate(()=>window.__setClipboardMode('native')); await page.locator('[data-aspect-copy-retry]').click(); await poll(async()=>await manual.count()===0,'Native retry clears manual')
  await page.evaluate(()=>window.__setClipboardMode('hold')); await size.click(); await poll(async()=>await page.evaluate(()=>window.__clipboardPending.length)===1,'Size pending'); await page.evaluate(()=>window.__setClipboardMode('native')); await css.click(); await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old size'))); await wait(50); assert.equal(await page.evaluate(()=>window.__legacyCalls.length),1)
  const share=page.locator('[data-share-result] [data-share-action="copy"]'); await page.evaluate(()=>window.__setClipboardMode('hold')); await size.click(); await poll(async()=>await page.evaluate(()=>window.__clipboardPending.length)===1,'Parent pending before shared copy'); await page.evaluate(()=>window.__setClipboardMode('native')); await share.click(); await poll(async()=>await page.evaluate(()=>window.__nativeClipboardRead())===page.url(),'Shared native copy completed'); await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old parent'))); await wait(50); assert.equal(await page.evaluate(()=>window.__legacyCalls.length),1)
  await page.evaluate(()=>window.__setClipboardMode('hold')); await share.click(); await poll(async()=>await page.evaluate(()=>window.__clipboardPending.length)===1,'Shared pending before parent copy'); await page.evaluate(()=>window.__setClipboardMode('native')); await css.click(); await poll(async()=>await css.getAttribute('data-aspect-copied')==='true','Latest parent copy completed'); await page.evaluate(()=>window.__clipboardPending.shift().reject(new Error('old shared'))); await wait(50); assert.equal(await page.evaluate(()=>window.__legacyCalls.length),1); assert.equal(await page.locator('[data-share-recovery]').count(),0)
  await page.locator('#ar-w').fill('1921'); await page.locator('#ar-w').fill('1920'); assert.equal(await page.locator('[data-aspect-copied="true"]').count(),0); await page.evaluate(()=>window.__setClipboardMode('reject')); await size.click(); await manual.waitFor(); await changeLanguage(page,'en'); await changeLanguage(page,'ko'); assert.equal(await manual.count(),0)
  return {nativeSizeCopy:true,manualCssExact:true,selectionAndNativeRetry:true,crossCopyOldFallbacks:0,parentSharedBidirectionalOldFallbacks:0,inputAndLocaleABANoRevival:true}
})

test('aspect-320-dark-ko-en', async ({page,context,open}) => {
  await observeAspectNativeIo(context); await observeDecisionPorts(context); await open('aspect-ratio','?w=108&h=192'); await ready(page); await upload(page,syntheticPng()); await page.locator('[data-aspect-crop-position]').first().click(); await preview(page)
  const controls=[page.locator('[data-aspect-image-pick]'),page.locator('[data-aspect-image-clear]'),page.locator('[data-aspect-crop-position]').first(),imageExport(page)],fields=[page.locator('#ar-w'),page.locator('#ar-h'),page.locator('[data-aspect-custom-ratio]')]; const ko=await mobile(page,fields,controls); const frame=await page.locator('[data-aspect-image-frame]').boundingBox(); assert.ok(Math.abs(frame.width/frame.height-108/192)<.02); await screenshot(page,'aspect-320-ko',imagePanel(page))
  await changeLanguage(page,'en'); await preview(page); const en=await mobile(page,fields,controls); assert.equal(await imagePanel(page).getAttribute('data-aspect-image-x'),'0'); await screenshot(page,'aspect-320-en',page.locator('[data-aspect-crop-controls]')); await dimensions(page,1,8192); await preview(page); const extreme=await page.locator('[data-aspect-image-frame]').boundingBox(), bounds=await page.locator('[data-aspect-preview-bounds]').boundingBox(); assert.ok(extreme.height<=bounds.height+1&&extreme.width<=bounds.width+1); await page.evaluate(()=>window.__setClipboardMode('reject')); await page.locator('[data-aspect-copy="size"]').click(); await page.locator('[data-aspect-copy-recovery]').waitFor(); await mobile(page,[page.locator('[data-aspect-copy-manual]')],[page.locator('[data-aspect-copy-retry]')]); return {ko,en,portraitFrameRatio:frame.width/frame.height,extreme1x8192Frame:{width:extreme.width,height:extreme.height},localePreservesSourcePosition:true,fieldsAtLeast16:true,controlsAtLeast44:true}
},{width:320,dark:true})

// Execution is enabled only after author and canonical integration readiness.
const planned = [
  "aspect-finite-url-preset-and-lock-regression",
  "aspect-native-nine-position-png-and-preview",
  "aspect-native-pad-alpha-and-limited-output",
  "aspect-input-limits-exif-and-failed-replacement",
  "aspect-late-read-decode-clear-and-unmount",
  "aspect-native-encoder-physical-gate-and-retry",
  "aspect-copy-recovery-aba-and-stale",
  "aspect-320-dark-ko-en"
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
