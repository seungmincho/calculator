// MBTI 성격유형 데이터
// 16개 유형 프로필, 궁합 매트릭스, 48문항 검사

export type MbtiType = 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP' | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP' | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ' | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP'

export const MBTI_TYPES: MbtiType[] = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']

export type Axis = 'EI' | 'SN' | 'TF' | 'JP'

export interface MbtiTypeProfile {
  type: MbtiType
  nickname: string
  nicknameEn: string
  emoji: string
  color: string // 시그니처 컬러
  colorGradient: [string, string] // 그라데이션 from/to
  traits: string[]
  strengths: string[]
  weaknesses: string[]
  communicationStyle: string
  loveStyle: string
  careers: string[]
  famousKoreans: string[]
  famousInternational: string[]
  koreanPercent: number
  shortDesc: string // 한 줄 설명
}

export interface TestQuestion {
  id: number
  axis: Axis
  question: string
  optionA: { text: string; value: string } // E, S, T, J
  optionB: { text: string; value: string } // I, N, F, P
}

export type CompatibilityRating = 5 | 4 | 3 | 2 | 1

export interface CompatibilityDetail {
  type1: MbtiType
  type2: MbtiType
  rating: CompatibilityRating
  firstImpression: { male: string; female: string }
  datingStrengths: { male: string; female: string }
  conflictPoints: { male: string; female: string }
  advice: { male: string; female: string }
  summary: string
}

// ─── 16개 유형 프로필 ───

