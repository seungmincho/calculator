import assert from 'node:assert/strict'

// No product imports: integer rational rounding is the independent split oracle.
export function splitSeconds(totalSeconds, distanceKm, splitDistanceKm) {
  const whole=BigInt(Math.round(distanceKm*10000)),part=BigInt(Math.round(splitDistanceKm*10000))
  const numerator=BigInt(totalSeconds)*part
  return Number((2n*numerator+whole)/(2n*whole))
}
export function runningQuery({distanceKm=10,custom=false,mode='time',valueSeconds=3000,splitKm=1,goals=[]}={}) {
  const search=new URLSearchParams({rpV:'1',rp:JSON.stringify({distanceKm,custom,mode,valueSeconds,splitKm,goals})})
  return '?'+search.toString()
}
export async function installRunningPorts(context,{holdRestore=false}={}) {
  await context.addInitScript(({holdRestore})=>{
    const set=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window),raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window)
    window.__runningRestore=[];window.__runningPrintFrames=[];window.__runningPrintCalls=[];window.__runningHoldPrint=false;window.__runningHistoryCalls=[]
    const replace=history.replaceState.bind(history)
    history.replaceState=(state,title,url)=>{window.__runningHistoryCalls.push({before:location.href,url:String(url),state});return replace(state,title,url)}
    window.setTimeout=(callback,delay,...args)=>{
      const source=typeof callback==='function'?Function.prototype.toString.call(callback):''
      if((!source.includes('restoreInitialRunningLocation')&&!source.includes('restoreRunningLocation'))||!holdRestore)return set(callback,delay,...args)
      const entry={callback:()=>callback(...args),canceled:false};entry.id=set(()=>{},0);window.__runningRestore.push(entry);return entry.id
    }
    window.clearTimeout=id=>{for(const item of window.__runningRestore)if(item.id===id)item.canceled=true;return clear(id)}
    window.__releaseRunningRestore=()=>{for(const item of window.__runningRestore.splice(0))if(!item.canceled)item.callback()}
    window.requestAnimationFrame=callback=>{
      if(callback.name!=='printRunningSnapshot')return raf(callback)
      const item={callback,canceled:false,held:window.__runningHoldPrint};item.id=raf(time=>{if(!item.held)callback(time)});window.__runningPrintFrames.push(item);return item.id
    }
    window.cancelAnimationFrame=id=>{const item=window.__runningPrintFrames.find(item=>item.id===id);if(item)item.canceled=true;return cancel(id)}
    window.print=()=>window.__runningPrintCalls.push({rows:document.querySelectorAll('[data-running-print-row]').length,text:document.querySelector('[data-running-print-document]')?.textContent??''})
  },{holdRestore})
}
if(process.argv.includes('--self-test')) {
  assert.equal(splitSeconds(29,100,50),15)
  assert.equal(splitSeconds(28803,100,50),14402)
  assert.equal(splitSeconds(3600,21.0975,21.0975),3600)
  assert.equal(new URLSearchParams(runningQuery()).get('rpV'),'1')
  console.log('PASS independent Running rational/query fixtures; no Chrome')
}
