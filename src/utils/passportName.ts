// 여권 영문 이름(로마자 성명) — 순수 로직. 검증: node scripts/check-passport-name.ts
//
// | 내용 | 기관·자료 | URL | 기준일 | 확인일 |
// |---|---|---|---|---|
// | 인명: 성과 이름 띄어 씀, 이름은 붙여 쓰되 붙임표 허용, 이름의 음운 변화 미반영(한복남 Han Boknam, 홍빛나 Hong Bitna), 성의 표기는 따로 정함 | 국어의 로마자 표기법 제3장 제4항(문화체육관광부 고시 제2014-42호) | korean.go.kr …regltn_code=0004 | 2014-12-05 | 2026-11-22 |
// | 'ㄹㄹ'은 'll' | 같은 표기법 제2장 제2항 붙임 2(울릉 Ulleung) | 위와 같음 | 2014-12-05 | 2026-11-22 |
// | 여권 로마자성명은 한글성명을 음절 단위로 음역, 이름은 붙여 쓰되 붙임표 허용 | 여권법 시행규칙 제2조의2 제1항 | law.go.kr | 현행 | 2026-11-22 |
// | 로마자성명 변경 사유 11개 호(발음 불일치·국외 장기 사용·가족 성 일치·개명·18세 이후 1회 등) | 여권법 시행령 제3조의2 제2항(2024-01-30 개정 조문) | law.go.kr | 시행 2026-03-01 판 | 2026-11-22 |
// | 50% 또는 1만 명 이상이 쓰는 표기는 발음 불일치 사유로 변경 불가(성은 성 단위, 이름은 음절별) | 외교부고시 제2024-10호 | law.go.kr admRulSeq=2100000252156 | 2024-12-31 | 2026-11-22 |
// | 재발급 때도 같은 표기 원칙, 외국식 이름 허용(김에스더 KIM ESTHER), 예시 HONG GILDONG | 외교부 여권안내 "로마자성명 표기의 기본방법" | passport.go.kr menuPos=37 | 확인일 기준 | 2026-11-22 |
// | 부정적 뜻 철자 예시(GANG·SIN·NO·BIN 등), 외자 철자(A·I·O·U) 사유 | 외교부 여권안내 "로마자성명 표기의 변경 허용 요건" | passport.go.kr menuPos=39 | 확인일 기준 | 2026-11-22 |
// | 성씨별로 실제 쓰이는 로마자 표기 | 국립국어원 새국어생활 1991년 봄호, 서정수 "우리말 이름의 로마자 표기에 관하여" | korean.go.kr nklife/1991_1/1_7 | 1991 | 2026-11-22 |
// | 여권 MRZ 1줄(44자: 문서 종류 2자 + 발급국 3자 + 성<<이름, 빈칸 '<') | ICAO Doc 9303 Part 4(TD3). 한국 복수여권 문서 종류 PM | icao.int | — | 2026-11-22 |
//
// 성씨 표기 비율은 공식 원문에서 숫자를 찾지 못해 쓰지 않는다(화면도 "흔히 쓰는 표기"까지만).
import { nfc, romanize } from './koreanSyllable.ts'

export const CHECKED = '2026-11-22'

export const SOURCES = {
  rr: 'https://korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0004',
  decree: 'https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%97%AC%EA%B6%8C%EB%B2%95%EC%8B%9C%ED%96%89%EB%A0%B9/%EC%A0%9C3%EC%A1%B0%EC%9D%982',
  rule: 'https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%97%AC%EA%B6%8C%EB%B2%95%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99/%EC%A0%9C2%EC%A1%B0%EC%9D%982',
  notice: 'https://www.law.go.kr/LSW/admRulInfoR.do?admRulSeq=2100000252156&chrClsCd=010201',
  basic: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=37',
  change: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=39',
  nikl1991: 'https://www.korean.go.kr/nkview/nklife/1991_1/1_7.html',
} as const

/**
 * 성씨 관용 표기 후보(표기법 표기 말고 여권에서 흔히 쓰는 것). 국립국어원 새국어생활(1991) 목록에 실린 표기 중
 * 지금도 흔히 보이는 것만 골랐다. 순서는 화면 순서일 뿐 비율이 아니다.
 * 두 글자 성(남궁·제갈·선우·황보)은 위 자료에 없어 넣지 않는다(표기법 표기만 보여 준다).
 */
export const SURNAME_ALTS: Record<string, readonly string[]> = {
  김: ['Kim'],
  이: ['Lee', 'Yi', 'Rhee'],
  박: ['Park', 'Pak'],
  최: ['Choi'],
  정: ['Jung', 'Chung', 'Cheong'],
  강: ['Kang'],
  조: ['Cho'],
  윤: ['Yoon', 'Youn'],
  장: ['Chang'],
  임: ['Lim', 'Yim'],
  한: ['Hahn'],
  오: ['Oh'],
  서: ['Suh'],
  신: ['Shin'],
  권: ['Kwon'],
  황: ['Whang'],
  안: ['Ahn'],
  송: [],
  전: ['Chun', 'Jun'],
  홍: [],
  유: ['Yoo', 'You'],
  고: ['Ko', 'Koh'],
  문: ['Moon'],
  양: [],
  손: ['Sohn'],
  배: ['Pae'],
  백: ['Paik', 'Baik'],
  허: ['Huh'],
  노: ['Noh', 'Roh'],
  남: ['Nahm'],
}