export const mbtiProfiles: Record<MbtiType, MbtiTypeProfile> = {
  INTJ: {
    type: 'INTJ',
    nickname: '전략가',
    nicknameEn: 'Architect',
    emoji: '🧠',
    color: '#1e3a5f',
    colorGradient: ['#1e3a5f', '#2d5f8a'],
    traits: ['전략적 사고', '독립적', '목표 지향적', '완벽주의', '논리적', '내향적'],
    strengths: ['장기 계획 수립 탁월', '자기 통제력 우수', '창의적 문제 해결', '높은 기준 유지'],
    weaknesses: ['타인 감정에 둔감', '완벽주의 스트레스', '사교성 부족', '비판적 성향'],
    communicationStyle: '직접적이고 간결한 소통을 선호하며, 감정 표현을 절제하고 사실과 논리 중심으로 대화합니다.',
    loveStyle: '신중하게 파트너를 선택하고 깊고 진지한 관계를 추구합니다. 로맨틱한 제스처보다 지적 교류를 중시합니다.',
    careers: ['과학자', '엔지니어', '전략 컨설턴트', '프로그래머', '교수', '외과의사', '건축가'],
    famousKoreans: ['공효진', 'G-Dragon', 'BoA'],
    famousInternational: ['일론 머스크', '마크 저커버그', '스티븐 호킹'],
    koreanPercent: 3.75,
    shortDesc: '독립적이고 전략적인 완벽주의자',
  },
  INTP: {
    type: 'INTP',
    nickname: '논리술사',
    nicknameEn: 'Logician',
    emoji: '🔬',
    color: '#4a6fa5',
    colorGradient: ['#4a6fa5', '#6b8fc5'],
    traits: ['분석적', '이론적', '창의적', '객관적', '내향적', '호기심 넘침'],
    strengths: ['논리적 분석력', '창의적 사고', '지적 호기심', '독창성'],
    weaknesses: ['감정 표현 서툼', '산만함', '완벽주의', '사회적 무관심'],
    communicationStyle: '정확한 언어 사용을 선호하고 불필요한 잡담을 피합니다. 깊이 있는 주제에 대한 대화를 즐깁니다.',
    loveStyle: '지적인 파트너를 원하며 독립적인 공간이 필요합니다. 느린 속도로 관계를 발전시킵니다.',
    careers: ['프로그래머', '수학자', '철학자', '금융 분석가', '대학교수', '경제학자'],
    famousKoreans: ['진(BTS)', '슈가(BTS)'],
    famousInternational: ['알버트 아인슈타인', '찰스 다윈', '빌 게이츠'],
    koreanPercent: 6.28,
    shortDesc: '호기심 넘치는 논리적 사색가',
  },
  ENTJ: {
    type: 'ENTJ',
    nickname: '통솔자',
    nicknameEn: 'Commander',
    emoji: '👑',
    color: '#8b2252',
    colorGradient: ['#8b2252', '#b83280'],
    traits: ['결단력', '자신감', '전략적', '리더십', '직접적', '효율 추구'],
    strengths: ['탁월한 리더십', '장기 전략 수립', '높은 실행력', '결단력'],
    weaknesses: ['공감 부족', '지배적 성향', '타인 의견 무시', '조급함'],
    communicationStyle: '직접적이고 단호합니다. 목표 중심으로 대화하며 우회적 표현을 싫어합니다.',
    loveStyle: '파트너의 성장을 돕고 싶어하며 헌신적이지만 때로 지배적일 수 있습니다. 행동으로 사랑을 표현합니다.',
    careers: ['CEO', '경영 컨설턴트', '변호사', '판사', '정치인', '기업 임원'],
    famousKoreans: ['이특(슈퍼주니어)', '연준(TXT)'],
    famousInternational: ['나폴레옹', '마거릿 대처', '잭 웰치'],
    koreanPercent: 2.73,
    shortDesc: '타고난 리더, 목표를 향해 돌진하는 통솔자',
  },
  ENTP: {
    type: 'ENTP',
    nickname: '변론가',
    nicknameEn: 'Debater',
    emoji: '💡',
    color: '#c2571a',
    colorGradient: ['#c2571a', '#e67e22'],
    traits: ['창의적', '지적 호기심', '논쟁 즐김', '빠른 사고', '카리스마', '도전적'],
    strengths: ['창의적 문제 해결', '빠른 학습력', '유연성', '설득력'],
    weaknesses: ['논쟁적', '집중력 부족', '실행력 부족', '약속 불이행'],
    communicationStyle: '토론과 논쟁을 즐기며 악마의 변호인 역할을 좋아합니다. 지적 자극을 원합니다.',
    loveStyle: '지적인 파트너를 원하고 독립성을 중시합니다. 루틴한 연애를 싫어하고 열정적인 초반을 보여줍니다.',
    careers: ['기업가', '발명가', '컨설턴트', '변호사', '크리에이티브 디렉터'],
    famousKoreans: ['유재석(일부 분석)'],
    famousInternational: ['토마스 에디슨', '스티브 잡스', '벤저민 프랭클린'],
    koreanPercent: 5.04,
    shortDesc: '끝없는 아이디어의 논쟁가',
  },
  INFJ: {
    type: 'INFJ',
    nickname: '옹호자',
    nicknameEn: 'Advocate',
    emoji: '🦋',
    color: '#2e8b57',
    colorGradient: ['#2e8b57', '#48c78e'],
    traits: ['통찰력', '공감', '이상주의', '결단력', '내향적', '신비로움'],
    strengths: ['뛰어난 공감 능력', '깊은 통찰력', '원칙 있는 삶', '창의성'],
    weaknesses: ['번아웃 취약', '완벽주의', '비판에 민감', '과도한 이상주의'],
    communicationStyle: '의미 있는 대화를 선호하고 감정적으로 세심합니다. 직관적으로 상대방을 이해합니다.',
    loveStyle: '깊고 진지한 연애를 하며 소울메이트를 추구합니다. 파트너를 위해 헌신하지만 갈등을 회피하는 경향이 있습니다.',
    careers: ['상담사', '심리학자', '작가', '교육자', '비영리 리더', '아트 디렉터'],
    famousKoreans: ['태연(소녀시대)', '카이(EXO)', '솔라(마마무)'],
    famousInternational: ['마하트마 간디', '마틴 루터 킹', '넬슨 만델라'],
    koreanPercent: 6.25,
    shortDesc: '깊은 통찰력의 이상주의자',
  },
  INFP: {
    type: 'INFP',
    nickname: '중재자',
    nicknameEn: 'Mediator',
    emoji: '🌸',
    color: '#9b59b6',
    colorGradient: ['#9b59b6', '#c39bd3'],
    traits: ['이상주의', '공감', '창의성', '내향적', '감성적', '낭만적'],
    strengths: ['깊은 공감 능력', '풍부한 창의성', '강한 가치관', '헌신적'],
    weaknesses: ['비현실적 이상', '감정 기복', '자기비판', '우유부단'],
    communicationStyle: '감정적이고 시적인 표현을 사용합니다. 깊은 일대일 대화를 선호하며 갈등을 회피합니다.',
    loveStyle: '낭만적이고 헌신적이며 이상적인 사랑을 추구합니다. 감정적 연결을 가장 중시합니다.',
    careers: ['작가', '예술가', '상담사', '사회복지사', '음악가', '심리치료사'],
    famousKoreans: ['아이유', '선미', '정국(BTS)', '조이(레드벨벳)'],
    famousInternational: ['J.R.R. 톨킨', '조니 뎁', '오드리 헵번'],
    koreanPercent: 13.39,
    shortDesc: '낭만적인 이상주의 감성파',
  },
  ENFJ: {
    type: 'ENFJ',
    nickname: '선도자',
    nicknameEn: 'Protagonist',
    emoji: '🌟',
    color: '#e74c3c',
    colorGradient: ['#e74c3c', '#f1948a'],
    traits: ['카리스마', '공감', '리더십', '이타적', '조직적', '영감을 주는'],
    strengths: ['뛰어난 리더십', '타인 동기부여', '공감 능력', '뛰어난 조직력'],
    weaknesses: ['타인 의존적 자존감', '과도한 헌신', '비판에 민감', '경계 설정 어려움'],
    communicationStyle: '따뜻하고 격려하는 방식으로 소통하며 집단 조화를 추구합니다.',
    loveStyle: '헌신적이고 로맨틱하며 파트너의 성장을 적극 지원합니다. 관계에 전력투구합니다.',
    careers: ['교사', '상담사', '코치', 'HR 전문가', '비영리 리더', '배우'],
    famousKoreans: ['지민(BTS)', '잭슨(GOT7)', '강다니엘'],
    famousInternational: ['버락 오바마', '오프라 윈프리'],
    koreanPercent: 6.09,
    shortDesc: '사람들을 이끄는 따뜻한 리더',
  },
  ENFP: {
    type: 'ENFP',
    nickname: '활동가',
    nicknameEn: 'Campaigner',
    emoji: '🎨',
    color: '#f39c12',
    colorGradient: ['#f39c12', '#f7dc6f'],
    traits: ['열정적', '창의적', '사교적', '자유로운 영혼', '낙천적', '공감력'],
    strengths: ['넘치는 창의성', '열정', '사람 연결 능력', '적응력'],
    weaknesses: ['집중력 부족', '과도한 낙관주의', '감정적', '완성 어려움'],
    communicationStyle: '열정적이고 표현력이 풍부합니다. 아이디어 탐구를 좋아하고 진정성 있게 소통합니다.',
    loveStyle: '열정적이고 낭만적이며 깊은 연결을 원합니다. 자유가 필요하고 지루함을 두려워합니다.',
    careers: ['기자', '작가', '배우', '상담사', '마케터', '교육자', '광고 크리에이티브'],
    famousKoreans: ['이효리', '뷔(BTS)'],
    famousInternational: ['로빈 윌리엄스', '월트 디즈니', '레오나르도 다빈치'],
    koreanPercent: 12.60,
    shortDesc: '에너지 넘치는 자유로운 영혼',
  },
  ISTJ: {
    type: 'ISTJ',
    nickname: '현실주의자',
    nicknameEn: 'Logistician',
    emoji: '📋',
    color: '#34495e',
    colorGradient: ['#34495e', '#5d6d7e'],
    traits: ['책임감', '신뢰성', '성실함', '보수적', '현실적', '체계적'],
    strengths: ['강한 책임감', '높은 신뢰성', '집중력', '실용적 문제 해결'],
    weaknesses: ['변화 저항', '감정 표현 어려움', '융통성 부족', '지나친 규칙 의존'],
    communicationStyle: '사실과 데이터 중심으로 직접적으로 소통하며 감정 표현은 절제합니다.',
    loveStyle: '안정적이고 신뢰할 수 있는 파트너입니다. 천천히 신뢰를 쌓으며 실용적으로 사랑을 표현합니다.',
    careers: ['회계사', '공무원', '군인/경찰', '엔지니어', '재무관리자', '의사'],
    famousKoreans: ['써니(소녀시대)', '마크(GOT7)'],
    famousInternational: ['워렌 버핏', '조지 워싱턴', '엘리자베스 2세'],
    koreanPercent: 4.28,
    shortDesc: '믿음직한 성실파 현실주의자',
  },
  ISFJ: {
    type: 'ISFJ',
    nickname: '수호자',
    nicknameEn: 'Defender',
    emoji: '🛡️',
    color: '#27ae60',
    colorGradient: ['#27ae60', '#58d68d'],
    traits: ['헌신적', '따뜻함', '세심함', '신뢰성', '현실적', '내향적'],
    strengths: ['타인 배려', '강한 책임감', '인내심', '세밀한 관찰력'],
    weaknesses: ['과도한 헌신', '자기 표현 어려움', '변화 저항', '비판에 민감'],
    communicationStyle: '따뜻하고 배려적이며 갈등을 회피하고 간접적으로 소통합니다.',
    loveStyle: '헌신적이고 안정을 추구하며 파트너를 돌보는 것을 좋아합니다. 전통적인 연애 방식을 선호합니다.',
    careers: ['간호사', '교사', '사회복지사', '비서', '유치원 교사', '수의사'],
    famousKoreans: ['다현(트와이스)', '정연(트와이스)'],
    famousInternational: ['비욘세', '테레사 수녀', '케이트 미들턴'],
    koreanPercent: 7.66,
    shortDesc: '따뜻한 마음의 헌신적 수호자',
  },
  ESTJ: {
    type: 'ESTJ',
    nickname: '경영자',
    nicknameEn: 'Executive',
    emoji: '💼',
    color: '#2c3e50',
    colorGradient: ['#2c3e50', '#4a69bd'],
    traits: ['조직적', '결단력', '리더십', '전통 중시', '책임감', '직접적'],
    strengths: ['강한 리더십', '뛰어난 조직력', '높은 신뢰성', '목표 달성력'],
    weaknesses: ['융통성 부족', '감정 무시', '고집스러움', '변화 저항'],
    communicationStyle: '직접적이고 단호하며 기대치를 명확하게 전달합니다.',
    loveStyle: '안정적이고 헌신적이며 전통적 역할을 중시합니다. 실용적으로 사랑을 표현합니다.',
    careers: ['관리자', '군인', '변호사', '판사', '정치인', '경찰', '기업 임원'],
    famousKoreans: ['지수(블랙핑크)'],
    famousInternational: ['헨리 포드', '앤 해서웨이'],
    koreanPercent: 4.56,
    shortDesc: '체계적이고 결단력 있는 경영자',
  },
  ESFJ: {
    type: 'ESFJ',
    nickname: '집정관',
    nicknameEn: 'Consul',
    emoji: '🤝',
    color: '#e91e63',
    colorGradient: ['#e91e63', '#f48fb1'],
    traits: ['따뜻함', '사교적', '충성스러움', '배려', '조화 추구', '전통 중시'],
    strengths: ['탁월한 사교성', '타인 배려', '충성심', '팀 화합 능력'],
    weaknesses: ['승인 의존', '비판에 민감', '갈등 회피', '변화 저항'],
    communicationStyle: '따뜻하고 사교적이며 감정을 우선시하고 집단 조화를 중시합니다.',
    loveStyle: '헌신적이고 로맨틱하며 파트너의 인정과 감사가 필요합니다. 전통적인 연애 방식을 좋아합니다.',
    careers: ['교사', '간호사', '사회복지사', '이벤트 플래너', '인사 담당', '판매'],
    famousKoreans: ['규현(슈퍼주니어)', '제이홉(BTS)'],
    famousInternational: ['테일러 스위프트', '빌 클린턴'],
    koreanPercent: 8.35,
    shortDesc: '사교적이고 배려 넘치는 분위기 메이커',
  },
  ISTP: {
    type: 'ISTP',
    nickname: '장인',
    nicknameEn: 'Virtuoso',
    emoji: '🔧',
    color: '#607d8b',
    colorGradient: ['#607d8b', '#90a4ae'],
    traits: ['분석적', '현실적', '독립적', '내향적', '즉흥적', '실용적'],
    strengths: ['빠른 문제 해결', '실용적 기술', '위기 대응 탁월', '자유로운 사고'],
    weaknesses: ['감정 표현 어려움', '장기 계획 어려움', '독립성 과도', '무뚝뚝함'],
    communicationStyle: '과묵하고 간결합니다. 행동으로 보여주며 불필요한 말을 싫어합니다.',
    loveStyle: '독립성을 유지하고 감정 표현이 느립니다. 행동으로 사랑을 표현하며 개인 공간이 필요합니다.',
    careers: ['파일럿', '기계 엔지니어', '데이터 분석가', '외과의사', '운동선수', '개발자'],
    famousKoreans: ['김연아', '박명수'],
    famousInternational: ['클린트 이스트우드', '브루스 리'],
    koreanPercent: 3.11,
    shortDesc: '실용적이고 차분한 문제 해결사',
  },
  ISFP: {
    type: 'ISFP',
    nickname: '모험가',
    nicknameEn: 'Adventurer',
    emoji: '🎭',
    color: '#8e44ad',
    colorGradient: ['#8e44ad', '#bb8fce'],
    traits: ['예술적', '공감', '자유로운 영혼', '현재 지향', '내향적', '세심함'],
    strengths: ['강한 심미적 감각', '따뜻함', '적응력', '진정성'],
    weaknesses: ['자기 표현 어려움', '비판에 민감', '장기 계획 어려움', '갈등 회피'],
    communicationStyle: '비언어적 소통을 선호하며 감정 표현이 서툽니다. 행동으로 마음을 보여줍니다.',
    loveStyle: '현재 순간에 충실하며 헌신적이지만 느린 속도를 보입니다. 자유와 공간이 필요합니다.',
    careers: ['예술가', '음악가', '디자이너', '요리사', '수의사', '물리치료사'],
    famousKoreans: ['유재석(일부 분석)'],
    famousInternational: ['마이클 잭슨', '프리다 칼로', '브리트니 스피어스'],
    koreanPercent: 6.61,
    shortDesc: '감성적인 예술가적 자유인',
  },
  ESTP: {
    type: 'ESTP',
    nickname: '사업가',
    nicknameEn: 'Entrepreneur',
    emoji: '🚀',
    color: '#d35400',
    colorGradient: ['#d35400', '#e67e22'],
    traits: ['에너지 넘침', '현실적', '사교적', '위험 감수', '즉흥적', '관찰력'],
    strengths: ['빠른 적응력', '실용적 문제 해결', '카리스마', '위기 대응'],
    weaknesses: ['충동적', '장기 계획 어려움', '감정 무시', '규칙 저항'],
    communicationStyle: '직접적이고 활기차며 유머가 있습니다. 행동 지향적으로 소통합니다.',
    loveStyle: '열정적이고 즉흥적이며 흥미와 자극을 원합니다. 독립성을 중시합니다.',
    careers: ['기업가', '영업', '마케팅', '운동선수', '경찰', '소방관', '트레이더'],
    famousKoreans: ['전현무'],
    famousInternational: ['어니스트 헤밍웨이', '잭 니콜슨'],
    koreanPercent: 2.94,
    shortDesc: '에너지 넘치는 행동파 사업가',
  },
  ESFP: {
    type: 'ESFP',
    nickname: '연예인',
    nicknameEn: 'Entertainer',
    emoji: '🎉',
    color: '#ff6f61',
    colorGradient: ['#ff6f61', '#ff9a8b'],
    traits: ['열정적', '사교적', '자발적', '현재 지향', '유머러스', '따뜻함'],
    strengths: ['뛰어난 사교성', '현장 대응력', '사람 읽기 능력', '즐거움 창출'],
    weaknesses: ['충동적 소비', '장기 계획 어려움', '갈등 회피', '깊은 분석 어려움'],
    communicationStyle: '활기차고 표현력이 풍부합니다. 즉흥적이며 감정 공유가 자연스럽습니다.',
    loveStyle: '즐거움과 설렘을 추구하며 현재에 충실합니다. 파트너의 행복을 우선시합니다.',
    careers: ['배우', '판매', '이벤트 플래너', '간호사', '코치', '관광 안내'],
    famousKoreans: ['비(Rain)', '윤아(소녀시대)'],
    famousInternational: ['아델', '엘비스 프레슬리', '마릴린 먼로'],
    koreanPercent: 6.36,
    shortDesc: '분위기를 만드는 타고난 엔터테이너',
  },
}

