export const READING_KEY='toolhub-tts-reading-list-v1'
export const localVoice={name:'Fixture Local Korean',lang:'ko-KR',localService:true,default:true,voiceURI:'fixture-local'}
export const remoteVoice={name:'Fixture Remote Korean',lang:'ko-KR',localService:false,default:false,voiceURI:'fixture-remote'}
export const sourceText='첫 번째 합성 문장. 두 번째 합성 문장. 마지막 합성 문장.'
export function readingRecord(extra={}){const text=sourceText,start=text.indexOf('두 번째'),sentence='두 번째 합성 문장.';return {id:'fixture-saved',name:'읽던 합성 원고',createdAt:1794855600000,text,position:{index:1,start,end:start+sentence.length,text:sentence},settings:{voiceName:localVoice.name,rate:1.3,pitch:0.9,volume:0.6,localVoicesOnly:true},...extra}}
export const readingEnvelope=(records=[readingRecord()])=>({version:1,revision:'fixture-revision',records})
export async function speechMock(context, voices = [localVoice, remoteVoice]) {
  await context.addInitScript(voices => {
    const state = window.__speech = { utterances: [], log: [], cancelCount: 0, voices, current: null }, listeners = new Set()
    class Utterance { constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null } }
    const synth = {
      speaking: false, paused: false, pending: false,
      getVoices: () => state.voices,
      addEventListener: (name, fn) => { if (name === 'voiceschanged') listeners.add(fn) },
      removeEventListener: (name, fn) => { if (name === 'voiceschanged') listeners.delete(fn) },
      speak: utterance => { state.current = utterance; synth.speaking = true; state.utterances.push({ utterance, end: utterance.onend, error: utterance.onerror, boundary: utterance.onboundary }); state.log.push({ text: utterance.text, voice: utterance.voice?.name ?? null, local: utterance.voice?.localService ?? null, rate: utterance.rate, pitch: utterance.pitch, volume: utterance.volume }) },
      cancel: () => { state.cancelCount++; synth.speaking = false; state.current = null },
      pause: () => { synth.paused = true }, resume: () => { synth.paused = false },
    }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth }); Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: Utterance })
    window.__emitSpeech = (index, type, code = 'network') => {
      const item = state.utterances[index]; if (!item) throw new Error(`Unknown utterance ${index}`)
      if (type !== 'boundary' && state.current === item.utterance) { synth.speaking = false; state.current = null }
      const event = type === 'error' ? { error: code } : type === 'boundary' ? { name: 'word', charIndex: 0, charLength: 2 } : {}
      item[type]?.call(item.utterance, event)
    }
    window.__setSpeechVoices = values => { state.voices = values; for (const listener of listeners) listener() }
  }, voices)
}

export async function installTtsClipboard(context){await context.addInitScript(()=>{const native=navigator.clipboard;window.__pasteMode='hold';window.__pastePending=[];window.__linkMode='native';window.__linkPending=[];window.__linkWrites=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText(){if(window.__pasteMode==='hold')return new Promise((resolve,reject)=>window.__pastePending.push({resolve,reject}));return native.readText()},writeText(text){window.__linkWrites.push(text);if(window.__linkMode==='hold')return new Promise((resolve,reject)=>window.__linkPending.push({resolve,reject}));if(window.__linkMode==='reject')return Promise.reject(new Error('fixture clipboard rejected'));return native.writeText(text)}}})})}
