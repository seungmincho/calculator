// Test-context ports only. Product canvas, game engine and React rendering remain real.
export async function installTetrisPorts(context) {
  await context.addInitScript(() => {
    if (!/^https?:$/.test(location.protocol)) return
    window.__tetrisAudioContexts=0;window.__tetrisSoundStarts=0
    const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}})
    class SilentAudioContext {
      constructor(){window.__tetrisAudioContexts++;this.state='running';this.destination={};this.sampleRate=44100}
      get currentTime(){return performance.now()/1000}
      createOscillator(){return {frequency:parameter(),detune:parameter(),connect(){},disconnect(){},start(){window.__tetrisSoundStarts++},stop(){}}}
      createGain(){return {gain:parameter(),connect(){},disconnect(){}}}
      createBuffer(channels,length){return {getChannelData(){return new Float32Array(length)}}}
      createBufferSource(){return {connect(){},disconnect(){},start(){window.__tetrisSoundStarts++},stop(){}}}
      resume(){this.state='running';return Promise.resolve()}
      close(){this.state='closed';return Promise.resolve()}
    }
    window.AudioContext=SilentAudioContext;window.webkitAudioContext=SilentAudioContext
    const nativeRaf=requestAnimationFrame.bind(window),nativeCancel=cancelAnimationFrame.bind(window),nativeTimeout=setTimeout.bind(window),nativeClear=clearTimeout.bind(window)
    window.__tetrisRafs=[];window.__tetrisTimers=[];window.__tetrisHoldRaf=false
    window.requestAnimationFrame=callback=>{const game=/frame[\s\S]*reservation/.test(callback.toString());if(!game)return nativeRaf(callback);const item={callback,canceled:false,fired:false,held:false};item.id=nativeRaf(time=>{if(window.__tetrisHoldRaf){item.held=true;return}item.fired=true;callback(time)});window.__tetrisRafs.push(item);return item.id}
    window.cancelAnimationFrame=id=>{const item=window.__tetrisRafs.find(item=>item.id===id);if(item)item.canceled=true;return nativeCancel(id)}
    window.setTimeout=(callback,delay,...args)=>{if(delay!==1200||typeof callback!=='function')return nativeTimeout(callback,delay,...args);const item={callback:()=>callback(...args),canceled:false,fired:false};item.id=nativeTimeout(()=>{item.fired=true;item.callback()},delay);window.__tetrisTimers.push(item);return item.id}
    window.clearTimeout=id=>{const item=window.__tetrisTimers.find(item=>item.id===id);if(item)item.canceled=true;return nativeClear(id)}
    window.__tetrisRefs=()=>{
      const root=document.querySelector('[data-tetris-status]');if(!root)return null
      let fiber=root[Object.keys(root).find(key=>key.startsWith('__reactFiber$'))]
      for(;fiber;fiber=fiber.return){const refs=[];for(let hook=fiber.memoizedState;hook&&typeof hook==='object'&&'memoizedState'in hook;hook=hook.next){const value=hook.memoizedState;if(value&&typeof value==='object'&&'current'in value)refs.push(value)}const game=refs.find(ref=>ref.current&&Array.isArray(ref.current.board)&&Array.isArray(ref.current.queue)&&ref.current.stats);if(game)return {game,owners:refs.find(ref=>typeof ref.current?.getSnapshot==='function'&&typeof ref.current?.press==='function')?.current}}
      return null
    }
    window.__tetrisSnapshot=()=>{const refs=window.__tetrisRefs();if(!refs)return null;const game=refs.game.current;return {piece:game.piece?{...game.piece}:null,score:game.score,lines:game.lines,over:game.over,stats:{...game.stats},occupied:game.board.flat().filter(Boolean).length,held:refs.owners?.getSnapshot(),run:document.querySelector('[data-tetris-run]')?.getAttribute('data-tetris-run')}}
    window.__tetrisHoldFrames=()=>{window.__tetrisHoldRaf=true}
    window.__tetrisStepFrame=(time=performance.now()+20)=>{const item=window.__tetrisRafs.findLast(item=>item.held&&!item.canceled&&!item.fired);if(!item)throw new Error('No held current game RAF');item.fired=true;item.callback(time)}
  })
}
export async function mockTetrisRpc(context) {
  const requests=[]
  await context.route('**/rest/v1/rpc/*',route=>{
    const request=route.request(),name=new URL(request.url()).pathname.split('/').pop(),body=request.postDataJSON();requests.push({name,body})
    if(name==='get_leaderboard')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({entries:[],player_rank:null,player_score:null})})
    if(name==='submit_leaderboard_score')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({submitted:true,rank:1,personal_best:body?.p_score??null})})
    return route.abort('blockedbyclient')
  })
  return requests
}
export const snapshot=page=>page.evaluate(()=>window.__tetrisSnapshot())
export async function pointer(page,selector,type,{id=71,x=0,y=0,pointerType='touch',...extra}={}) {
  return page.locator(selector).dispatchEvent(type,{pointerId:id,pointerType,isPrimary:id===71,clientX:x,clientY:y,button:0,buttons:type==='pointerdown'||type==='pointermove'?1:0,bubbles:true,...extra})
}
