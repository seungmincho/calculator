import assert from 'node:assert/strict'
import JSZip from 'jszip'
import { createImageConversionQueue, imageConversionKey, type ConversionOutput, type ConversionSnapshot } from '../src/utils/imageConversionQueue.ts'
import { createImageConversionImports } from '../src/utils/imageConversionImports.ts'
import { captureImageConversionZip, createImageConversionZip, imageConversionSettingsUrl } from '../src/utils/imageConversionActions.ts'
import { DEFAULTS, MAX_FILE, type ConvertOptions } from '../src/utils/imageConvert.ts'

const file = (name: string) => new File([name], name, { type: 'image/png' })
const entry = (id: string, name = `${id}.png`) => ({ id, file: file(name), src: 'png' as const })
const output = (id: string): ConversionOutput => ({ blob: new Blob([id]), url: `blob:${id}`, width: 2, height: 2, srcWidth: 2, srcHeight: 2, downscaled: false })
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
function harness() {
  const calls: { file: File; options: ConvertOptions; task: ReturnType<typeof deferred<ConversionOutput>> }[] = []
  const released: string[] = [], changes: ConversionSnapshot[] = [], timers: { callback: () => void; canceled: boolean }[] = []
  let active = 0, maximum = 0
  const queue = createImageConversionQueue({ options: DEFAULTS,
    process(input, options) { active++; maximum=Math.max(active,maximum); const task=deferred<ConversionOutput>(); calls.push({file:input,options,task}); return task.promise.finally(()=>{active--}) },
    release(value) { released.push(value.url) }, onChange(value) { changes.push(value) },
    schedule(callback) { timers.push({callback,canceled:false}); return 1 }, cancel() { if(timers.length)timers.at(-1)!.canceled=true },
  })
  return { queue,calls,released,changes,timers,maximum:()=>maximum }
}
let groups = 0
async function check(name: string, run: () => void | Promise<void>) { await run(); groups++; console.log('PASS', name) }