// ─── 궁합 매트릭스 (16×16) ───
// 5=천생연분, 4=매우좋음, 3=좋음, 2=보통, 1=주의

export const compatibilityMatrix: Record<MbtiType, Record<MbtiType, CompatibilityRating>> = {
  INTJ: { INTJ: 3, INTP: 4, ENTJ: 4, ENTP: 5, INFJ: 4, INFP: 3, ENFJ: 3, ENFP: 5, ISTJ: 2, ISFJ: 2, ESTJ: 2, ESFJ: 2, ISTP: 3, ISFP: 2, ESTP: 1, ESFP: 1 },
  INTP: { INTJ: 4, INTP: 3, ENTJ: 5, ENTP: 4, INFJ: 3, INFP: 3, ENFJ: 2, ENFP: 4, ISTJ: 2, ISFJ: 2, ESTJ: 3, ESFJ: 1, ISTP: 3, ISFP: 2, ESTP: 2, ESFP: 2 },
  ENTJ: { INTJ: 4, INTP: 5, ENTJ: 3, ENTP: 4, INFJ: 3, INFP: 5, ENFJ: 3, ENFP: 3, ISTJ: 3, ISFJ: 2, ESTJ: 3, ESFJ: 2, ISTP: 3, ISFP: 1, ESTP: 2, ESFP: 1 },
  ENTP: { INTJ: 5, INTP: 4, ENTJ: 4, ENTP: 3, INFJ: 5, INFP: 3, ENFJ: 3, ENFP: 4, ISTJ: 1, ISFJ: 1, ESTJ: 2, ESFJ: 2, ISTP: 3, ISFP: 2, ESTP: 3, ESFP: 2 },
  INFJ: { INTJ: 4, INTP: 3, ENTJ: 3, ENTP: 5, INFJ: 3, INFP: 4, ENFJ: 3, ENFP: 5, ISTJ: 2, ISFJ: 3, ESTJ: 2, ESFJ: 2, ISTP: 2, ISFP: 3, ESTP: 1, ESFP: 1 },
  INFP: { INTJ: 3, INTP: 3, ENTJ: 5, ENTP: 3, INFJ: 4, INFP: 3, ENFJ: 5, ENFP: 4, ISTJ: 2, ISFJ: 3, ESTJ: 1, ESFJ: 2, ISTP: 2, ISFP: 3, ESTP: 1, ESFP: 2 },
  ENFJ: { INTJ: 3, INTP: 2, ENTJ: 3, ENTP: 3, INFJ: 3, INFP: 5, ENFJ: 3, ENFP: 4, ISTJ: 2, ISFJ: 3, ESTJ: 2, ESFJ: 3, ISTP: 1, ISFP: 5, ESTP: 1, ESFP: 3 },
  ENFP: { INTJ: 5, INTP: 4, ENTJ: 3, ENTP: 4, INFJ: 5, INFP: 4, ENFJ: 4, ENFP: 3, ISTJ: 1, ISFJ: 1, ESTJ: 2, ESFJ: 2, ISTP: 2, ISFP: 3, ESTP: 2, ESFP: 3 },
  ISTJ: { INTJ: 2, INTP: 2, ENTJ: 3, ENTP: 1, INFJ: 2, INFP: 2, ENFJ: 2, ENFP: 1, ISTJ: 3, ISFJ: 3, ESTJ: 4, ESFJ: 4, ISTP: 3, ISFP: 3, ESTP: 5, ESFP: 5 },
  ISFJ: { INTJ: 2, INTP: 2, ENTJ: 2, ENTP: 1, INFJ: 3, INFP: 3, ENFJ: 3, ENFP: 1, ISTJ: 3, ISFJ: 3, ESTJ: 4, ESFJ: 4, ISTP: 3, ISFP: 3, ESTP: 5, ESFP: 5 },
  ESTJ: { INTJ: 2, INTP: 3, ENTJ: 3, ENTP: 2, INFJ: 2, INFP: 1, ENFJ: 2, ENFP: 2, ISTJ: 4, ISFJ: 4, ESTJ: 3, ESFJ: 3, ISTP: 5, ISFP: 5, ESTP: 3, ESFP: 3 },
  ESFJ: { INTJ: 2, INTP: 1, ENTJ: 2, ENTP: 2, INFJ: 2, INFP: 2, ENFJ: 3, ENFP: 2, ISTJ: 4, ISFJ: 4, ESTJ: 3, ESFJ: 3, ISTP: 5, ISFP: 5, ESTP: 3, ESFP: 3 },
  ISTP: { INTJ: 3, INTP: 3, ENTJ: 3, ENTP: 3, INFJ: 2, INFP: 2, ENFJ: 1, ENFP: 2, ISTJ: 3, ISFJ: 3, ESTJ: 5, ESFJ: 5, ISTP: 3, ISFP: 4, ESTP: 4, ESFP: 3 },
  ISFP: { INTJ: 2, INTP: 2, ENTJ: 1, ENTP: 2, INFJ: 3, INFP: 3, ENFJ: 5, ENFP: 3, ISTJ: 3, ISFJ: 3, ESTJ: 5, ESFJ: 5, ISTP: 4, ISFP: 3, ESTP: 3, ESFP: 4 },
  ESTP: { INTJ: 1, INTP: 2, ENTJ: 2, ENTP: 3, INFJ: 1, INFP: 1, ENFJ: 1, ENFP: 2, ISTJ: 5, ISFJ: 5, ESTJ: 3, ESFJ: 3, ISTP: 4, ISFP: 3, ESTP: 3, ESFP: 4 },
  ESFP: { INTJ: 1, INTP: 2, ENTJ: 1, ENTP: 2, INFJ: 1, INFP: 2, ENFJ: 3, ENFP: 3, ISTJ: 5, ISFJ: 5, ESTJ: 3, ESFJ: 3, ISTP: 3, ISFP: 4, ESTP: 4, ESFP: 3 },
}

