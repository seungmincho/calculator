export const historyKey='typing-test-history-v2',dailyKey='typing-test-daily-v1'
export async function installTypingReviewPorts(context){
 await context.addInitScript(({historyKey,dailyKey})=>{
  if(!/^https?:$/.test(location.protocol))return
  localStorage.setItem(historyKey,JSON.stringify([{ts:1794844800000,lang:'ko',mode:'daily',speed:234,acc:98}],null,2));localStorage.setItem(dailyKey,JSON.stringify({1:{best:234,acc:98,tries:2}},null,2))
  const now=Date.now.bind(Date),performanceNow=performance.now.bind(performance),interval=window.setInterval.bind(window),clear=window.clearInterval.bind(window)
  window.__typingClockOffset=0;window.__typingIntervals=[];Date.now=()=>now()+window.__typingClockOffset;Object.defineProperty(performance,'now',{configurable:true,value:()=>performanceNow()+window.__typingClockOffset})
  window.setInterval=(callback,delay,...args)=>{const entry={delay,active:true,ticks:0,callback:()=>callback(...args)};entry.id=interval(()=>{entry.ticks++;entry.callback()},delay);window.__typingIntervals.push(entry);return entry.id}
  window.clearInterval=id=>{const entry=window.__typingIntervals.find(item=>item.id===id);if(entry)entry.active=false;return clear(id)}
 },{historyKey,dailyKey})
}
export async function typingStorage(page){return page.evaluate(({historyKey,dailyKey})=>({history:localStorage.getItem(historyKey),daily:localStorage.getItem(dailyKey),url:location.href}),{historyKey,dailyKey})}
export async function composition(locator,text,phase){await locator.evaluate((node,{text,phase})=>{if(phase==='start')node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(node,text);node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:text,isComposing:phase!=='end'}));if(phase==='end')node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:[...text].at(-1)}))},{text,phase})}
