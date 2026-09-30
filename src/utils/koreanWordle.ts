// 한글 워들 순수 로직: 자모(키 입력 단위) 분해 · 채점 · 두벌식 조합 · 단어장 · 오늘의 단어 · 통계 · 공유 문구
// 회귀 체크: node scripts/check-korean-wordle.ts

export const MAX_GUESSES = 6
export type WordLen = 2 | 3
export type Tile = 'correct' | 'present' | 'absent'

// ── 자모 ────────────────────────────────────────────────────────────────────
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
// 겹모음·겹받침 = 두벌식 키 두 번 (ㅘ = ㅗ+ㅏ, ㄺ = ㄹ+ㄱ)
const SPLIT: Record<string, string> = {
  'ㅘ':'ㅗㅏ','ㅙ':'ㅗㅐ','ㅚ':'ㅗㅣ','ㅝ':'ㅜㅓ','ㅞ':'ㅜㅔ','ㅟ':'ㅜㅣ','ㅢ':'ㅡㅣ',
  'ㄳ':'ㄱㅅ','ㄵ':'ㄴㅈ','ㄶ':'ㄴㅎ','ㄺ':'ㄹㄱ','ㄻ':'ㄹㅁ','ㄼ':'ㄹㅂ','ㄽ':'ㄹㅅ','ㄾ':'ㄹㅌ','ㄿ':'ㄹㅍ','ㅀ':'ㄹㅎ','ㅄ':'ㅂㅅ',
}
const JOIN: Record<string, string> = Object.fromEntries(Object.entries(SPLIT).map(([k, v]) => [v, k]))
const isCho = (j: string) => CHO.includes(j)
const isVowel = (j: string) => JUNG.includes(j)

export const isSyllable = (ch: string) => /^[가-힣]$/.test(ch)

/** 한 음절 → 키 입력 단위 자모 (과 → ㄱㅗㅏ, 닭 → ㄷㅏㄹㄱ). 채점·키보드 색이 이 단위로 일치 */
export function syllableKeys(ch: string): string[] {
  const c = ch.charCodeAt(0) - 0xac00
  if (c < 0 || c > 11171) return [ch]
  const parts = [CHO[Math.floor(c / 588)], JUNG[Math.floor((c % 588) / 28)], JONG[c % 28]]
  return parts.flatMap(p => [...(SPLIT[p] ?? p)])
}
export const wordKeys = (w: string) => [...w].map(syllableKeys)

// ── 두벌식 조합: 누른 키 배열 → 글자 (백스페이스 = 마지막 키 제거) ─────────
export function compose(keys: string[]): string {
  let out = ''
  let cho = '', jung = '', jong = ''
  const flush = () => {
    if (cho && jung) out += String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + JONG.indexOf(jong))
    else out += cho + jung
    cho = jung = jong = ''
  }
  for (const k of keys) {
    if (isCho(k)) {
      if (cho && jung && !jong && JONG.includes(k)) jong = k
      else if (jong && JOIN[jong + k]) jong = JOIN[jong + k]
      else { flush(); cho = k }
    } else if (isVowel(k)) {
      if (cho && !jung) jung = k
      else if (jung && !jong && JOIN[jung + k]) jung = JOIN[jung + k]
      else if (jong) {
        // 받침이 다음 글자 초성으로 넘어감 (갑+ㅏ → 가바, 닭+ㅏ → 달가)
        const [keep, move] = SPLIT[jong] ? [...SPLIT[jong]] : ['', jong]
        jong = keep
        flush(); cho = move; jung = k
      } else { flush(); jung = k }
    }
  }
  flush()
  return out
}