/** 외교부 "변경 허용 요건"의 부정적 뜻 철자 예시 */
export const NEGATIVE = ['GANG', 'SIN', 'SUCK', 'ILL', 'BUM', 'GUN', 'KILL', 'NO', 'BIN', 'DUCK', 'BARK'] as const

export const S_MAX = 2
export const N_MAX = 4
export const MRZ_LEN = 44
/** 한국 복수여권 MRZ 앞 5자(문서 종류 PM + 발급국 KOR) */
export const MRZ_HEAD = 'PMKOR'

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)

/** 한글 음절만 1~max 자 */
export const isHangul = (x: string, max: number) => /^[가-힣]+$/.test(x) && Array.from(x).length <= max

/**
 * 한 음절씩 따로 로마자로. 이름의 음운 변화는 반영하지 않는다(표기법 제3장 제4항 1, 빛나 → bit·na).
 * 다만 'ㄹㄹ'은 'll'(제2장 제2항 붙임 2)이라 앞 음절이 l 로 끝나고 뒤 음절이 r 로 시작하면 l 로 적는다.
 */
export function syllables(word: string): string[] {
  const out: string[] = []
  for (const ch of nfc(word)) {
    let r = romanize(ch)
    if (out.length && out[out.length - 1].endsWith('l') && r.startsWith('r')) r = `l${r.slice(1)}`
    out.push(r)
  }
  return out
}

/** 'ㄹㄹ → ll' 이 일어났는가(안내용) */
export const hasLl = (word: string) => {
  const raw = Array.from(nfc(word), (c) => romanize(c))
  return raw.some((r, i) => i > 0 && raw[i - 1].endsWith('l') && r.startsWith('r'))
}

/** 표기법대로 적은 성(Hong, Namgung) */
export const surnameStd = (s: string) => cap(syllables(s).join(''))

/** 성 표기 후보: [표기법 표기, ...관용 표기]. 대소문자만 다른 중복은 뺀다 */
export function surnameOptions(s: string): string[] {
  const std = surnameStd(s)
  const out = [std]
  for (const a of SURNAME_ALTS[s] ?? []) if (!out.some((o) => o.toUpperCase() === a.toUpperCase())) out.push(a)
  return out
}

/** 여권 MRZ 1줄. 성<<이름, 붙임표·빈칸은 '<', 44자에 맞춰 '<' 로 채운다. 넘치면 자르고 cut */
export function mrzLine1(S: string, G: string) {
  const full = `${MRZ_HEAD}${`${S}<<${G}`.replace(/[^A-Z]/g, '<')}`
  return { line: full.padEnd(MRZ_LEN, '<').slice(0, MRZ_LEN), cut: full.length > MRZ_LEN }
}

export type State = { s: string; n: string; h: boolean; v: string }
export const DEFAULT: State = { s: '홍', n: '길동', h: false, v: '' }

export function convert(st: State) {
  const s = nfc(st.s.trim())
  const n = nfc(st.n.trim())
  if (!isHangul(s, S_MAX) || !isHangul(n, N_MAX)) return null
  const std = surnameStd(s)
  const options = surnameOptions(s)
  const sur = st.v && options.includes(st.v) ? st.v : std
  const parts = syllables(n)
  const given = cap(parts.join(st.h ? '-' : ''))
  const S = sur.toUpperCase()
  const G = given.toUpperCase()
  const Gplain = G.replace(/-/g, '')
  const tokens = [S, Gplain, ...(st.h ? G.split('-') : [])]
  const mrz = mrzLine1(S, G)
  return {
    sur, given, std, options,
    custom: sur !== std,
    /** 여권 표기 HONG GILDONG */
    passport: `${S} ${G}`,
    /** 표기법 표기 Hong Gildong */
    rr: `${sur} ${given}`,
    /** 항공권 표기 HONG/GILDONG (붙임표 없이) */
    ticket: `${S}/${Gplain}`,
    mrz: mrz.line,
    mrzCut: mrz.cut,
    ll: hasLl(n),
    negative: [...new Set(tokens.filter((x) => (NEGATIVE as readonly string[]).includes(x)))],
    single: S.length === 1 || Gplain.length === 1,
  }
}

export function parseState(get: (k: string) => string | null): State {
  const s0 = nfc((get('s') ?? '').trim())
  const n0 = nfc((get('n') ?? '').trim())
  const s = isHangul(s0, S_MAX) ? s0 : DEFAULT.s
  const n = isHangul(n0, N_MAX) ? n0 : DEFAULT.n
  const v0 = get('v') ?? ''
  const v = v0 !== surnameStd(s) && surnameOptions(s).includes(v0) ? v0 : ''
  return { s, n, h: get('h') === '1', v }
}

/** 기본값과 다른 것만. 모두 기본이면 '' */
export function toQuery(st: State): string {
  const q = new URLSearchParams()
  if (st.s !== DEFAULT.s) q.set('s', st.s)
  if (st.n !== DEFAULT.n) q.set('n', st.n)
  if (st.h) q.set('h', '1')
  if (st.v && st.v !== surnameStd(st.s)) q.set('v', st.v)
  return q.toString()
}
