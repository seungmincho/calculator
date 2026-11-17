const assert=require('node:assert/strict'),fs=require('node:fs')
const {componentHarness}=require('./component-harness.cjs')
const clone=value=>JSON.parse(JSON.stringify(value)),deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}}
let groups=0
async function check(name,run){if(process.argv[2]&&!name.includes(process.argv[2]))return;await run();groups++;console.log(`PASS ${name}`)}
async function fixture(options={}){
  const readers=[],downloads=[],copyCommands=[],nodes=[];let active=null,selected=null
  class Node extends EventTarget{constructor(tag){super();this.tag=tag;this.style={};this.value='';this.selectionStart=0;this.selectionEnd=0}focus(){active=this}select(){selected=this;this.selectionStart=0;this.selectionEnd=this.value.length}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b}setRangeText(text,a,b){this.value=this.value.slice(0,a)+text+this.value.slice(b)}remove(){this.removed=true}click(){this.clicked=true}}
  class Reader{constructor(){readers.push(this)}readAsText(file){this.file=file;this.kind='text'}readAsDataURL(file){this.file=file;this.kind='image'}abort(){this.aborted=true;if(!options.ignoreAbort)this.onabort?.()}finish(value){this.result=value;this.onload?.()}fail(){this.onerror?.()}}
  const selection={rangeCount:0,getRangeAt:()=>({cloneRange:()=>({})}),removeAllRanges(){selected=null},addRange(range){selected=range.node}}
  const nativeURL=URL
  class FileURL extends nativeURL{static createObjectURL(blob){downloads.push(blob);return`blob:test-${downloads.length}`}static revokeObjectURL(){}}
  const fileInputNode=new Node('input')
  const assignFileRef=node=>{if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(assignFileRef);return}if(node.props&&Object.hasOwn(node.props,'data-markdown-file-input'))node.props.ref.current=fileInputNode;assignFileRef(node.props?.children)}
  const h=await componentHarness('src/components/MarkdownEditor.tsx',{
    beforeEffects:assignFileRef,
    messages:options.messages,storage:options.storage,navigator:options.navigator??{},
    modules:{'@/components/GuideSection':{__esModule:true,default:'GuideSection'},'@/hooks/useFullscreenEscape':{useFullscreenEscape(){}}},
    globals:{FileReader:Reader,HTMLElement:Node,URL:FileURL,...(options.clipboardItem?{ClipboardItem:class{constructor(items){this.items=items}}}:{})},
    window:{matchMedia:()=>({matches:true}),getSelection:()=>selection,confirm:()=>true},
    document:{get activeElement(){return active},body:{appendChild(){},removeChild(node){node.remove()}},createElement(tag){const node=new Node(tag);nodes.push(node);return node},createRange(){return{selectNodeContents(node){this.node=node}}},execCommand(command){if(command==='copy'){copyCommands.push({tag:selected?.tag,value:selected?.value,html:selected?.innerHTML});return options.fallback===true}return false}},
  })
  const editorNode=new Node('textarea')
  function bind(){const editor=h.find(node=>node.type==='textarea'&&node.props.onChange);editorNode.value=editor.props.value;editor.props.ref.current=editorNode;return editor}
  h.render();bind()
  function render(){h.render();bind()}
  return{h,readers,downloads,copyCommands,nodes,editorNode,fileInputNode,render,async flush(){await new Promise(done=>setImmediate(done));render()},editor:()=>h.find(node=>node.type==='textarea'&&node.props.onChange),value:()=>h.find(node=>node.type==='textarea'&&node.props.onChange).props.value,
    edit(value){bind().props.onChange({target:{value}});render()},copy(target){h.find(node=>node.props['data-markdown-copy']===target).props.onClick();render()},
    upload(file){h.find(node=>Object.hasOwn(node.props,'data-markdown-file-input')).props.onChange({target:{files:file?[file]:[],value:'chosen'}});render()},
    recovery(){return h.all().find(node=>typeof node.type==='function'&&node.type.name==='MarkdownCopyRecovery')?.props},
    drop(file){bind().props.onDrop({dataTransfer:{files:[file]},preventDefault(){}});render()},close(){h.cleanup()}}
}
;(async()=>{
  await check('Real parent copies fail honestly for all three forms and successful rich API carries HTML plus source Markdown',async()=>{
    const f=await fixture({navigator:{clipboard:{writeText:async()=>{throw Error('denied')},write:async()=>{throw Error('denied')}}},clipboardItem:true})
    f.edit('# 제목\n본문')
    for(const target of ['md','html','rich']){f.copy(target);await f.flush();assert.equal(f.recovery().target,target);assert.equal(f.recovery().snapshot.markdown,'# 제목\n본문');assert.ok(!f.h.text().includes('copied'))}
    assert.deepEqual(f.copyCommands.map(item=>item.tag),['textarea','textarea','div']);f.close()
    let items;const rich=await fixture({navigator:{clipboard:{write:async data=>{items=data[0].items}}},clipboardItem:true});rich.edit('# Title');rich.copy('rich');await rich.flush()
    assert.match(await items['text/html'].text(),/<h1/);assert.equal(await items['text/plain'].text(),'# Title');assert.equal(rich.recovery(),undefined);assert.match(rich.h.text(),/copied/);rich.close()
  })
  await check('Different copy targets and immediate document edits suppress old fallback and old success',async()=>{
    const old=deferred(),newer=deferred();let writes=0
    const f=await fixture({navigator:{clipboard:{writeText:()=>++writes===1?old.promise:newer.promise}}});f.edit('원고');f.copy('md');f.copy('html')
    old.reject(Error('late'));await f.flush();assert.equal(f.copyCommands.length,0);assert.equal(f.recovery(),undefined)
    f.edit('새 원고');newer.resolve();await f.flush();assert.equal(f.recovery(),undefined);assert.ok(!f.h.text().includes('copied'));assert.equal(f.value(),'새 원고');f.close()
  })
  await check('Two FileReaders finishing out of order cannot overwrite the latest document even when abort is ineffective',async()=>{
    const f=await fixture({ignoreAbort:true});f.edit('before');f.upload({name:'one.md',size:3});const one=f.readers[0];f.upload({name:'two.txt',size:3});const two=f.readers[1]
    assert.equal(one.aborted,true);two.finish('second\r\n본문\n');await f.flush();one.finish('old first');await f.flush()
    assert.equal(f.value(),'second\r\n본문\n');assert.match(f.h.text(),/fileRead.loaded/);f.h.tick(600);assert.equal(f.h.stored.get('toolhub-markdown-draft'),'second\r\n본문\n');f.close()
  })
  await check('Editing, canceling the picker and unmounting make old FileReader success and error inert',async()=>{
    for(const action of ['edit','cancel','unmount']){
      const f=await fixture({ignoreAbort:true});f.edit('keep');f.upload({name:'old.md',size:3});const old=f.readers[0]
      if(action==='edit')f.edit('typed');else if(action==='cancel'){f.fileInputNode.dispatchEvent(new Event('cancel'));f.render()}else f.close()
      old.fail();old.finish('obsolete');await new Promise(done=>setImmediate(done));if(action!=='unmount'){f.render();assert.equal(f.value(),action==='edit'?'typed':'keep');assert.ok(!f.h.text().includes('fileRead.failed'));f.close()}
      assert.equal(old.aborted,true)
    }
  })
  await check('File limits and read errors preserve the document while a valid empty file replaces it explicitly',async()=>{
    const f=await fixture();f.edit('preserved');f.upload({name:'bad.exe',size:1});await f.flush();assert.equal(f.readers.length,0);assert.match(f.h.text(),/fileRead.unsupported/)
    f.upload({name:'large.md',size:1024*1024+1});await f.flush();assert.equal(f.readers.length,0);assert.match(f.h.text(),/fileRead.tooLarge/)
    f.upload({name:'bad.md',size:2});f.readers[0].fail();await f.flush();assert.equal(f.value(),'preserved');assert.match(f.h.text(),/fileRead.failed/)
    f.upload({name:'empty.md',size:0});f.readers[1].finish('');await f.flush();assert.equal(f.value(),'');assert.match(f.h.text(),/fileRead.loaded/);f.close()
  })
  await check('Image reads share the text-read generation and use the captured cursor without changing a newer draft',async()=>{
    const f=await fixture({ignoreAbort:true});f.edit('AB');f.editorNode.setSelectionRange(1,1);f.drop({name:'picture.png',size:1,type:'image/png'});const old=f.readers[0]
    f.upload({name:'current.md',size:3});f.readers[1].finish('current');await f.flush();old.finish('data:image/png;base64,OLD');await f.flush();assert.equal(f.value(),'current')
    f.edit('AB');f.editorNode.setSelectionRange(1,1);f.drop({name:'picture.png',size:1,type:'image/png'});const image=f.readers[2];f.editorNode.setSelectionRange(2,2)
    image.finish('data:image/png;base64,NEW');await f.flush();assert.equal(f.value(),'A![picture](data:image/png;base64,NEW)B')
    f.drop({name:'large.png',size:2*1024*1024+1,type:'image/png'});assert.equal(f.readers.length,3);assert.match(f.h.text(),/imageTooLarge/);f.close()
  })
  await check('Recovery is read-only and rich fallback explicitly switches between source Markdown and HTML',async()=>{
    let retries=0,closes=0;const snapshot={markdown:'**원문**',html:'<p><strong>원문</strong></p>'}
    const h=await componentHarness('src/components/MarkdownCopyRecovery.tsx',{props:{target:'rich',snapshot,onRetry:()=>retries++,onClose:()=>closes++}});h.render()
    let field=h.find(node=>node.type==='textarea');assert.equal(field.props.readOnly,true);assert.equal(field.props.value,snapshot.markdown)
    h.button('copyRecovery.textTypes.html').props.onClick();h.render();field=h.find(node=>node.type==='textarea');assert.equal(field.props.value,snapshot.html);assert.equal(field.props.readOnly,true)
    field.props.ref.current={focus(){},select(){},setSelectionRange(a,b){assert.equal(a,0);assert.equal(b,snapshot.html.length)}};h.button('copyRecovery.selectAll').props.onClick();h.render()
    h.button('copyRecovery.retry').props.onClick();h.button('copyRecovery.close').props.onClick();assert.equal(retries,1);assert.equal(closes,1);assert.ok(!h.text().includes('copied'));h.cleanup()
  })
  await check('Current draft download and autosave remain intact after language example changes',async()=>{
    const messages=JSON.parse(fs.readFileSync('messages/ko.json','utf8')),en=JSON.parse(fs.readFileSync('messages/en.json','utf8')).markdownEditor.sample,f=await fixture({messages})
    f.edit(en);f.h.tick(600);assert.equal(f.h.stored.get('toolhub-markdown-draft'),en)
    messages.markdownEditor.sample=en;f.render();f.h.tick(600);assert.equal(f.value(),en);assert.equal(f.h.stored.get('toolhub-markdown-draft'),en)
    f.h.button(messages.markdownEditor.exportMd).props.onClick();assert.equal(await f.downloads[0].text(),en);f.close()
  })
  console.log(`Independent Markdown actual parent/recovery: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