// ── 채점: 초록 먼저, 남은 개수만큼 노랑 (중복 자모 처리) ─────────────────────
/** 위치 = (음절 번호, 음절 안 키 순서). 반환: 음절별 자모 상태 */
export function score(guess: string, answer: string): Tile[][] {
  const g = wordKeys(guess), a = wordKeys(answer)
  const res: Tile[][] = g.map(s => s.map(() => 'absent' as Tile))
  const left: Record<string, number> = {}
  a.forEach((s, si) => s.forEach((j, ji) => {
    if (g[si]?.[ji] === j) res[si][ji] = 'correct'
    else left[j] = (left[j] ?? 0) + 1
  }))
  g.forEach((s, si) => s.forEach((j, ji) => {
    if (res[si][ji] !== 'correct' && left[j] > 0) { res[si][ji] = 'present'; left[j]-- }
  }))
  return res
}

const RANK: Record<Tile, number> = { absent: 0, present: 1, correct: 2 }
/** 화면 키보드 색: 자모별 가장 좋은 결과 */
export function keyStatuses(guesses: string[], answer: string): Record<string, Tile> {
  const m: Record<string, Tile> = {}
  for (const g of guesses) {
    const sc = score(g, answer)
    wordKeys(g).forEach((s, si) => s.forEach((j, ji) => {
      const t = sc[si][ji]
      if (!m[j] || RANK[t] > RANK[m[j]]) m[j] = t
    }))
  }
  return m
}

/** 하드 모드: 직전 추측의 초록은 같은 자리에, 노랑은 (개수만큼) 어딘가에 포함해야 함 */
export function hardModeError(prev: string, answer: string, guess: string): { kind: 'correct' | 'present'; jamo: string } | null {
  const sc = score(prev, answer), pk = wordKeys(prev), gk = wordKeys(guess)
  const need: Record<string, number> = {}
  for (let si = 0; si < pk.length; si++) for (let ji = 0; ji < pk[si].length; ji++) {
    const j = pk[si][ji]
    if (sc[si][ji] === 'correct' && gk[si]?.[ji] !== j) return { kind: 'correct', jamo: j }
    if (sc[si][ji] !== 'absent') need[j] = (need[j] ?? 0) + 1
  }
  const have: Record<string, number> = {}
  gk.flat().forEach(j => { have[j] = (have[j] ?? 0) + 1 })
  for (const j in need) if ((have[j] ?? 0) < need[j]) return { kind: 'present', jamo: j }
  return null
}

export type GameStatus = 'playing' | 'won' | 'lost'
export const statusOf = (guesses: string[], answer: string): GameStatus =>
  guesses.includes(answer) ? 'won' : guesses.length >= MAX_GUESSES ? 'lost' : 'playing'

// ── 단어장 ─────────────────────────────────────────────────────────────────
// ponytail: 오늘의 단어는 ANSWERS_2 배열 순서에서 결정됨 → 추가·순서 변경 시 이후(당일 포함) 단어가 바뀜. 바꾸려면 끝에 추가하고 자정 직후 배포.
const w = (s: string) => s.trim().split(/\s+/)

