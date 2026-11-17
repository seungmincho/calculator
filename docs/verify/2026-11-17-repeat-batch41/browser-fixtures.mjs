// Synthetic test data and native-storage/File.text observers only; no product imports.
export const NOTES_KEY='toolhub-notepad-notes'
export const SETTINGS_KEY='toolhub-notepad-settings'
export const syntheticNote=(id,content,extra={})=>({id,title:`검증 ${id}`,content,createdAt:1794855600000,updatedAt:1794855601000,...extra})
export const backupNotes=notes=>JSON.stringify({app:'toolhub-notepad',version:1,exportedAt:'2026-11-17T00:00:00.000Z',notes})

export async function installStoragePorts(context,seed={},tag='notes') {
  await context.addInitScript(({seed,tag})=>{
    if(!/^https?:$/.test(location.protocol))return
    const marker=`__native_${tag}_seeded`,get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem
    if(!get.call(localStorage,marker)){for(const [key,value]of Object.entries(seed))if(value!==null)set.call(localStorage,key,value);set.call(localStorage,marker,'1')}
    window.__storeModes={};window.__storeLog=[];window.__storeReadback=new Set();window.__nativeStoreGet=key=>get.call(localStorage,key);window.__nativeStoreSet=(key,value)=>set.call(localStorage,key,value);window.__nativeStoreRemove=key=>remove.call(localStorage,key)
    Storage.prototype.getItem=function(key){if(this===localStorage){const mode=window.__storeModes[key];if(mode==='read-blocked'||window.__storeReadback.delete(key))throw new DOMException('Synthetic read denied','SecurityError')}return get.call(this,key)}
    Storage.prototype.setItem=function(key,value){if(this!==localStorage)return set.call(this,key,value);const mode=window.__storeModes[key];window.__storeLog.push({operation:'set',key,length:String(value).length,mode:mode??'native'});if(mode==='quota')throw new DOMException('Synthetic quota','QuotaExceededError');if(mode==='write-blocked')throw new DOMException('Synthetic denied','SecurityError');const result=set.call(this,key,value);if(mode==='readback-once')window.__storeReadback.add(key);return result}
    Storage.prototype.removeItem=function(key){if(this===localStorage)window.__storeLog.push({operation:'remove',key});return remove.call(this,key)}
  },{seed,tag})
}

export async function holdNativeLock(page,key) {
  await page.evaluate(key=>{window.__nativeLockHolds??={};const item={held:false,released:false};window.__nativeLockHolds[key]=item;item.promise=navigator.locks.request(key,async()=>{item.held=true;await new Promise(resolve=>item.release=resolve);item.released=true})},key)
  await page.waitForFunction(key=>window.__nativeLockHolds[key].held,key)
}
export async function releaseNativeLock(page,key) {await page.evaluate(async key=>{const item=window.__nativeLockHolds[key];item.release();await item.promise},key)}

export async function installNativeFiles(context) {
  await context.addInitScript(()=>{
    if(!/^https?:$/.test(location.protocol))return
    const nativeText=File.prototype.text;window.__fileReads=[];window.__fileMode='native'
    File.prototype.text=function(){const item={name:this.name,size:this.size,mode:window.__fileMode,completed:false};window.__fileReads.push(item);if(item.mode==='reject')return Promise.reject(new Error('Synthetic read error'));const read=nativeText.call(this);if(item.mode!=='hold')return read;return new Promise((resolve,reject)=>{read.then(value=>{item.completed=true;item.value=value;item.release=()=>resolve(value);item.reject=()=>reject(new Error('Synthetic late read rejection'))},reject)})}
    const nativeCreate=URL.createObjectURL.bind(URL),nativeRevoke=URL.revokeObjectURL.bind(URL);window.__downloadUrls=[]
    URL.createObjectURL=blob=>{const href=nativeCreate(blob);window.__downloadUrls.push({href,size:blob.size,type:blob.type,revoked:0});return href}
    URL.revokeObjectURL=href=>{const owned=window.__downloadUrls.find(item=>item.href===href);if(owned)owned.revoked++;return nativeRevoke(href)}
    const timer=setTimeout.bind(window),clear=clearTimeout.bind(window);window.__noteToastTimers=[]
    window.setTimeout=(callback,delay,...args)=>{if(delay!==6000||typeof callback!=='function')return timer(callback,delay,...args);const item={callback:()=>callback(...args),canceled:false};item.id=timer(item.callback,delay);window.__noteToastTimers.push(item);return item.id}
    window.clearTimeout=id=>{const item=window.__noteToastTimers.findLast(item=>item.id===id);if(item)item.canceled=true;return clear(id)}
  })
}
