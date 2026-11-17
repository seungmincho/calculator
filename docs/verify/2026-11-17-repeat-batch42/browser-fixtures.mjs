import { ANSWERS, dailyAnswer, dayNumber, wordKeys } from '../../../src/utils/koreanWordle.ts'

export const WORDLE_DAILY_KEY='koreanWordle-daily-v1'
export const WORDLE_SETTINGS_KEY='koreanWordle-settings-v1'
export const fixtureNow=Date.parse('2026-11-17T10:00:00+09:00')
export const fixtureDay=dayNumber(fixtureNow)
// Product pure data chooses legal synthetic seeds, not the expected persistence/copy outcome.
export function historicalRecords(count=35,today=fixtureDay) {return Object.fromEntries(Array.from({length:count},(_,index)=>{const day=today-index-1;return [String(day),{guesses:[dailyAnswer(day)],hard:false}]}))}
export function legalWrongWord(day=fixtureDay,index=0){return ANSWERS[2].filter(word=>word!==dailyAnswer(day))[index]}
export const fixtureWordKeys=word=>wordKeys(word).flat()
export const fixtureAnswer=day=>dailyAnswer(day)

export async function installWordleTimers(context) {
  await context.addInitScript(()=>{
    if(!/^https?:$/.test(location.protocol))return
    const nativeSet=setTimeout.bind(window),nativeClear=clearTimeout.bind(window);window.__wordleTimers=[];window.__wordleHoldReveal=false
    window.setTimeout=(callback,delay,...args)=>{if(typeof callback!=='function'||![750,1000,1500,2000].includes(delay))return nativeSet(callback,delay,...args);const item={delay,callback:()=>callback(...args),canceled:false,fired:false,held:window.__wordleHoldReveal&&[750,1000].includes(delay)};item.id=nativeSet(()=>{if(!item.held){item.fired=true;item.callback()}},delay);window.__wordleTimers.push(item);return item.id}
    window.clearTimeout=id=>{const item=window.__wordleTimers.findLast(item=>item.id===id);if(item)item.canceled=true;return nativeClear(id)}
  })
}
export async function installWordleClock(context,time=fixtureNow){await context.addInitScript(time=>{const NativeDate=Date;window.__wordleTime=time;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[window.__wordleTime]))}static now(){return window.__wordleTime}}},time)}
export const nativeKeysForWord=word=>fixtureWordKeys(word).map(jamo=>{const plain='ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡ',qwerty='qwertyuiopasdfghjklzxcvbnm',shifted={'ㅃ':'q','ㅉ':'w','ㄸ':'e','ㄲ':'r','ㅆ':'t','ㅒ':'o','ㅖ':'p'};return shifted[jamo]?`Shift+${shifted[jamo]}`:qwerty[plain.indexOf(jamo)]})
export async function mockWordleRpc(context) {
  const requests=[]
  await context.route('**/rest/v1/rpc/*',route=>{const request=route.request(),name=new URL(request.url()).pathname.split('/').pop(),body=request.postDataJSON();requests.push({name,body});if(name==='get_leaderboard')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({entries:[],player_rank:null,player_score:null})});if(name==='submit_leaderboard_score')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({submitted:true,rank:1,personal_best:body?.p_score??null})});return route.abort('blockedbyclient')})
  return requests
}
