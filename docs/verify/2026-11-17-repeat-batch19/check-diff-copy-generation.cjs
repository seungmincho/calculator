const assert=require('node:assert/strict')
const {componentHarness}=require('./component-harness.cjs')
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve}}
;(async()=>{
  const work=deferred(),copy=deferred();let copiedText=''
  const h=await componentHarness('src/components/TextDiffWorkspace.tsx',{modules:{
    '@/components/MobileResultLink':{__esModule:true,default:'MobileResultLink'},
    '@/lib/diff/client':{createLineDiffClient:()=>({run:()=>work.promise,cancel(){}})},
    '@/lib/diff/clipboard':{copyDiffText:async text=>{copiedText=text;return copy.promise}},
  }});h.render()
  for(const side of ['left','right']){h.find(node=>node.props.id===`diff-${side}`).props.onChange({target:{value:'new result'}});h.render()}
  h.button('actions.compare').props.onClick();h.render()
  h.button('actions.copyDiff').props.onClick();h.render();assert.ok(!copiedText.includes('new result'))
  work.resolve({lines:[{type:'unchanged',content:'new result',left:1,right:1}],summary:{added:0,removed:0,unchanged:1}})
  await new Promise(done=>setImmediate(done));h.render();assert.ok(h.text().includes('new result'))
  copy.resolve('copied');await new Promise(done=>setImmediate(done));h.render()
  assert.ok(!h.text().includes('actions.copied'),'old result copy success must not appear on the newly completed result')
  h.cleanup();console.log('PASS Diff completed-result replacement invalidates an old-result copy')
})().catch(error=>{console.error(error);process.exitCode=1})
