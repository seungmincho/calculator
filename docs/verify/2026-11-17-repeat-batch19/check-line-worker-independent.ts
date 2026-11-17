import assert from 'node:assert/strict'
import {Worker} from 'node:worker_threads'
import {buildSync} from 'esbuild'
import {createLineDiffClient,type DiffWorkerPort} from '../../../src/lib/diff/client.ts'
import {DiffExecutionError,type LineDiffRequest} from '../../../src/lib/diff/protocol.ts'
const compiled=buildSync({entryPoints:['src/lib/diff/lineDiff.worker.ts'],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text
const workerCode=`const {parentPort}=require('node:worker_threads');global.self={postMessage:data=>parentPort.postMessage(data)};${compiled};parentPort.on('message',data=>self.onmessage({data}));`
let created=0,terminated=0,groups=0
function createWorker():DiffWorkerPort{
  created++;const native=new Worker(workerCode,{eval:true});let stopped=false
  const port:DiffWorkerPort={onmessage:null,onerror:null,onmessageerror:null,postMessage:(message:LineDiffRequest)=>native.postMessage(message),terminate(){if(!stopped){stopped=true;terminated++;void native.terminate()}}}
  native.on('message',data=>port.onmessage?.({data} as MessageEvent));native.on('error',()=>port.onerror?.({preventDefault(){}} as ErrorEvent));native.on('messageerror',data=>port.onmessageerror?.({data} as MessageEvent))
  return port
}
async function check(name:string,run:()=>Promise<void>){await run();groups++;console.log(`PASS ${name}`)}
await check('Actual worker module in an isolated Node thread returns exact normalized Unicode rows through the client',async()=>{
  const client=createLineDiffClient({createWorker}),result=await client.run('가\r\n\n끝\n','가\n수정\n끝\n')
  assert.deepEqual(result.lines.filter(row=>row.type!=='added').map(row=>row.content),['가','','끝',''])
  assert.deepEqual(result.lines.filter(row=>row.type!=='removed').map(row=>row.content),['가','수정','끝',''])
  assert.deepEqual(result.summary,{added:1,removed:1,unchanged:3});assert.equal(created,terminated)
})
await check('Worker validation errors remain typed errors rather than empty or identical success',async()=>{
  const client=createLineDiffClient({createWorker})
  await assert.rejects(client.run('가'.repeat(400000),''),error=>error instanceof DiffExecutionError&&error.code==='tooLarge')
  await assert.rejects(client.run(Array.from({length:2000},(_,i)=>`a${i}`).join('\n'),Array.from({length:2000},(_,i)=>`b${i}`).join('\n')),error=>error instanceof DiffExecutionError&&error.code==='tooComplex')
  assert.equal(created,terminated)
})
await check('Superseded running thread cancels once while the latest reply completes and all workers terminate',async()=>{
  const client=createLineDiffClient({createWorker}),old=client.run('old','older');const rejected=assert.rejects(old,error=>error instanceof DiffExecutionError&&error.code==='canceled')
  const latest=client.run('current','current');await rejected;assert.deepEqual((await latest).summary,{added:0,removed:0,unchanged:1})
  client.cancel();assert.equal(created,terminated)
})
console.log(`Independent actual worker module/client: ${groups} groups passed; ${created} isolated threads terminated`)