export const ANSWERS: Record<WordLen, string[]> = {
  2: w(`
    사랑 행복 우정 희망 자유 평화 건강 미래 감사 용기 지혜 노력 열정 기쁨 슬픔 걱정 추억 기억 생각 마음
    가족 친구 이웃 동생 언니 오빠 누나 아빠 엄마 부모 아들 형제 자매 부부 학생 아기 어른 사람 손님 삼촌
    하늘 구름 바람 나무 바다 태양 달빛 별빛 안개 번개 태풍 이슬 서리 노을 햇살
    아침 저녁 오늘 내일 어제 새벽 여름 가을 겨울 시간 세월 낮잠 주말 휴일 계절 올해 작년 순간 점심
    상상 약속 비밀 선물 편지 미소 웃음 눈물 행운 인연 소원 용서
    성공 도전 변화 성장 목표 결과 실력 능력 재능 승리 완성
    커피 국수 김치 된장 라면 치킨 피자 사과 딸기 포도 수박 참외 호박 감자 양파 당근 만두 떡국 김밥 냉면
    두부 우유 달걀 과자 사탕 반찬 간식 녹차 맥주 치즈 오이
    학교 교실 공부 시험 성적 과목 수업 숙제 독서 글자 문장 단어 질문 대답 선택 발표 방학 소풍 졸업 입학 칠판 연필 공책
    여행 음악 영화 운동 요리 산책 등산 수영 축구 야구 농구 배구 탁구 골프 노래 그림 사진 낚시 캠핑 청소 빨래 목욕
    공원 거리 마을 도시 시장 병원 약국 은행 식당 카페 공항 항구 도로 극장 광장 시골 고향 동네
    직장 회사 회의 출근 퇴근 월급 연봉 취업 면접 휴가 사장 직원 동료
    게임 로봇 과학 기술
    머리 가슴 허리 어깨 무릎 발목 손목 입술 얼굴 눈썹 이마 심장 손톱
    우주 지구 은하 행성 위성 혜성
    소리 향기 물결 파도 해변 석양 새싹 열매 뿌리 줄기 잔디 계곡 폭포 동굴 언덕 사막 화산 온천 호수 바위 모래 단풍 낙엽 장미 국화 벚꽃
    우산 시계 안경 가방 의자 책상 거울 베개 이불 달력 신발 모자 양말 장갑 지갑 열쇠 가위 풍선 인형 수건 비누 접시 냄비 그릇
    기차 버스 택시 운전 주차
    동물 사자 여우 늑대 토끼 판다 하마 기린 오리 참새 까치 거미 개미 나비 모기 고래 상어 문어 새우 조개 연어 사슴
    빨강 노랑 파랑 초록 보라 분홍 주황
    날씨 기온 장마 가뭄 폭설 천둥
    거실 부엌 안방 욕실 현관 창문 지붕 계단 마당 정원
    축제 공연 무대 배우 가수 박수 연극 소설 동화 만화 신문 뉴스 광고 방송
    경제 주식 투자 저축 적금 이자 대출 세금 보험 연금 월세 전세 가격 할인
    생일 명절 결혼 거짓 기분 꿈길 날개
    가게 거품 공기 과일 구두 그네 기적 꽃잎 나라 난로 남매 냄새 노트 놀이 눈빛 늦잠 달님 도둑 돼지 땅콩
    마술 막내 먼지 메뉴 모양 미역 바지 반지 배추 버섯 보물 보석 봄날 빙수 색깔 생선 소금 소파 수저 숲길
    시인 신호 쌀밥 악기 얼음 여권 연못 영웅 왕관 요정 우물 유령 음식 이름 일기 자석 잠옷 장난 전화 종이
    주스 지도 창고 첫눈 촛불 추석 치마 침대 칭찬 코트 탁자 트럭 파티 팥죽 풍경 피리 하루 하품 한글 햇빛 화분 휴지 흰색
  `),
  3: w(`
    고양이 강아지 호랑이 코끼리 원숭이 다람쥐 거북이 햄스터 앵무새 돌고래 독수리 병아리 비둘기 올빼미 너구리 지렁이 개구리 캥거루
    바나나 복숭아 토마토 오렌지 시금치 콩나물 옥수수 고구마 도토리
    어머니 아버지 할머니 선생님 아저씨 어린이 청소년 대학생
    도서관 우체국 경찰서 소방서 미술관 박물관 영화관 운동장 수영장 놀이터 편의점 미용실 세탁소 유치원 대학교 백화점
    컴퓨터 인터넷 냉장고 세탁기 청소기 선풍기 에어컨 자동차 비행기 자전거 지하철
    떡볶이 비빔밥 삼겹살 칼국수 햄버거 초콜릿 도시락 불고기
    무지개 소나기 눈사람 민들레 진달래 개나리 무궁화 소나무
    손가락 발가락 팔꿈치 외로움 그리움 즐거움 두려움 자신감 책임감 호기심
    이야기 사투리 줄넘기 사다리 바구니 거짓말 노래방 목욕탕 반창고 빗자루 주머니 지우개 휴대폰
    사계절 사춘기 발자국 별자리 밤하늘 나뭇잎 나침반 돌멩이 쓰레기 아파트 가로등 신호등
  `),
}

