export const DRAFT_KEY='characterCounter.v2'
export const VERSIONS_KEY='characterCounter.writingVersions.v1'
export const syntheticDraft=(extra={})=>({tabs:Array.from({length:5},(_,i)=>({title:`합성 문항 ${i+1}`,text:`저장 원고 ${i+1} 😀\r\n둘째 줄`,target:500+i,basis:['chars','charsNoSpace','bytesKr','x','chars'][i]})),active:2,...extra})
export const syntheticVersions=()=>({version:1,versions:[{id:'native-saved-a',name:'합성 저장본',title:'저장 제목',text:'저장본 원고 😀\r\n수정 전',target:777,basis:'bytesKr',sourceTab:1,createdAt:'2026-11-17T00:00:00.000Z'}]})
export async function installCharacterPorts(context,{holdRestore=false,mockPopup=true}={}) {
  await context.addInitScript(({holdRestore,mockPopup})=>{
    const queue=window.queueMicrotask.bind(window);window.__characterRestores=[];window.__characterPopupCalls=[]
    window.queueMicrotask=callback=>{
      const source=Function.prototype.toString.call(callback)
      // Narrow to the initial draft-reading callback, never general React effects.
      if(holdRestore&&(callback.name==='restoreInitialCharacterDraft'||(source.includes('parseWritingDraft')&&source.includes('initializeCharacterDraft'))))window.__characterRestores.push(callback)
      else queue(callback)
    }
    window.__releaseCharacterRestore=()=>{for(const callback of window.__characterRestores.splice(0))queue(callback)}
    window.__popupMode='null'
    if(mockPopup)window.open=(url,target,features)=>{window.__characterPopupCalls.push({url:String(url),target,features,pendingClipboard:window.__clipboardPending?.length??0});if(window.__popupMode==='throw')throw new DOMException('Synthetic popup blocked','NotAllowedError');return null}
  },{holdRestore,mockPopup})
}
