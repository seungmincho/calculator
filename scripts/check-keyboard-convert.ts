// 한영 타자 변환 회귀 체크: node scripts/check-keyboard-convert.ts
import { engToKorConvert, korToEngConvert, detectMode } from '../src/utils/keyboardConvert.ts'
const e2k: [string, string][] = [['dkssudgktpdy','안녕하세요'],['DKSSUD','안녕'],['DKSSUDGKTPDY','안녕하세요'],['gksrmf','한글'],['rkatkgkqslek','감사합니다'],['dlfrdj','읽어'],['hk','ㅘ'],['Rhc','꽃'],['tkfkdgody','사랑해요'],['dkssud 123!','안녕 123!']]
const k2e: [string, string][] = [['안녕','dkssud'],['ㅘ','hk'],['ㄺ','fr'],['한글','gksrmf'],['읽어','dlfrdj']]
let fail = 0
for (const [i, o] of e2k) { const r = engToKorConvert(i); if (r !== o) { fail++; console.log('FAIL e2k', i, r, '!=', o) } }
for (const [i, o] of k2e) { const r = korToEngConvert(i); if (r !== o) { fail++; console.log('FAIL k2e', i, r, '!=', o) } }
if (detectMode('dkssud') !== 'engToKor' || detectMode('안녕 hi') !== 'korToEng') { fail++; console.log('FAIL detect') }
console.log(fail ? `${fail} failed` : 'all passed'); if (fail) process.exit(1)
