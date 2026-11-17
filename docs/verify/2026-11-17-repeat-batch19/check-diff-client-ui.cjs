const assert=require('node:assert/strict')
const {componentHarness}=require('./component-harness.cjs')
const flush=async h=>{await new Promise(resolve=>setImmediate(resolve));h.render()}
let groups=0
async function check(name,run){await run();groups++;console.log(`PASS ${name}`)}
;(async()=>{
  const {createLineDiffClient}=await import('../../../src/lib/diff/client.ts'),protocol=await import('../../../src/lib/diff/protocol.ts'),{compareTextLines}=await import('../../../src/utils/lineDiff.ts')
  async function fixture({unsupported=false,parent=false}={}){
    const workers=[]
    const h=await componentHarness(parent?'src/components/DiffViewer.tsx':'src/components/TextDiffWorkspace.tsx',{modules:{
      '@/components/MobileResultLink':{__esModule:true,default:'MobileResultLink'},
      '@/lib/diff/protocol':protocol,
      '@/lib/diff/client':{createLineDiffClient:()=>createLineDiffClient({createWorker:()=>{
        if(unsupported)throw new protocol.DiffExecutionError('unsupported')
        const worker={onmessage:null,onerror:null,onmessageerror:null,posted:null,terminated:0,postMessage(request){this.posted=request},terminate(){this.terminated++}};workers.push(worker);return worker
      }})},
    }});h.render()
    return{h,workers,edit(side,value){h.find(node=>node.props.id===`diff-${side}`).props.onChange({target:{value}});h.render()},compare(){h.button('actions.compare').props.onClick();h.render()}}
  }
  await check('Actual client protocol errors surface distinctly and preserve the previous result and current drafts',async()=>{
    const f=await fixture(),{h,workers}=f;f.edit('left','left current');f.edit('right','right current');f.compare()
    const worker=workers[0],id=worker.posted.id
    worker.onmessage({data:{id:id+1,ok:true,result:compareTextLines('wrong','wrong')}});await flush(h);assert.match(h.text(),/workspace.running/)
    worker.onmessage({data:{id,ok:true,result:{lines:[],summary:{added:99,removed:0,unchanged:0}}}});await flush(h)
    assert.match(h.text(),/workspace.errors.invalidResponse/);assert.match(h.text(),/workspace.exampleNotice/);assert.match(h.text(),/workspace.stale/)
    assert.equal(h.find(node=>node.props.id==='diff-left').props.value,'left current');assert.equal(worker.terminated,1)
    f.compare();const retry=workers[1];retry.onmessage({data:{id:retry.posted.id,ok:true,result:compareTextLines(retry.posted.left,retry.posted.right)}});await flush(h)
    assert.ok(!h.text().includes('workspace.errors.'));assert.ok(!h.text().includes('workspace.exampleNotice'));h.cleanup()
  })
  await check('Actual client and UI jointly ignore terminated worker callbacks during a later request and after cancel',async()=>{
    const f=await fixture(),{h,workers}=f;f.compare();const old=workers[0],lateMessage=old.onmessage,lateError=old.onerror
    f.edit('left','new draft');f.compare();const active=workers[1]
    lateMessage({data:{id:old.posted.id,ok:true,result:compareTextLines('obsolete','obsolete')}});lateError({preventDefault(){}});await flush(h)
    assert.match(h.text(),/workspace.running/);assert.ok(!h.text().includes('obsolete'));assert.ok(!h.text().includes('workspace.errors.'))
    const lateActive=active.onmessage;h.button('workspace.cancel').props.onClick();h.render()
    lateActive({data:{id:active.posted.id,ok:false,error:'tooComplex'}});await flush(h)
    assert.match(h.text(),/workspace.canceled/);assert.ok(!h.text().includes('workspace.errors.'));assert.equal(old.terminated,1);assert.equal(active.terminated,1);h.cleanup()
  })
  await check('Unsupported Worker is an explicit failure and does not discard or replace input with an empty result',async()=>{
    const f=await fixture({unsupported:true}),{h}=f;f.edit('left','보존할 원문');f.compare();await flush(h)
    assert.match(h.text(),/workspace.errors.unsupported/);assert.equal(h.find(node=>node.props.id==='diff-left').props.value,'보존할 원문');assert.match(h.text(),/workspace.exampleNotice/);assert.ok(!h.text().includes('workspace.bothEmpty'));h.cleanup()
  })
  await check('Route-facing DiffViewer mounts the new workspace without a second comparison engine',async()=>{
    const {h}=await fixture({parent:true})
    assert.equal(h.all().filter(node=>typeof node.type==='function'&&node.type.name==='TextDiffWorkspace').length,1)
    assert.equal(h.all().filter(node=>node.type==='textarea').length,0);h.cleanup()
  })
  console.log(`Independent diff real client/UI integration: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
