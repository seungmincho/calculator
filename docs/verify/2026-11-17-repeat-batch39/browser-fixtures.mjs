// Isolated verification ports. Native Worker/FileReader execute; only delivery/failure
// boundaries are controlled when a case explicitly selects a non-native mode.
export async function installRegexPorts(context) {
  await context.addInitScript(()=>{
    if(!/^https?:$/.test(location.protocol))return
    const NativeWorker=window.Worker,NativeReader=window.FileReader
    window.__regexWorkers=[];window.__regexWorkerMode='native';window.__regexReaders=[];window.__regexReadMode='native';window.__regexHistoryFail=false
    class ObservedWorker {
      constructor(url,options){if(window.__regexWorkerMode==='construct-fail')throw new Error('Synthetic Worker creation error');this.mode=window.__regexWorkerMode;this.url=String(url);this.native=new NativeWorker(url,options);this.onmessage=null;this.onerror=null;this.onmessageerror=null;this.terminated=0;this.responses=[];window.__regexWorkers.push(this);this.native.onmessage=event=>{const callback=this.onmessage;const record={event,callback};this.responses.push(record);if(this.mode==='hold')return;if(this.mode==='messageerror'){this.onmessageerror?.(new MessageEvent('messageerror'));return}if(this.mode==='invalid'){callback?.({data:{...event.data,result:{outputText:7}}});return}callback?.(event)};this.native.onerror=event=>this.onerror?.(event)}
      postMessage(request){this.request=request;this.startedAt=performance.now();this.native.postMessage(request)}
      terminate(){this.terminated++;this.finishedAt=performance.now();this.native.terminate()}
    }
    window.Worker=ObservedWorker;window.__regexNativeWorker=NativeWorker;window.__regexObservedWorker=ObservedWorker
    class ObservedReader {
      constructor(){this.native=new NativeReader();this.result=null;this.onload=null;this.onerror=null;this.onabort=null;this.mode=window.__regexReadMode;this.aborts=0;window.__regexReaders.push(this);this.native.onload=event=>{this.result=this.native.result;this.delivery={callback:this.onload,event};if(this.mode!=='hold')this.onload?.(event)};this.native.onerror=event=>this.onerror?.(event);this.native.onabort=event=>this.onabort?.(event)}
      readAsText(file){this.name=file.name;this.size=file.size;if(this.mode==='fail'){queueMicrotask(()=>this.onerror?.(new ProgressEvent('error')));return}this.native.readAsText(file)}
      abort(){this.aborts++;this.native.abort()}
    }
    window.FileReader=ObservedReader
    const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='calculation_history'&&window.__regexHistoryFail)throw new DOMException('Synthetic quota','QuotaExceededError');return set.call(this,key,value)}
    window.__regexHeartbeat={count:0,maxGap:0,last:performance.now()};setInterval(()=>{const h=window.__regexHeartbeat,now=performance.now();h.count++;h.maxGap=Math.max(h.maxGap,now-h.last);h.last=now},16)
    window.__regexHeartbeatReset=()=>window.__regexHeartbeat={count:0,maxGap:0,last:performance.now()}
    window.__regexVisibility=state=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>state});document.dispatchEvent(new Event('visibilitychange'))}
  })
}
export const regexQuery=(job={},extra='')=>{const q=new URLSearchParams(extra);q.set('operation',job.operation??'extract');q.set('pattern',encodeURIComponent(job.pattern??'\\d+'));q.set('flags',job.flags??'g');q.set('replacement',job.replacement??'');q.set('input',encodeURIComponent(job.inputText??'A1 B22'));q.set('transform',job.transform??'none');return '?'+q.toString()}
export const workerStats=page=>page.evaluate(()=>window.__regexWorkers.map(w=>({url:w.url,mode:w.mode,terminated:w.terminated,responses:w.responses.length,operation:w.request?.job.operation,elapsedMs:w.finishedAt-w.startedAt})))