const EXTRA: Record<WordLen, string[]> = {
  2: w(`
    가게 가격 가구 가난 가능 가문 가사 가상 가요 가입 가장 가정 가지 가치 각도 각자 간호 갈등 갈비 감각 감기 감독 감동 감정
    강물 강변 강사 강의 강조 개념 개발 개선 개성 개인 개월 거절 거품 건물 건설 건축 걸음 검사 검색 검정 겉옷 격려
    결론 결석 결심 결정 경기 경력 경비 경쟁 경찰 경치 경험 계란 계산 계속 계약 계획 고개 고객 고기 고생 고속 곡식 곡선
    골목 공간 공기 공룡 공사 공장 공주 공짜 과거 과일 과장 과정 과제 관객 관계 관광 관심 교사 교수 교육 교통 교환
    구두 구멍 구석 구역 구조 국가 국물 국민 국어 군대 군인 굴뚝 권리 귀신 규칙 균형 그네 그늘 그물 근육 근처 글씨 금지
    기간 기계 기관 기념 기능 기대 기록 기본 기사 기적 기초 기침 기타 기회 기후 긴장 길이 깃발 꼬리 꽃잎 꽃병 꿀벌 끈기
    가로 가루 가면 가속 가짜 가축 각오 간격 간판 갈색 감시 감옥 감탄 갑옷 강당 강력 강철 강화 개그 개울 개학 객실
    거래 거인 거지 건조 검토 게시 겨자 격투 견학 결승 결함 겸손 경고 경로 경매 경영 경우 경주 계기 계층 고독 고무 고백
    고비 고요 고원 고추 고층 고통 곡물 곤충 골대 공격 공동 공식 공포 공학 과녁 과속 과외 관리 관절 광물 광선 괴물 교훈
    구경 구급 구매 구슬 국경 국기 국왕 국제 군사 궁전 권력 귀국 귀족 규모 그룹 극복 근거 근무 금고 금속 금액 기둥 기름
    기부 기운 기자 기준 기지 기호 긴급 길목 깃털 까닭 껍질 꼭지 꽃길 꽃밭
    나라 나이 난로 남녀 남매 남쪽 남편 냄새 노동 노인 녹색 논리 논문 농담 농민 농사 농장 눈빛 늦잠 낙서 낙원 난방 날짜
    남극 남자 낭비 내부 노트 녹음 논쟁 놀이 농부 높이 눈길 눈앞 눈치 내용 노력 누리
    다리 다음 단계 단점 단체 담요 답장 대가 대륙 대문 대학 대화 대회 도구 도움 독자 동료 동전 동쪽 두뇌 뒷면 등대 등록
    다락 단골 단순 단짝 달님 달밤 담장 답변 당번 대기 대비 대신 대장 대책 대표 대포 댓글 덕분 도둑 도마 도망 도서 도착
    독감 독립 돌담 동기 동상 동의 동창 동행 돼지 두께 두통 뒷산 드럼 등급 등불 땅콩 떡집 뚜껑
    레몬 로켓 리본 마감 마녀 마늘 마법 마비 마차 마찰 만남 만세 만족 말투 매력 매미 매실 매일 맥박 먹이 메달 메모 면적
    명상 명예 모험 목록 목숨 목장 몸살 몸짓 무기 무늬 무덤 무료 무술 무용 무한 문구 문법 문학 물감 물병 미끼 미로 미역
    미용 민박 밀림 마술 막내 말씀 먼지 메뉴 명령 모양 모임 목적 무게 문자 문제 문화 물건 미술 민족 믿음 마당 모기
    바닥 반대 발견 발명 방법 방향 번호 벌레 법률 벽지 별명 보리 보물 보안 복도 복습 볼펜 봄날 부분 부자 북쪽 분노 불꽃
    불안 비용 빗물 빵집 바늘 바지 박사 박자 반지 반칙 발레 밤길 방석 방패 배꼽 배달 배추 백조 버섯 번역 벌금 범인 범죄
    법원 벽돌 변명 보고 보름 보석 보호 복권 본능 볼일 봉투 부대 부족 부탁 분수 불빛 붕대 비교 비극 비단 비명 비상 비서
    비율 빙수 빛깔 뼈대 뽀뽀
    사업 사원 사회 상자 상처 상품 생활 서랍 서류 선배 선생 선수 설명 설탕 성격 세계 세상 소금 소문 소식 속도 수학 순서
    숲길 습관 시민 식물 식사 신호 실수 쌀밥 사고 산소 산업 살림 상식 상인 상대 새끼 색깔 샘물 생명 생선 샤워 서명 서점
    성당 성벽 성탄 세탁 소녀 소년 소매 소망 소파 손길 손뼉 송곳 수도 수레 수염 수저 수첩 숙소 순위 술잔 숨결 스승 승객
    시각 시력 시인 식탁 신경 신념 신부 신비 실내 실망 심판 싸움
    악기 얼음 역사 엽서 예술 온도 옷장 우표 위험 유리 음식 의사 이름 이유 일기 아이 악어 안내 안전 알람 암호 앞길 애정
    야채 약점 양념 양심 어둠 어부 어휘 억양 언어 얼룩 여권 여왕 역할 연구 연기 연못 열차 영웅 영혼 예감 예보 예약 오후
    온실 완벽 왕관 왕자 외국 요정 욕심 용돈 우물 우승 운명 위로 유령 유행 육지 은혜 음료 의견 의미 이모 이발 이별 이사
    인간 인기 인사 일꾼 입구 잉크
    자리 자연 작가 잠옷 장난 전화 제목 조카 종이 주스 지도 직업 진실 짐승 자석 자세 자신 작품 잠수 잡지 장군 장터 재미
    재산 저금 적군 전쟁 전설 점수 정답 정신 정의 제비 조각 조건 조국 조언 존경 졸음 종류 주인 주제 죽음 준비 중간 중심
    증거 지진 진주 질서 집안 짜증
    창고 책장 천사 첫눈 체육 초대 촛불 추위 출발 치마 침대 차례 착각 찬성 참치 창가 채소 책임 천국 천재 철새 청년 체온
    체험 초밥 총알 최고 추석 축복 출구 충고 취미 치약 친척 칭찬
    코트 콩밥 크기 칼날 코너 콧물 큰길 탁자 탑승 태도 토론 통장 특징 타조 탐험 털실 통역 퇴장 튜브 트럭 특별 틈새
    판사 팔찌 평일 포장 표정 품질 피부 필통 파티 팥죽 편견 평가 포옹 폭죽 표현 풍경 피리
    한글 해답 햇빛 허락 현실 협력 형태 호흡 혼자 화분 화장 환경 활동 회색 효과 후배 흰색 하루 하품 학원 한숨 합격 해군
    해적 햇볕 행동 헬멧 협동 홍차 화가 화살 환자 황금 회장 후회 훈련 휴지 흉내 흔적 흥미 희생
    간장 설탕 식초 후추 소스 김장 반죽 교복 급식 담임 예습 입시 학년 학기 학비 학위 학자 학점 목사 상사 선장 소장 약사 점원
    기압 황사 우박 홍수 한파 폭염 몸통 발등 콧등 귓불 팔목 교회 사찰 전철 선박 배편 항공 택배 우편 전등 전구 조명 냉방
    외투 조끼 셔츠 속옷 샌들 국자 주걱 쟁반 행주 관중 응원 득점 실점 불만 불평 감격 흥분 우울 오전 정오 자정 새해 연말 연초
    월말 월초 주중 이틀 사흘 나흘 닷새 엿새 이레 하나 다섯 여섯 일곱 여덟 아홉 스물 서른 마흔 예순 일흔 여든 아흔
    서쪽 위쪽 아래 앞쪽 뒤쪽 왼쪽 옆집 고모 사촌 손자 손녀 사위 장인 장모 시댁 친정 아내 부인 신랑
    수달 황소 염소 낙타 표범 치타 퓨마 들소 물개 해달 펭귄 제비 백로 공작 꽃게 가재 갈치 멸치 붕어 잉어 메기 벌집 말벌 파리 벼룩 지네
    들꽃 잡초 풀잎 풀밭 갈대 억새 은행 연꽃 백합 튤립 수국 모란 매화 동백 목련 난초 앵두 자두 살구 오디 대추 곶감 홍시 유자 모과
    석류 망고 키위 레몬 자몽 체리 상추 부추 고추 마늘 생강 연근 우엉 콩잎 깻잎 볶음 찌개 짬뽕 우동 쫄면 순대 족발 보쌈 곱창 막창
    튀김 부침 전골 잡채 식혜 약과 호떡 경단 송편 소주 와인 음료 콜라 선반 커튼 창틀 액자 칫솔 면도 걸레 대야 수첩 풀칠
    문자 메일 화면 전원 충전 자판 영상 음성 파일 폴더
  `),
  3: w(`
    가습기 교과서 기념일 나들이 나그네 넥타이 디저트 라디오 밀가루 별똥별 보름달 비상구 사진기 소방관 경찰관 간호사
    요리사 운전사 대통령 우주선 음료수 전화기 주차장 초인종 축구공 피아노 화장실 화장품 휴게소 한가위
    월요일 화요일 수요일 목요일 금요일 토요일 일요일 기차표 영수증 저금통 올림픽 수영복 운동화 구두약 발바닥 손바닥
  `),
}