// ─── 주요 궁합 상세 분석 ───

export const compatibilityDetails: CompatibilityDetail[] = [
  {
    type1: 'INTJ', type2: 'ENFP', rating: 5,
    firstImpression: {
      male: 'ENFP의 밝고 자유분방한 에너지에 끌리면서도 예상외의 지적 깊이에 놀랍니다. "이렇게 재밌으면서 똑똑할 수가?"라는 생각이 듭니다.',
      female: 'INTJ의 조용한 자신감과 깊이 있는 눈빛에 호기심이 생깁니다. 쉽게 웃지 않는 모습이 오히려 도전 의식을 자극합니다.',
    },
    datingStrengths: {
      male: 'ENFP가 새로운 세계를 보여주고 INTJ가 그것을 현실로 만들어주는 완벽한 시너지. 지적 대화가 끊이지 않습니다.',
      female: 'INTJ의 안정감과 계획 속에서 자유롭게 아이디어를 펼칠 수 있어 행복합니다. 서로의 약점을 자연스럽게 보완합니다.',
    },
    conflictPoints: {
      male: 'ENFP의 즉흥적 변화가 계획을 망칠 때 답답함을 느낍니다. "왜 약속을 쉽게 바꾸지?"라는 불만이 쌓일 수 있습니다.',
      female: 'INTJ의 논리적 비판이 감정적으로 상처가 될 수 있습니다. 사교 모임 참여 거부가 외로움으로 이어지기도 합니다.',
    },
    advice: {
      male: '"틀렸어"보다 "우리 같이 생각해볼까?"로 표현을 바꿔보세요. ENFP의 감정을 인정하는 연습이 관계를 크게 개선합니다.',
      female: '중요한 약속은 반드시 지키려고 노력하세요. INTJ에게 혼자 시간은 충전이지 거부가 아님을 이해해주세요.',
    },
    summary: '이성과 감성의 완벽한 조합 — "황금 커플"',
  },
  {
    type1: 'INFJ', type2: 'ENFP', rating: 5,
    firstImpression: {
      male: 'ENFP의 밝은 에너지 속에서 자신을 진심으로 이해해줄 것 같은 직감이 옵니다. 피상적이지 않은 대화가 가능한 사람이라 느낍니다.',
      female: 'INFJ의 신비로운 분위기와 깊은 이해력에 빠져들게 됩니다. "이 사람은 진짜 나를 보는구나"라는 느낌을 받습니다.',
    },
    datingStrengths: {
      male: '둘 다 NF 유형으로 감정적 깊이와 직관을 공유합니다. 말하지 않아도 서로를 이해하는 텔레파시 같은 교감이 있습니다.',
      female: 'INFJ의 깊이와 ENFP의 열정이 만나 세상에서 가장 의미 있는 관계를 만들어갑니다.',
    },
    conflictPoints: {
      male: 'ENFP의 넓은 인맥과 사교 활동에 에너지가 소모됩니다. 혼자만의 시간을 방해받는 느낌이 들 수 있습니다.',
      female: 'INFJ가 갈등을 회피하고 속으로만 삭일 때 답답합니다. "왜 말을 안 해?"라는 불만이 쌓입니다.',
    },
    advice: {
      male: 'ENFP의 사교 활동을 자신에 대한 거부로 받아들이지 마세요. 필요할 때 솔직하게 감정을 표현하는 연습을 하세요.',
      female: 'INFJ의 혼자 시간을 존중하되, 가끔은 함께 깊은 대화의 시간을 만들어주세요.',
    },
    summary: '영혼을 나누는 소울메이트 조합',
  },
  {
    type1: 'ENTP', type2: 'INFJ', rating: 5,
    firstImpression: {
      male: 'INFJ의 조용한 카리스마와 깊은 통찰력에 지적 호기심이 폭발합니다. 토론할수록 매력적인 사람입니다.',
      female: 'ENTP의 재치와 끝없는 아이디어에 흥미를 느끼면서도, 내면의 따뜻함을 감지합니다.',
    },
    datingStrengths: {
      male: 'INFJ가 ENTP의 산발적인 아이디어에 깊이와 방향을 더해줍니다. 지적 시너지가 뛰어납니다.',
      female: 'ENTP가 새로운 관점과 모험을 선사하면서도, INFJ의 가치관을 존중합니다.',
    },
    conflictPoints: {
      male: 'INFJ가 갈등을 피하면 ENTP는 "도대체 뭐가 문제야?"라며 답답해합니다.',
      female: 'ENTP의 토론 스타일이 때로 비판처럼 느껴져 상처받을 수 있습니다.',
    },
    advice: {
      male: '토론할 때 "공격이 아니라 호기심"이라는 것을 미리 알려주세요. INFJ의 감정적 필요를 존중하세요.',
      female: 'ENTP의 논쟁은 애정 표현의 일종입니다. 불편할 때는 솔직하게 "지금은 공감이 필요해"라고 말하세요.',
    },
    summary: '서로의 사고를 확장하는 지적 시너지',
  },
  {
    type1: 'ENTJ', type2: 'INFP', rating: 5,
    firstImpression: {
      male: 'INFP의 부드러운 감성과 독특한 세계관에 끌립니다. 자신과 완전히 다른 관점이 신선하게 느껴집니다.',
      female: 'ENTJ의 자신감 넘치는 리더십과 결단력에 안정감을 느낍니다. 든든한 사람이라는 인상을 받습니다.',
    },
    datingStrengths: {
      male: 'INFP의 이상을 ENTJ가 현실로 만들어줍니다. 서로를 더 나은 사람으로 성장시키는 힘이 있습니다.',
      female: 'ENTJ의 실행력 덕분에 꿈꾸던 것들이 실현됩니다. 서로 부족한 점을 완벽하게 채워줍니다.',
    },
    conflictPoints: {
      male: 'ENTJ의 직접적 비판이 감수성 높은 INFP에게 큰 상처가 될 수 있습니다.',
      female: 'INFP의 우유부단함과 감정적 의사결정이 ENTJ를 답답하게 만들 수 있습니다.',
    },
    advice: {
      male: '비판보다 격려를 먼저. INFP는 지지받을 때 가장 빛납니다. 감정을 논리로 반박하지 마세요.',
      female: '결정이 필요할 때는 가치관에 기반한 명확한 의견을 내는 연습을 하세요.',
    },
    summary: '꿈과 현실을 잇는 성장 파트너',
  },
  {
    type1: 'ENFJ', type2: 'INFP', rating: 5,
    firstImpression: {
      male: 'INFP의 순수한 감성과 깊은 내면세계에 매료됩니다. 보호해주고 싶다는 마음이 듭니다.',
      female: 'ENFJ의 따뜻한 리더십과 진심 어린 관심에 마음이 열립니다. 안전하고 편안한 느낌을 받습니다.',
    },
    datingStrengths: {
      male: 'INFP의 풍부한 감성을 ENFJ가 이끌어내고 표현하게 도와줍니다. 감정적으로 깊이 연결됩니다.',
      female: 'ENFJ의 헌신과 따뜻함 속에서 자신을 있는 그대로 보여줄 수 있는 안전한 관계입니다.',
    },
    conflictPoints: {
      male: 'ENFJ의 과도한 관심이 INFP에게 부담이 될 수 있습니다. 독립적 공간의 필요를 이해해야 합니다.',
      female: 'INFP의 갈등 회피와 침묵이 ENFJ를 불안하게 만들 수 있습니다.',
    },
    advice: {
      male: 'INFP에게 혼자 생각할 시간을 충분히 주세요. 도와주려는 마음을 조절하는 연습이 필요합니다.',
      female: '갈등이 생겨도 속으로만 삭이지 말고, 안전한 방식으로 감정을 표현하세요.',
    },
    summary: '서로의 마음을 가장 잘 읽는 감정적 파트너',
  },
  {
    type1: 'ISTJ', type2: 'ESFP', rating: 5,
    firstImpression: {
      male: 'ESFP의 밝고 활기찬 에너지가 딱딱한 일상에 활력을 불어넣어 줍니다.',
      female: 'ISTJ의 안정적이고 신뢰할 수 있는 모습에 든든함을 느낍니다.',
    },
    datingStrengths: {
      male: 'ESFP가 즐거움과 모험을, ISTJ가 안정과 계획을 제공합니다. 완벽한 균형입니다.',
      female: 'ISTJ의 신뢰성 속에서 마음 놓고 자유롭게 살 수 있습니다.',
    },
    conflictPoints: {
      male: 'ESFP의 즉흥적 소비와 계획 변경이 스트레스를 줍니다.',
      female: 'ISTJ의 지나친 규칙성과 변화 거부가 답답합니다.',
    },
    advice: {
      male: '가끔은 계획에서 벗어나 즉흥적인 즐거움을 함께 누려보세요.',
      female: '중요한 약속과 재정 관리에서는 ISTJ의 체계를 존중해주세요.',
    },
    summary: '안정과 활력의 완벽한 균형',
  },
  {
    type1: 'ISFJ', type2: 'ESTP', rating: 5,
    firstImpression: {
      male: 'ESTP의 당당하고 매력적인 카리스마에 조용히 빠져들게 됩니다.',
      female: 'ISFJ의 따뜻하고 세심한 배려에 마음이 편안해집니다.',
    },
    datingStrengths: {
      male: 'ESTP가 새로운 경험과 에너지를, ISFJ가 안정과 따뜻한 돌봄을 제공합니다.',
      female: 'ISFJ의 헌신적인 사랑이 ESTP에게 진정한 안식처가 됩니다.',
    },
    conflictPoints: {
      male: 'ESTP의 위험 감수와 즉흥적 행동이 걱정과 불안을 유발합니다.',
      female: 'ISFJ의 소심함과 변화 거부가 답답할 수 있습니다.',
    },
    advice: {
      male: 'ESTP의 모험심을 인정하되, 중요한 결정은 함께 상의하는 규칙을 만드세요.',
      female: 'ISFJ의 헌신에 감사를 자주 표현하세요. 말 한마디가 큰 힘이 됩니다.',
    },
    summary: '모험과 안정이 만나는 보완적 조합',
  },
  {
    type1: 'ESTJ', type2: 'ISTP', rating: 5,
    firstImpression: {
      male: 'ISTP의 독립적이고 실용적인 모습에서 동질감을 느낍니다.',
      female: 'ESTJ의 체계적이고 결단력 있는 모습이 신뢰감을 줍니다.',
    },
    datingStrengths: {
      male: '둘 다 실용적이고 현실적이어서 의견 충돌이 적습니다. 효율적인 파트너십을 만듭니다.',
      female: 'ESTJ가 큰 그림을 그리고 ISTP가 실행하는 역할 분담이 자연스럽습니다.',
    },
    conflictPoints: {
      male: 'ISTP의 규칙 무시와 자유분방함이 답답할 수 있습니다.',
      female: 'ESTJ의 지나친 통제와 규칙 강요가 숨 막히게 느껴질 수 있습니다.',
    },
    advice: {
      male: 'ISTP에게 방법의 자유를 주세요. 결과가 좋으면 과정은 존중해야 합니다.',
      female: '큰 틀의 규칙은 따르되, 디테일에서는 자신만의 방식을 고수할 수 있는 공간을 확보하세요.',
    },
    summary: '실용적인 행동 파트너 — 함께하면 효율 200%',
  },
  {
    type1: 'ESFJ', type2: 'ISFP', rating: 5,
    firstImpression: {
      male: 'ISFP의 예술적 감성과 조용한 매력에 호감을 느낍니다.',
      female: 'ESFJ의 따뜻한 관심과 배려에 마음이 열립니다.',
    },
    datingStrengths: {
      male: 'ISFP의 감성을 ESFJ가 표현하고 공유하는 조화로운 관계입니다.',
      female: 'ESFJ의 사회성이 ISFP의 좁은 세계를 넓혀줍니다.',
    },
    conflictPoints: {
      male: 'ISFP의 감정 표현 서투름이 답답할 수 있습니다.',
      female: 'ESFJ의 사교 욕구와 타인 의식이 부담될 수 있습니다.',
    },
    advice: {
      male: 'ISFP에게 말보다 행동으로 사랑을 표현하는 것이 더 효과적입니다.',
      female: '모든 모임에 함께할 필요 없다는 것을 이해하세요. 혼자 시간도 사랑의 일부입니다.',
    },
    summary: '감성과 따뜻함이 만나는 조화로운 커플',
  },
  {
    type1: 'ENFJ', type2: 'ISFP', rating: 5,
    firstImpression: {
      male: 'ISFP의 조용한 아름다움과 진정성 있는 모습에 끌립니다.',
      female: 'ENFJ의 따뜻한 카리스마와 자신에 대한 진심 어린 관심에 마음이 열립니다.',
    },
    datingStrengths: {
      male: 'ENFJ의 리더십과 ISFP의 부드러운 감성이 완벽하게 조화됩니다.',
      female: 'ENFJ가 이끌어주면서도 ISFP의 자유를 존중하는 균형 잡힌 관계입니다.',
    },
    conflictPoints: {
      male: 'ISFP의 내면 세계에 접근하기 어려울 때 답답할 수 있습니다.',
      female: 'ENFJ가 너무 많은 것을 관리하려 할 때 부담스러울 수 있습니다.',
    },
    advice: {
      male: 'ISFP가 준비될 때까지 기다려주세요. 강요하면 오히려 닫힙니다.',
      female: '편안하게 감정을 나누는 연습을 해보세요. ENFJ는 당신의 이야기를 진심으로 듣고 싶어합니다.',
    },
    summary: '리더와 예술가의 아름다운 조화',
  },
]