await check('single live process and detached immutable success/options snapshots', async () => {
  const h=harness();h.queue.add([entry('a'),entry('b')]);await flush();assert.equal(h.calls.length,1)
  const source=output('a');h.calls[0].task.resolve(source);await flush();assert.equal(h.calls.length,2)
  const first=h.queue.getSnapshot();assert.ok(Object.isFrozen(first.items[0].lastSuccess));assert.ok(Object.isFrozen(first.items[0].lastSuccess!.output));assert.ok(Object.isFrozen(first.items[0].lastSuccess!.options))
  h.calls[1].task.resolve(output('b'));await flush();assert.equal(h.maximum(),1);assert.equal(first.items[1].status,'processing');assert.equal(h.queue.getSnapshot().items[1].status,'done')
  h.queue.setOptions({...DEFAULTS});h.queue.retryFailed();await flush();assert.equal(h.calls.length,2);h.queue.dispose();assert.deepEqual(h.released,['blob:a','blob:b'])
})
await check('pause accepts current success and stops next; resume does not overlap while draining', async () => {
  const h=harness();h.queue.add([entry('a'),entry('b')]);await flush();h.queue.pause();assert.equal(h.queue.getSnapshot().phase,'finishing');h.queue.resume();h.queue.pause();await flush();assert.equal(h.calls.length,1)
  h.calls[0].task.resolve(output('a'));await flush();assert.equal(h.queue.getSnapshot().items[0].status,'done');assert.equal(h.queue.getSnapshot().phase,'paused');assert.equal(h.calls.length,1)
  h.queue.resume();await flush();assert.equal(h.calls.length,2);h.calls[1].task.resolve(output('b'));await flush();assert.equal(h.maximum(),1);h.queue.dispose()
})
await check('last success survives new settings and failure, next success alone replaces its URL', async () => {
  const h=harness();h.queue.add([entry('a')]);await flush();h.calls[0].task.resolve(output('first'));await flush();const previous=h.queue.getSnapshot().items[0].lastSuccess
  h.queue.setOptions({...DEFAULTS,format:'png'},0);await flush();assert.equal(h.queue.getSnapshot().items[0].lastSuccess,previous);assert.equal(h.released.length,0)
  h.calls[1].task.reject(Error('encode'));await flush();assert.equal(h.queue.getSnapshot().items[0].status,'error');assert.equal(h.queue.getSnapshot().items[0].lastSuccess,previous);assert.equal(captureImageConversionZip(h.queue.getSnapshot()).entries.length,0)
  h.queue.retryFailed();await flush();h.calls[2].task.resolve(output('second'));await flush();assert.deepEqual(h.released,['blob:first']);assert.equal(h.queue.getSnapshot().items[0].lastSuccess!.options.format,'png');h.queue.dispose();assert.deepEqual(h.released,['blob:first','blob:second'])
})
await check('adding does not retry failure; retry selects current failures and paused settings stay paused', async () => {
  const h=harness();h.queue.add([entry('a')]);await flush();h.calls[0].task.reject(Error('decode'));await flush();h.queue.add([entry('b')]);await flush();assert.equal(h.calls[1].file.name,'b.png');h.calls[1].task.resolve(output('b'));await flush();assert.equal(h.calls.length,2)
  h.queue.pause();h.queue.retryFailed();await flush();assert.equal(h.calls.length,2);assert.equal(h.queue.getSnapshot().items[0].status,'pending');h.queue.add([entry('c')]);h.queue.setOptions({...DEFAULTS,quality:70},0);await flush();assert.equal(h.queue.getSnapshot().paused,true);assert.equal(h.calls.length,2);h.queue.resume();await flush();assert.equal(h.calls[2].options.quality,70);h.queue.dispose();h.calls[2].task.resolve(output('late'));await flush()
})
await check('draft key is immediate; debounce owns its ticket despite timer ID reuse and settings ABA', async () => {
  const h=harness();h.queue.add([entry('a')]);await flush();h.queue.setOptions({...DEFAULTS,format:'png'});const old=h.timers[0];assert.equal(h.queue.getSnapshot().key,'png|85|#ffffff');assert.equal(h.queue.getSnapshot().settling,true);h.queue.retryFailed();h.queue.setOptions({...DEFAULTS});const current=h.timers[1];old.callback();assert.equal(h.queue.getSnapshot().settling,true);current.callback();assert.equal(h.queue.getSnapshot().settling,false);await flush();assert.equal(h.calls.length,1)
  h.calls[0].task.resolve(output('old-ABA'));await flush();assert.deepEqual(h.released,['blob:old-ABA']);assert.equal(h.calls.length,2);assert.equal(h.queue.getSnapshot().items[0].lastSuccess,undefined);h.calls[1].task.resolve(output('current'));await flush();assert.equal(h.maximum(),1);h.queue.dispose()
})
await check('remove/reuse ID and clear/add wait for old process without resurrecting results', async () => {
  const h=harness();h.queue.add([entry('a')]);await flush();h.queue.remove('a');h.queue.add([entry('a','replacement.png')]);await flush();assert.equal(h.calls.length,1);h.calls[0].task.reject(Error('old'));await flush();assert.equal(h.calls[1].file.name,'replacement.png');h.queue.clear();h.queue.add([entry('c')]);await flush();assert.equal(h.calls.length,2);h.calls[1].task.resolve(output('removed'));await flush();assert.equal(h.calls[2].file.name,'c.png');assert.deepEqual(h.released,['blob:removed']);h.calls[2].task.resolve(output('c'));await flush();assert.equal(h.maximum(),1);h.queue.dispose()
})
await check('processing notification reentrancy cannot start removed/paused/disposed work', async () => {
  for(const action of ['pause','remove','clear','dispose'] as const){let calls=0,once=false;
    const queue:ReturnType<typeof createImageConversionQueue>=createImageConversionQueue({options:DEFAULTS,process:async()=>{calls++;return output('unexpected')},release(){},onChange(snapshot){if(!once&&snapshot.items[0]?.status==='processing'){once=true;if(action==='remove')queue.remove('a');else queue[action]()}}})
    queue.add([entry('a')]);await flush();assert.equal(calls,0,action);queue.dispose()
  }
})
await check('release failure cannot erase new success; duplicate add is atomic', async () => {
  const calls: ReturnType<typeof deferred<ConversionOutput>>[]=[]
  const q=createImageConversionQueue({options:DEFAULTS,process(){const task=deferred<ConversionOutput>();calls.push(task);return task.promise},release(){throw Error('blocked cleanup')}})
  q.add([entry('a')]);assert.throws(()=>q.add([entry('b'),entry('a')]),/duplicateImageId/);assert.equal(q.getSnapshot().items.length,1);await flush();calls[0].resolve(output('old'));await flush();q.setOptions({...DEFAULTS,quality:60},0);await flush();calls[1].resolve(output('new'));await flush();assert.equal(q.getSnapshot().items[0].lastSuccess!.output.url,'blob:new');q.dispose()
})
await check('independent header batches preserve within-batch order and name fallback', async () => {
  const reads: {name:string;task:ReturnType<typeof deferred<Uint8Array>>}[]=[], added:string[][]=[]
  const imports=createImageConversionImports({add(rows){added.push(rows.map(row=>`${row.file.name}:${row.src}`))},read(input){const task=deferred<Uint8Array>();reads.push({name:input.name,task});return task.promise}})
  const first=imports.add([file('a.png'),file('b.png')]),second=imports.add([file('c.png')]);assert.equal(imports.getReading(),3)
  reads[2].task.resolve(new Uint8Array([137,80,78,71]));assert.equal((await second).status,'added');reads[1].task.resolve(new Uint8Array([137,80,78,71]));reads[0].task.reject(Error('read denied'));assert.equal((await first).status,'added');assert.deepEqual(added,[['c.png:png'],['a.png:png','b.png:png']]);assert.equal(imports.getReading(),0);imports.dispose()
})
await check('header clear/unmount generations do not cancel a newer batch or add late rows;100MiB acceptance unchanged', async () => {
  const reads: ReturnType<typeof deferred<Uint8Array>>[]=[],added:string[]=[]
  const imports=createImageConversionImports({add(rows){added.push(...rows.map(row=>row.file.name))},read(){const task=deferred<Uint8Array>();reads.push(task);return task.promise}})
  const old=imports.add([file('old.png')]);imports.clear();const fresh=imports.add([file('fresh.png')]);reads[0].resolve(new Uint8Array());assert.equal((await old).status,'stale');assert.equal(imports.getReading(),1);reads[1].resolve(new Uint8Array());assert.equal((await fresh).status,'added');assert.deepEqual(added,['fresh.png'])
  const tooLarge={name:'huge.png',type:'image/png',size:MAX_FILE+1} as File,atLimit={name:'limit.png',type:'image/png',size:MAX_FILE} as File
  const limit=imports.add([tooLarge,atLimit,new File([],'empty.png',{type:'image/png'}),new File(['svg'],'x.svg',{type:'image/svg+xml'})]);assert.equal(reads.length,3);reads[2].resolve(new Uint8Array());assert.deepEqual(await limit,{status:'added',added:1,skipped:3});const last=imports.add([file('unmount.png')]);imports.dispose();reads[3].resolve(new Uint8Array());assert.equal((await last).status,'stale');assert.equal(added.includes('unmount.png'),false)
})
await check('header synchronous clear notification avoids starting reads and commit failure reports failure', async () => {
  let reads=0;
  const imports:ReturnType<typeof createImageConversionImports>=createImageConversionImports({add(){throw Error('not reached')},read:async()=>{reads++;return new Uint8Array()},onChange(count){if(count)imports.clear()}})
  assert.equal((await imports.add([file('x.png')])).status,'stale');assert.equal(reads,0);imports.dispose()
  const failure=createImageConversionImports({add(){throw Error('commit denied')},read:async()=>new Uint8Array()});assert.equal((await failure.add([file('x.png')])).status,'failed');assert.equal(failure.getReading(),0);failure.dispose()
})
await check('current-only ZIP snapshot reserves names and survives source release with exact Blob bytes', async () => {
  const h=harness();h.queue.add([entry('a','a.png'),entry('b','a.png'),entry('c','a (2).png'),entry('d','A.png')]);await flush()
  for(let i=0;i<4;i++){h.calls[i].task.resolve(output(`data-${i}`));await flush()}
  const snapshot=captureImageConversionZip(h.queue.getSnapshot());assert.deepEqual(snapshot.entries.map(row=>row.name),['a.jpg','a (3).jpg','a (2).jpg','A (4).jpg']);assert.ok(Object.isFrozen(snapshot.entries));h.queue.setOptions({...DEFAULTS,quality:60});assert.equal(captureImageConversionZip(h.queue.getSnapshot()).entries.length,0);h.queue.clear();h.queue.dispose()
  const zip=new JSZip();for(const row of snapshot.entries)zip.file(row.name,await row.blob.arrayBuffer());const encoded=await zip.generateAsync({type:'uint8array'});const decoded=await JSZip.loadAsync(encoded)
  for(const [index,row]of snapshot.entries.entries())assert.equal(await decoded.file(row.name)!.async('string'),`data-${index}`)
})
await check('ZIP cancel/resubmit/failure retry and unmount use latest request only', async () => {
  const pending: ReturnType<typeof deferred<Blob>>[]=[],downloads:string[]=[]
  let downloadFails=false
  const zip=createImageConversionZip({encode(){const item=deferred<Blob>();pending.push(item);return item.promise},download(){if(downloadFails)throw Error('download denied');downloads.push('download')}})
  const snapshot={key:imageConversionKey(DEFAULTS),entries:[{id:'a',name:'a.jpg',blob:new Blob(['a'])}]}
  const a=zip.run(snapshot);zip.cancel();pending[0].resolve(new Blob(['old']));assert.equal(await a,'stale');assert.equal(zip.getSnapshot().status,'canceled');assert.equal(downloads.length,0)
  const b=zip.run(snapshot),c=zip.run(snapshot);pending[1].reject(Error('old failure'));assert.equal(await b,'stale');assert.equal(zip.getSnapshot().status,'working');pending[2].reject(Error('ZIP failed'));assert.equal(await c,'failed');assert.equal(zip.getSnapshot().status,'failed')
  downloadFails=true;const d=zip.run(snapshot);pending[3].resolve(new Blob(['ready']));assert.equal(await d,'failed');downloadFails=false;const e=zip.run(snapshot);pending[4].resolve(new Blob(['ready']));assert.equal(await e,'downloaded');assert.equal(downloads.length,1)
  const last=zip.run(snapshot);zip.dispose();pending[5].resolve(new Blob(['late']));assert.equal(await last,'stale');assert.equal(downloads.length,1)
})
await check('owned URL fields preserve unrelated duplicates hash and canonical defaults', () => {
  const href='https://toolhub.ai.kr/image-converter/?foreign=a&f=png&foreign=b&q=30&q=60&bg=000000#keep'
  const url=new URL(imageConversionSettingsUrl(href,{...DEFAULTS,quality:70,bg:'#112233'})!)
  assert.deepEqual(url.searchParams.getAll('foreign'),['a','b']);assert.equal(url.hash,'#keep');assert.equal(url.searchParams.has('f'),false);assert.deepEqual(url.searchParams.getAll('q'),['70']);assert.equal(url.searchParams.get('bg'),'112233')
  const png=new URL(imageConversionSettingsUrl(url.href,{...DEFAULTS,format:'png',quality:70,bg:'#112233'})!);assert.equal(png.searchParams.get('f'),'png');assert.equal(png.searchParams.has('q'),false);assert.equal(png.searchParams.has('bg'),false);assert.equal(imageConversionSettingsUrl('bad-url',DEFAULTS),null)
})
console.log(`Image conversion preparation: ${groups} groups passed`)