/** 추측 가능 단어 (정답 ⊂ 유효) */
export const VALID: Record<WordLen, Set<string>> = {
  2: new Set([...ANSWERS[2], ...EXTRA[2]]),
  3: new Set([...ANSWERS[3], ...EXTRA[3]]),
}

// ── 오늘의 단어 (KST 기준, hangman.ts와 같은 회차 번호) ─────────────────────
const DAY_MS = 86_400_000
const KST_MS = 9 * 3_600_000
const EPOCH = Date.UTC(2026, 0, 1) / DAY_MS // 2026-01-01(KST) = #1

export const dayNumber = (now: number) => Math.floor((now + KST_MS) / DAY_MS) - EPOCH + 1
export const msToNextDay = (now: number) => DAY_MS - ((now + KST_MS) % DAY_MS)
/** 'YYYY-MM-DD'(KST 날짜) → 회차. 구버전 통계 이전용 */
export const dayFromDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS - EPOCH + 1
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** 정답 목록을 한 바퀴 돌 때까지 중복 없음 (주기마다 다른 순서) */
export function dailyAnswer(day: number): string {
  const list = ANSWERS[2], n = list.length
  const i = (((day - 1) % n) + n) % n
  const cycle = Math.floor((day - 1) / n)
  let order = orderCache.get(cycle)
  if (!order) {
    order = list.map((_, k) => k)
    const rnd = mulberry32(0x3ad1e + cycle * 7919)
    for (let k = n - 1; k > 0; k--) {
      const r = Math.floor(rnd() * (k + 1))
      ;[order[k], order[r]] = [order[r], order[k]]
    }
    orderCache.set(cycle, order)
  }
  return list[order[i]]
}
const orderCache = new Map<number, number[]>()