// ─── 일반 궁합 설명 생성 함수 ───

export function getCompatibilityRatingLabel(rating: CompatibilityRating): string {
  switch (rating) {
    case 5: return '천생연분'
    case 4: return '매우좋음'
    case 3: return '좋음'
    case 2: return '보통'
    case 1: return '주의'
  }
}

export function getCompatibilityRatingColor(rating: CompatibilityRating): string {
  switch (rating) {
    case 5: return '#22c55e' // green
    case 4: return '#3b82f6' // blue
    case 3: return '#a855f7' // purple
    case 2: return '#f59e0b' // amber
    case 1: return '#ef4444' // red
  }
}

export function getCompatibilityEmoji(rating: CompatibilityRating): string {
  switch (rating) {
    case 5: return '💚'
    case 4: return '💙'
    case 3: return '💜'
    case 2: return '💛'
    case 1: return '❤️‍🔥'
  }
}

// 상세 분석이 없는 궁합에 대한 자동 생성 설명
export function generateGenericAnalysis(type1: MbtiType, type2: MbtiType): CompatibilityDetail {
  const p1 = mbtiProfiles[type1]
  const p2 = mbtiProfiles[type2]
  const rating = compatibilityMatrix[type1][type2]

  // 공통 지표 수 계산
  const common = [0, 1, 2, 3].filter(i => type1[i] === type2[i]).length

  const sameEI = type1[0] === type2[0]
  const sameSN = type1[1] === type2[1]
  const sameTF = type1[2] === type2[2]
  const sameJP = type1[3] === type2[3]

  let firstImpressionMale: string
  let firstImpressionFemale: string
  let strengthsMale: string
  let strengthsFemale: string
  let conflictMale: string
  let conflictFemale: string
  let adviceMale: string
  let adviceFemale: string
  let summary: string

  if (rating >= 4) {
    firstImpressionMale = `${p2.nickname}(${type2})의 ${p2.traits[0]}과 ${p2.traits[1]}에 자연스럽게 끌립니다. 처음부터 편안한 교감이 느껴지는 상대입니다.`
    firstImpressionFemale = `${p1.nickname}(${type1})의 ${p1.traits[0]}과 ${p1.traits[2]}에서 매력을 느낍니다. 함께 있으면 자연스럽게 마음이 열리는 상대입니다.`
    strengthsMale = `서로의 ${sameSN ? '같은 인식 방식' : '다른 관점'}이 관계에 풍요를 더합니다. ${sameTF ? '판단 기준이 비슷해 갈등이 적고' : p1.traits[2] + '과 ' + p2.traits[2] + '이 조화를 이루며'} 함께 성장합니다.`
    strengthsFemale = `${p1.nickname}의 ${p1.strengths[0]}과 ${p2.nickname}의 ${p2.strengths[0]}이 시너지를 만듭니다. 서로에게서 배울 점이 많은 관계입니다.`
  } else if (rating === 3) {
    firstImpressionMale = `${p2.nickname}(${type2})에게서 ${common >= 2 ? '친근함과 동질감' : '새로움과 호기심'}을 느낍니다.`
    firstImpressionFemale = `${p1.nickname}(${type1})에게서 ${common >= 2 ? '편안함' : '다른 매력'}을 발견합니다.`
    strengthsMale = `${sameSN ? '세상을 바라보는 눈이 비슷해 대화가 잘 통합니다.' : '서로 다른 시각이 관계에 균형을 가져옵니다.'}`
    strengthsFemale = `${sameTF ? '의사결정 방식이 비슷해 갈등이 적은 편입니다.' : '서로의 판단 방식에서 새로운 관점을 배울 수 있습니다.'}`
  } else {
    firstImpressionMale = `${p2.nickname}(${type2})의 ${p2.traits[0]} 성향이 자신과 달라 흥미롭지만 어색함이 공존합니다.`
    firstImpressionFemale = `${p1.nickname}(${type1})의 ${p1.traits[0]} 성향에 신기함을 느끼지만 거리감이 있을 수 있습니다.`
    strengthsMale = `서로 완전히 다른 강점을 가져 보완이 가능합니다. ${p2.strengths[0]}은 ${type1}에게 부족한 부분을 채워줍니다.`
    strengthsFemale = `${p1.strengths[0]}은 ${type2}에게 새로운 시각을 제공합니다. 노력한다면 크게 성장할 수 있는 관계입니다.`
  }

  if (!sameEI) {
    conflictMale = `에너지 방향이 달라 ${type1[0] === 'E' ? '혼자 시간을 원하는 상대가 답답할 수 있습니다' : '너무 많은 사교 활동이 부담될 수 있습니다'}.`
    conflictFemale = `${type2[0] === 'E' ? '조용한 시간이 부족하다고 느낄 수 있습니다' : '좀 더 적극적인 사교를 원할 수 있습니다'}.`
  } else {
    conflictMale = `${!sameSN ? '정보를 받아들이는 방식이 달라 오해가 생길 수 있습니다. 구체적 사실 vs 가능성에 대한 관점 차이를 인정하세요.' : !sameTF ? '감정 vs 논리로 판단 기준이 달라 의견 충돌이 생길 수 있습니다.' : '비슷한 성향이라 자극이 부족하거나 같은 약점이 증폭될 수 있습니다.'}`
    conflictFemale = `${!sameJP ? '생활 패턴의 차이(계획 vs 즉흥)가 일상에서 마찰을 일으킬 수 있습니다.' : '서로 너무 비슷해서 새로운 관점이 부족할 수 있습니다.'}`
  }

  adviceMale = `상대의 ${p2.weaknesses[0]}을 비판하지 말고 이해하려 노력하세요. ${sameTF ? '같은 판단 기준을 가진 만큼 공감은 쉽지만 다양성이 필요합니다.' : '서로의 판단 방식 차이를 존중하는 것이 핵심입니다.'}`
  adviceFemale = `${p1.weaknesses[0]}은 ${type1}의 약점이 아닌 특성으로 받아들이세요. ${sameEI ? '에너지 방향이 같으니 함께하는 활동을 찾아보세요.' : '서로의 에너지 충전 방식을 존중하는 시간 배분이 중요합니다.'}`

  if (rating === 5) summary = `${p1.nickname}과 ${p2.nickname}의 완벽한 조합`
  else if (rating === 4) summary = `서로를 성장시키는 좋은 파트너`
  else if (rating === 3) summary = `노력하면 충분히 좋은 관계`
  else if (rating === 2) summary = `다르지만 이해하면 발전 가능`
  else summary = `차이가 크지만 노력으로 극복 가능`

  return {
    type1, type2, rating,
    firstImpression: { male: firstImpressionMale, female: firstImpressionFemale },
    datingStrengths: { male: strengthsMale, female: strengthsFemale },
    conflictPoints: { male: conflictMale, female: conflictFemale },
    advice: { male: adviceMale, female: adviceFemale },
    summary,
  }
}

