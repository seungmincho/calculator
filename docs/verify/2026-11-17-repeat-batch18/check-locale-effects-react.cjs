const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const {webcrypto}=require('node:crypto')
const {installMinimalDom}=require('./minimal-dom.cjs')
const dom=installMinimalDom(),React=require('react'),{createRoot}=require('react-dom/client'),{act,createElement:h}=React
function extract(file,test){const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),found=[];function visit(node){if(test(node,ast))found.push(node);ts.forEachChild(node,visit)}visit(ast);assert.equal(found.length,1);return found[0].getText(ast)}
const effect=(file,marker)=>extract(file,(node,ast)=>ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0].getText(ast).includes(marker))
const declaration=(file,name)=>`const ${extract(file,(node,ast)=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)};`
// Wave 19 names the underlying setter explicitly; this fixture covers autosave
// and restoration, while its action wrapper is tested by wave 19 parent events.
function markdownState(file){return fs.readFileSync(file,'utf8').includes('[markdown, setMarkdownState]')?declaration(file,'[markdown, setMarkdownState]')+'const setMarkdown=setMarkdownState;':declaration(file,'[markdown, setMarkdown]')}
function compile(body,bindings){const code=ts.transpileModule(`return function Fixture(props){const {useEffect,useRef,useState}=React;${body}}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return new Function('React',...Object.keys(bindings),code)(React,...Object.values(bindings))}
let groups=0
async function check(name,run){if(process.argv[2]&&!name.includes(process.argv[2]))return;await run();groups++;console.log(`PASS ${name}`)}
;(async()=>{
  await check('Actual Markdown effects preserve an EN-example draft across the KO-to-EN dependency change',async()=>{
    const file='src/components/MarkdownEditor.tsx',ko=JSON.parse(fs.readFileSync('messages/ko.json','utf8')).markdownEditor.sample,en=JSON.parse(fs.readFileSync('messages/en.json','utf8')).markdownEditor.sample
    const values=new Map([['draft',en]]),timers=new Map();let id=0,current
    const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}
    const Fixture=compile(`const sample=props.sample,DRAFT_KEY='draft';
      ${declaration(file,'[sampleBaseline, setSampleBaseline]')}
      ${markdownState(file)}
      ${declaration(file,'loaded')}
      const [saveState,setSaveState]=useState('idle');const setViewMode=()=>{};
      ${effect(file,'localStorage.getItem(DRAFT_KEY)')};
      ${effect(file,'localStorage.removeItem(DRAFT_KEY)')};
      capture({markdown,sampleBaseline,saveState,setMarkdown});return null;`,{localStorage,window:{matchMedia:()=>({matches:true})},setTimeout:(callback,delay)=>{assert.equal(delay,600);timers.set(++id,callback);return id},clearTimeout:key=>timers.delete(key),capture:value=>current=value})
    const root=createRoot(dom.document.createElement('div'))
    await act(async()=>root.render(h(Fixture,{sample:ko})))
    await act(async()=>{for(const callback of timers.values())callback();timers.clear()})
    assert.equal(current.markdown,en);assert.equal(values.get('draft'),en);assert.equal(current.sampleBaseline,ko)
    await act(async()=>root.render(h(Fixture,{sample:en})))
    assert.equal(timers.size,0,'locale-only update must not reschedule autosave with a new example exclusion')
    assert.equal(values.get('draft'),en);assert.equal(current.markdown,en)
    await act(async()=>current.setMarkdown('사용자가 수정한 원고'))
    await act(async()=>{for(const callback of timers.values())callback();timers.clear()})
    assert.equal(values.get('draft'),'사용자가 수정한 원고');await act(async()=>root.unmount())
  })
  await check('Actual Othello effect dependencies cannot duplicate chat or replay a restart over a later move',async()=>{
    const file='src/components/Othello.tsx';let current
    const Fixture=compile(`const {lastMessage,t}=props,myColor='black',showChat=false;
      ${declaration(file,'processedMessageRef')}
      const [chatMessages,setChatMessages]=useState([]),[unreadCount,setUnreadCount]=useState(0),[gameState,setGameState]=useState({moves:0}),[gamePhase,setGamePhase]=useState('playing');
      const setOpponentName=()=>{},handleBackToLobby=()=>{};
      ${effect(file,'const { type, payload } = lastMessage')};
      capture({chatMessages,unreadCount,gameState,gamePhase,setGameState});return null;`,{crypto:webcrypto,capture:value=>current=value,showToast:()=>{},createInitialOthelloState:()=>({moves:0}),makeMove:previous=>({...previous,moves:previous.moves+1})})
    const root=createRoot(dom.document.createElement('div')),ko=key=>`ko:${key}`,en=key=>`en:${key}`,chat={type:'chat',payload:{sender:'other',content:'hello'}}
    await act(async()=>root.render(h(React.StrictMode,null,h(Fixture,{lastMessage:chat,t:ko}))))
    assert.equal(current.chatMessages.length,1);assert.equal(current.unreadCount,1)
    await act(async()=>root.render(h(React.StrictMode,null,h(Fixture,{lastMessage:chat,t:en}))))
    assert.equal(current.chatMessages.length,1)
    const restart={type:'restart',payload:{}}
    await act(async()=>root.render(h(React.StrictMode,null,h(Fixture,{lastMessage:restart,t:en}))))
    await act(async()=>current.setGameState({moves:1}))
    await act(async()=>root.render(h(React.StrictMode,null,h(Fixture,{lastMessage:restart,t:ko}))))
    assert.equal(current.gameState.moves,1)
    await act(async()=>root.render(h(React.StrictMode,null,h(Fixture,{lastMessage:{...chat},t:ko}))))
    assert.equal(current.chatMessages.length,2);await act(async()=>root.unmount())
  })
  console.log(`Independent actual React locale effects: ${groups} groups passed`)
})().catch(error=>{console.error(error);process.exitCode=1})