export const randomAnswer = (len: WordLen, rnd = Math.random) => ANSWERS[len][Math.floor(rnd() * ANSWERS[len].length)]

// ── 통계 ───────────────────────────────────────────────────────────────────
export interface DayRecord { guesses: string[]; hard?: boolean }
export type DailyRecords = Record<number, DayRecord>
/** 구버전(날짜 없는 누적 통계) 기록: 새 기록에 더해서 보여줌 */
export interface LegacyStats { played: number; wins: number; dist: number[]; maxStreak: number; streak: number; lastDay: number }

export function computeStats(records: DailyRecords, today: number, legacy?: LegacyStats | null) {
  const done = Object.entries(records)
    .map(([d, r]) => ({ day: Number(d), guesses: r.guesses, status: statusOf(r.guesses, dailyAnswer(Number(d))) }))
    .filter(r => r.status !== 'playing')
    .sort((a, b) => a.day - b.day)
  const wins = done.filter(r => r.status === 'won')
  const dist = Array.from({ length: MAX_GUESSES }, (_, k) => wins.filter(r => r.guesses.length === k + 1).length + (legacy?.dist[k] ?? 0))

  // 구버전 연속 기록은 마지막 플레이 다음 날부터 이어질 때만 연결
  let maxStreak = legacy?.maxStreak ?? 0
  let run = 0, prev = -Infinity
  if (legacy && legacy.streak > 0) { run = legacy.streak; prev = legacy.lastDay }
  for (const r of done) {
    run = r.status === 'won' ? (r.day === prev + 1 ? run + 1 : 1) : 0
    prev = r.day
    maxStreak = Math.max(maxStreak, run)
  }
  const doneSet = new Map(done.map(r => [r.day, r.status]))
  let current = 0
  let d = doneSet.has(today) ? today : today - 1
  while (doneSet.get(d) === 'won') { current++; d-- }
  // 이전 당일(lastDay = 오늘)에 구버전으로 푼 경우도 연결 (d + 1)
  if (legacy && legacy.streak > 0 && ((d === legacy.lastDay && !doneSet.has(d)) || d + 1 === legacy.lastDay)) current += legacy.streak

  const played = done.length + (legacy?.played ?? 0)
  const won = wins.length + (legacy?.wins ?? 0)
  return { played, winRate: played ? Math.round((won / played) * 100) : 0, current, maxStreak, dist, losses: played - won }
}