// 상세 분석 조회 (없으면 자동 생성)
export function getCompatibilityDetail(type1: MbtiType, type2: MbtiType): CompatibilityDetail {
  const detail = compatibilityDetails.find(
    d => (d.type1 === type1 && d.type2 === type2) || (d.type1 === type2 && d.type2 === type1)
  )
  if (detail) {
    // 순서가 뒤바뀐 경우 male/female 관점도 swap
    if (detail.type1 === type2 && detail.type2 === type1) {
      return {
        ...detail,
        type1, type2,
        firstImpression: { male: detail.firstImpression.female, female: detail.firstImpression.male },
        datingStrengths: { male: detail.datingStrengths.female, female: detail.datingStrengths.male },
        conflictPoints: { male: detail.conflictPoints.female, female: detail.conflictPoints.male },
        advice: { male: detail.advice.female, female: detail.advice.male },
      }
    }
    return detail
  }
  return generateGenericAnalysis(type1, type2)
}

// ─── 48문항 검사 ───

export const testQuestions: TestQuestion[] = [
  // E/I 축 (12문항)
  { id: 1, axis: 'EI', question: '주말을 어떻게 보내는 게 더 좋아요?', optionA: { text: '친구들이랑 약속 잡기', value: 'E' }, optionB: { text: '집에서 혼자 쉬기', value: 'I' } },
  { id: 2, axis: 'EI', question: '파티에 갔을 때 나는?', optionA: { text: '낯선 사람들과 대화하며 에너지 충전', value: 'E' }, optionB: { text: '아는 사람 찾아 조용히 있다가 일찍 귀가', value: 'I' } },
  { id: 3, axis: 'EI', question: '피곤할 때 회복 방법은?', optionA: { text: '사람들과 어울리며 기분 전환', value: 'E' }, optionB: { text: '혼자 있는 시간으로 충전', value: 'I' } },
  { id: 4, axis: 'EI', question: '새로운 환경에서 나는?', optionA: { text: '빠르게 사람들과 친해지는 편', value: 'E' }, optionB: { text: '상황을 먼저 파악하고 천천히 적응', value: 'I' } },
  { id: 5, axis: 'EI', question: '연락하는 스타일은?', optionA: { text: '먼저 연락하고 자주 연락하는 편', value: 'E' }, optionB: { text: '연락이 오면 답하는 편, 연락이 뜸함', value: 'I' } },
  { id: 6, axis: 'EI', question: '수업이나 회의에서 나는?', optionA: { text: '의견을 먼저 말하는 편', value: 'E' }, optionB: { text: '다른 사람 말 듣고 생각 정리 후 발언', value: 'I' } },
  { id: 7, axis: 'EI', question: '혼자 밥 먹는 것이?', optionA: { text: '불편하고 어색하다', value: 'E' }, optionB: { text: '오히려 편하고 좋다', value: 'I' } },
  { id: 8, axis: 'EI', question: '카페에서 공부할 때?', optionA: { text: '시끌벅적한 공간이 집중에 도움', value: 'E' }, optionB: { text: '조용한 독서실이 훨씬 낫다', value: 'I' } },
  { id: 9, axis: 'EI', question: 'SNS 사용 패턴은?', optionA: { text: '자주 게시물 올리고 반응 확인', value: 'E' }, optionB: { text: '보기만 하고 잘 안 올림', value: 'I' } },
  { id: 10, axis: 'EI', question: '모임이 끝난 후 기분은?', optionA: { text: '에너지가 오르는 느낌', value: 'E' }, optionB: { text: '에너지가 빠지는 느낌', value: 'I' } },
  { id: 11, axis: 'EI', question: '나를 표현하자면?', optionA: { text: '말로 생각을 풀어내는 편', value: 'E' }, optionB: { text: '글이나 혼자 생각으로 정리', value: 'I' } },
  { id: 12, axis: 'EI', question: '좋아하는 사람이 생겼을 때?', optionA: { text: '적극적으로 다가가고 표현한다', value: 'E' }, optionB: { text: '관찰하고 조심스럽게 신호를 보낸다', value: 'I' } },

  // S/N 축 (12문항)
  { id: 13, axis: 'SN', question: '여행 계획을 세울 때?', optionA: { text: '맛집, 관광지 등 구체적 일정 짜기', value: 'S' }, optionB: { text: '대략적인 방향만 잡고 즉흥으로', value: 'N' } },
  { id: 14, axis: 'SN', question: '소설이나 영화를 볼 때?', optionA: { text: '현실적인 이야기가 더 재밌다', value: 'S' }, optionB: { text: '상징적이거나 철학적인 작품이 흥미롭다', value: 'N' } },
  { id: 15, axis: 'SN', question: '새로운 정보를 접할 때?', optionA: { text: '실제로 어디에 쓸지 먼저 생각', value: 'S' }, optionB: { text: '이면의 의미나 가능성이 더 궁금', value: 'N' } },
  { id: 16, axis: 'SN', question: '문제를 해결할 때?', optionA: { text: '검증된 방법으로 차근차근', value: 'S' }, optionB: { text: '새로운 접근법을 먼저 시도', value: 'N' } },
  { id: 17, axis: 'SN', question: '대화할 때 주로?', optionA: { text: '구체적인 사례와 경험 이야기', value: 'S' }, optionB: { text: '추상적인 아이디어와 가능성 이야기', value: 'N' } },
  { id: 18, axis: 'SN', question: '미래에 대해?', optionA: { text: '현실적인 계획과 준비가 중요', value: 'S' }, optionB: { text: '여러 가능성을 상상하고 꿈꿈', value: 'N' } },
  { id: 19, axis: 'SN', question: '기억하는 것은?', optionA: { text: '세부 사항, 숫자, 사실', value: 'S' }, optionB: { text: '전체 흐름, 패턴, 분위기', value: 'N' } },
  { id: 20, axis: 'SN', question: '요리할 때?', optionA: { text: '레시피를 그대로 따른다', value: 'S' }, optionB: { text: '즉흥적으로 변형해 본다', value: 'N' } },
  { id: 21, axis: 'SN', question: '관심사의 범위는?', optionA: { text: '하나를 깊게 파고드는 편', value: 'S' }, optionB: { text: '다양한 분야를 넓게 탐구', value: 'N' } },
  { id: 22, axis: 'SN', question: '직관을 믿나요?', optionA: { text: '증거가 있어야 믿음', value: 'S' }, optionB: { text: '느낌이나 육감을 자주 신뢰', value: 'N' } },
  { id: 23, axis: 'SN', question: '현재 vs 미래?', optionA: { text: '지금 이 순간이 더 중요', value: 'S' }, optionB: { text: '앞으로의 가능성이 더 기대됨', value: 'N' } },
  { id: 24, axis: 'SN', question: '설명할 때 선호하는 방식은?', optionA: { text: '단계별로 구체적이고 자세하게', value: 'S' }, optionB: { text: '비유나 은유로 큰 그림 먼저', value: 'N' } },

  // T/F 축 (12문항)
  { id: 25, axis: 'TF', question: '친구가 고민 상담을 할 때?', optionA: { text: '해결책을 먼저 제시한다', value: 'T' }, optionB: { text: '먼저 공감하고 감정을 들어준다', value: 'F' } },
  { id: 26, axis: 'TF', question: '결정을 내릴 때 기준은?', optionA: { text: '논리와 객관적 기준', value: 'T' }, optionB: { text: '사람들의 감정과 관계 영향', value: 'F' } },
  { id: 27, axis: 'TF', question: '다른 의견을 들었을 때?', optionA: { text: '논리적으로 반박하거나 토론', value: 'T' }, optionB: { text: '상대 입장을 이해하려 노력', value: 'F' } },
  { id: 28, axis: 'TF', question: '팀 프로젝트에서 먼저 생각하는 것은?', optionA: { text: '효율적인 역할 분담', value: 'T' }, optionB: { text: '팀원 감정과 분위기', value: 'F' } },
  { id: 29, axis: 'TF', question: '비판을 받았을 때?', optionA: { text: '내용이 맞으면 수용함', value: 'T' }, optionB: { text: '말하는 방식이 마음에 걸림', value: 'F' } },
  { id: 30, axis: 'TF', question: '잘못된 일을 보았을 때?', optionA: { text: '무엇이 잘못인지 분석', value: 'T' }, optionB: { text: '피해받은 사람의 감정이 더 걱정', value: 'F' } },
  { id: 31, axis: 'TF', question: '친구와 의견이 충돌하면?', optionA: { text: '내가 맞으면 계속 설득한다', value: 'T' }, optionB: { text: '관계 유지를 위해 양보하는 편', value: 'F' } },
  { id: 32, axis: 'TF', question: '인생에서 더 중요한 것은?', optionA: { text: '공정함과 원칙', value: 'T' }, optionB: { text: '조화와 따뜻한 관계', value: 'F' } },
  { id: 33, axis: 'TF', question: '칭찬 vs 정확한 피드백?', optionA: { text: '정확한 피드백이 더 도움 됨', value: 'T' }, optionB: { text: '칭찬이 동기부여에 더 중요', value: 'F' } },
  { id: 34, axis: 'TF', question: '드라마나 영화를 볼 때?', optionA: { text: '스토리의 논리적 허점을 찾음', value: 'T' }, optionB: { text: '캐릭터 감정에 몰입해 눈물 흘림', value: 'F' } },
  { id: 35, axis: 'TF', question: '규칙에 대해?', optionA: { text: '모두에게 공정하게 적용돼야 함', value: 'T' }, optionB: { text: '상황에 따라 유연하게 적용', value: 'F' } },
  { id: 36, axis: 'TF', question: '힘든 친구에게 하는 말?', optionA: { text: '"이렇게 하면 나아질 거야" 조언', value: 'T' }, optionB: { text: '"많이 힘들었겠다" 공감', value: 'F' } },

  // J/P 축 (12문항)
  { id: 37, axis: 'JP', question: '여행 전날 밤?', optionA: { text: '짐이 다 준비돼 있다', value: 'J' }, optionB: { text: '당일 아침에 급하게 싼다', value: 'P' } },
  { id: 38, axis: 'JP', question: '할 일 목록은?', optionA: { text: '항상 리스트 작성하고 체크', value: 'J' }, optionB: { text: '머릿속에 대충 있거나 없음', value: 'P' } },
  { id: 39, axis: 'JP', question: '약속 시간에?', optionA: { text: '10분 전에 도착하는 편', value: 'J' }, optionB: { text: '딱 맞게 오거나 약간 늦기도', value: 'P' } },
  { id: 40, axis: 'JP', question: '숙제나 과제 제출은?', optionA: { text: '마감 훨씬 전에 완료', value: 'J' }, optionB: { text: '마감 직전에 집중해서 해냄', value: 'P' } },
  { id: 41, axis: 'JP', question: '방 상태는?', optionA: { text: '정리된 공간을 선호', value: 'J' }, optionB: { text: '다소 어수선해도 내 방식이 있음', value: 'P' } },
  { id: 42, axis: 'JP', question: '결정을 내릴 때?', optionA: { text: '빠르게 내리고 싶다', value: 'J' }, optionB: { text: '열린 채로 두다가 자연스럽게', value: 'P' } },
  { id: 43, axis: 'JP', question: '계획이 갑자기 바뀌면?', optionA: { text: '불편하고 스트레스 받음', value: 'J' }, optionB: { text: '어 그래요? 다른 거 해보지 뭐', value: 'P' } },
  { id: 44, axis: 'JP', question: '시간 관리 방식은?', optionA: { text: '스케줄러/캘린더 적극 활용', value: 'J' }, optionB: { text: '시간이 되면 하는 편', value: 'P' } },
  { id: 45, axis: 'JP', question: '영화를 고를 때?', optionA: { text: '미리 보고 싶은 것 찜해둠', value: 'J' }, optionB: { text: '그때그때 기분에 따라 고름', value: 'P' } },
  { id: 46, axis: 'JP', question: '쇼핑할 때?', optionA: { text: '살 것 목록 정해두고 간다', value: 'J' }, optionB: { text: '돌아다니다 마음에 들면 산다', value: 'P' } },
  { id: 47, axis: 'JP', question: '퇴근 후나 수업 후?', optionA: { text: '오늘 할 것이 이미 정해져 있음', value: 'J' }, optionB: { text: '기분 봐서 결정', value: 'P' } },
  { id: 48, axis: 'JP', question: '다음 주 계획이?', optionA: { text: '이미 대략 잡혀 있다', value: 'J' }, optionB: { text: '아직 없음, 그때 보면 됨', value: 'P' } },
]

// ─── 검사 결과 계산 ───

export interface TestResult {
  type: MbtiType
  scores: {
    E: number; I: number
    S: number; N: number
    T: number; F: number
    J: number; P: number
  }
  percentages: {
    EI: number // E의 %, 100-EI = I의 %
    SN: number // S의 %
    TF: number // T의 %
    JP: number // J의 %
  }
}

export function calculateResult(answers: Record<number, string>): TestResult {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }

  Object.values(answers).forEach(value => {
    if (value in scores) {
      scores[value as keyof typeof scores]++
    }
  })

  const type = (
    (scores.E >= scores.I ? 'E' : 'I') +
    (scores.S >= scores.N ? 'S' : 'N') +
    (scores.T >= scores.F ? 'T' : 'F') +
    (scores.J >= scores.P ? 'J' : 'P')
  ) as MbtiType

  const percentages = {
    EI: Math.round((scores.E / (scores.E + scores.I)) * 100) || 50,
    SN: Math.round((scores.S / (scores.S + scores.N)) * 100) || 50,
    TF: Math.round((scores.T / (scores.T + scores.F)) * 100) || 50,
    JP: Math.round((scores.J / (scores.J + scores.P)) * 100) || 50,
  }

  return { type, scores, percentages }
}
