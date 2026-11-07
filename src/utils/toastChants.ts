/**
 * 짧은 건배 구호 — 구호·뜻·선창·후창 문구는 messages toastSpeech.list.<id> 에 있다.
 * 회귀 체크: node scripts/check-toast-chants.ts (greetings.ts 건배사 구호와 선창·후창이 같은지도 본다)
 */
export const PLACES = ['company', 'client', 'friends', 'family'] as const
export type Place = (typeof PLACES)[number] | 'any'

export interface ToastChant {
  id: string
  /** 어울리는 자리. 'any' = 어느 자리든 무난 */
  places: readonly Place[]
  /** true = 선창·후창이 다른 말(나눠 외치기), false = 선창을 다 같이 그대로 따라 외치기 */
  split: boolean
}

const c = (id: string, places: Place[], split = true): ToastChant => ({ id, places, split })

export const TOAST_CHANTS: readonly ToastChant[] = [
  // 줄임말형
  c('sohwaje', ['company', 'client']),
  c('mamuri', ['company', 'client', 'friends']),
  c('byeonsatto', ['friends', 'family']),
  c('cheongbaji', ['company', 'friends']),
  c('ojingeo', ['friends']),
  c('dangnagwi', ['client', 'friends']),
  c('nagaja', ['company']),
  c('jaegeonchuk', ['friends', 'family']),
  c('sauna', ['company', 'friends']),
  c('usaengsun', ['company', 'friends']),
  c('wonderful', ['any']),
  c('dangsinMeotjyeo', ['any']),
  c('madangbal', ['client', 'company']),
  c('tongtongtong', ['company', 'client']),
  c('jujeonja', ['company']),
  c('remember', ['friends', 'company']),
  c('ppappitta', ['friends', 'company']),
  c('naiyagara', ['friends', 'family']),
  c('gugupalpal', ['family', 'friends']),
  // 사자성어·추임새
  c('gahwamansaseong', ['family']),
  c('ilchwiwoljang', ['company']),
  c('gojingamnae', ['company']),
  c('songguyeongsin', ['any']),
  c('dongbanseongjang', ['client']),
  c('jihwaja', ['family', 'friends']),
  // 기본·상황형
  c('wihayeo', ['any']),
  c('geonbae', ['any'], false),
  c('yearEnd', ['company']),
  c('newYear', ['any']),
  c('farewell', ['company', 'friends']),
  c('friendship', ['friends']),
]

/** 고른 자리에 맞는 구호 ('all' = 전체, 'any' 구호는 어느 자리에나 포함) */
export const chantsFor = (place: Place | 'all') =>
  place === 'all' ? TOAST_CHANTS : TOAST_CHANTS.filter((x) => x.places.includes(place) || x.places.includes('any'))