// ── 공유 ───────────────────────────────────────────────────────────────────
const EMOJI = { normal: { correct: '🟩', present: '🟨', absent: '⬜' }, contrast: { correct: '🟧', present: '🟦', absent: '⬜' } }

/** 스포일러 없는 결과 격자 (음절 사이 공백) */
export function shareGrid(guesses: string[], answer: string, contrast = false) {
  const e = EMOJI[contrast ? 'contrast' : 'normal']
  return guesses.map(g => score(g, answer).map(s => s.map(t => e[t]).join('')).join(' ')).join('\n')
}

/** "툴허브 한글 워들 #N 4/6" + 격자 (+ 링크) */
export function shareText(title: string, day: number, guesses: string[], answer: string, opts: { hard?: boolean; contrast?: boolean; url?: string } = {}) {
  const won = guesses.includes(answer)
  const head = `${title} #${day} ${won ? guesses.length : 'X'}/${MAX_GUESSES}${opts.hard ? '*' : ''}`
  return [head, '', shareGrid(guesses, answer, opts.contrast), ...(opts.url ? ['', opts.url] : [])].join('\n')
}

// ── 물리 키보드 (두벌식): IME 켜짐 = key가 자모, 꺼짐 = code로 매핑 ──────────
const QWERTY = 'qwertyuiopasdfghjklzxcvbnm'
const DUBEOL = 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡ'
const SHIFTED: Record<string, string> = { q: 'ㅃ', w: 'ㅉ', e: 'ㄸ', r: 'ㄲ', t: 'ㅆ', o: 'ㅒ', p: 'ㅖ' }
export const KEYS = new Set([...DUBEOL, ...Object.values(SHIFTED)])

export function keyToJamo(key: string, code: string, shift: boolean): string | null {
  if (KEYS.has(key)) return key
  const m = /^Key([A-Z])$/.exec(code)
  if (!m) return null
  const l = m[1].toLowerCase()
  if (shift && SHIFTED[l]) return SHIFTED[l]
  return DUBEOL[QWERTY.indexOf(l)] ?? null
}

/** 화면 키보드: 두벌식 3줄 + 쌍자음·ㅒㅖ 줄 */
export const KEY_ROWS = [
  [...'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ'],
  [...'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ'],
  [...'ㅋㅌㅊㅍㅠㅜㅡ'],
  [...'ㅃㅉㄸㄲㅆㅒㅖ'],
]
