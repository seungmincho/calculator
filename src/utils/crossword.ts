/**
 * 십자말풀이 순수 로직: 날짜(KST) → 퍼즐 번호 → 시드 기반 퍼즐 생성, 한글 입력 버퍼 매핑, 기록 통계.
 * 같은 번호 = 누구에게나 같은 퍼즐 (결정적 생성, Math.random 미사용).
 * 검증: node scripts/check-crossword.ts
 */

export type Dir = 'across' | 'down'

export interface Word {
  n: number
  row: number
  col: number
  dir: Dir
  answer: string
  clue: string
}

export interface Puzzle {
  rows: number
  cols: number
  /** 평면 배열 (row * cols + col). '' = 검은 칸. 쓰인 영역만 남기고 잘라냄 */
  grid: string[]
  words: Word[]
}

// ── 단어 은행 (답:힌트) ──
const BANK_SRC = `사과:빨갛고 새콤달콤한 가을 과일
바나나:껍질을 벗겨 먹는 길쭉한 노란 과일
수박:여름에 먹는 줄무늬 큰 과일
포도:송이째 달리는 보라색 열매, 와인의 원료
딸기:씨가 겉에 박힌 빨간 봄 과일
감자:땅속에서 캐는 덩이줄기, 프렌치프라이의 재료
고구마:달콤한 뿌리채소, 겨울 군것질의 대표
옥수수:알갱이가 줄지어 박힌 여름 곡식
김치:배추를 절여 양념한 한국 대표 반찬
비빔밥:밥에 나물과 고추장을 넣고 섞어 먹는 음식
떡볶이:가래떡을 매콤한 양념에 볶은 분식
불고기:양념한 얇은 고기를 구운 요리
라면:끓는 물에 면과 스프를 넣어 먹는 즉석식품
만두:얇은 피에 소를 넣어 빚은 음식
냉면:차가운 육수에 말아 먹는 면 요리
된장:콩을 발효시켜 만든 장, 찌개의 재료
고추장:매콤한 붉은 장
간장:짠맛을 내는 검은 장
설탕:단맛을 내는 흰 가루
소금:바닷물을 말려 얻는 짠 가루
우유:젖소에서 짠 흰 음료
커피:원두를 볶아 내린 쓴 음료
녹차:찻잎을 덖어 우린 초록빛 차
사이다:톡 쏘는 투명한 탄산음료
고양이:야옹 하고 우는 반려동물
강아지:개의 새끼
호랑이:줄무늬가 있는 산의 왕
사자:갈기가 있는 백수의 왕
토끼:귀가 길고 깡충깡충 뛰는 동물
거북이:등딱지를 지고 느리게 걷는 동물
코끼리:코가 긴 가장 큰 육지 동물
기린:목이 가장 긴 동물
다람쥐:도토리를 모으는 줄무늬 작은 동물
고래:바다에 사는 가장 큰 포유류
오징어:다리가 열 개인 바다 동물
문어:다리가 여덟 개인 바다 동물
나비:애벌레가 자라 꽃 사이를 날아다니는 곤충
개미:줄지어 다니는 부지런한 곤충
모기:여름밤 피를 빨아 가렵게 하는 곤충
참새:전깃줄에 앉아 짹짹 우는 작은 새
독수리:하늘의 사냥꾼으로 불리는 큰 새
소나무:사계절 푸른 바늘잎 나무
무지개:비 갠 뒤 하늘에 뜨는 일곱 빛깔 띠
구름:하늘에 떠 있는 작은 물방울 덩어리
바다:지구 표면의 70%를 덮은 짠물
하늘:머리 위로 펼쳐진 넓은 공간
태양:태양계의 중심에 있는 별
달빛:밤에 달이 비추는 빛
별자리:별을 이어 이름 붙인 무리
지구:우리가 사는 행성
바람:공기의 흐름
눈사람:눈을 뭉쳐 만든 사람 모양
장마:여름철 오래 이어지는 비
태풍:여름·가을에 오는 강한 열대 저기압
단풍:가을에 붉고 노랗게 물든 잎
여름:일 년 중 가장 더운 계절
가을:추수와 단풍의 계절
겨울:눈이 내리는 추운 계절
학교:학생들이 공부하러 가는 곳
학생:학교에 다니며 배우는 사람
선생님:학교에서 가르치는 분
교실:수업을 하는 방
숙제:집에서 해 오도록 내준 과제
시험:실력을 평가하는 문제 풀이
방학:학기 사이에 쉬는 기간
도서관:책을 빌려 읽는 곳
공책:글씨를 쓰는 빈 책
연필:흑연심을 나무로 감싼 필기구
지우개:연필 글씨를 지우는 도구
가방:물건을 넣어 들고 다니는 것
수학:숫자와 도형을 다루는 과목
과학:자연 현상을 탐구하는 학문
국어:우리말과 글을 배우는 과목
영어:세계 공용어로 널리 쓰이는 언어
미술:그림과 조형을 배우는 과목
음악:소리로 표현하는 예술
체육:몸을 움직여 운동하는 과목
역사:지나온 과거의 기록
의사:병을 진찰하고 치료하는 사람
간호사:병원에서 환자를 돌보는 의료인
경찰:범죄를 막고 질서를 지키는 사람
소방관:불을 끄고 사람을 구하는 사람
요리사:음식을 만드는 직업
가수:노래를 부르는 직업
배우:연극이나 영화에서 연기하는 사람
기자:취재해서 기사를 쓰는 사람
화가:그림을 그리는 사람
농부:논밭에서 농사짓는 사람
어부:물고기를 잡는 사람
대통령:나라를 대표하는 최고 지도자
자전거:페달을 밟아 움직이는 두 바퀴 탈것
자동차:엔진으로 달리는 네 바퀴 탈것
비행기:날개로 하늘을 나는 탈것
기차:선로 위를 달리는 긴 탈것
지하철:땅속을 달리는 도시 전철
버스:정해진 노선을 도는 대중교통
택시:요금을 내고 원하는 곳까지 타는 차
신호등:빨강·노랑·초록 불로 교통을 알리는 장치
정류장:버스가 서는 곳
공항:비행기가 뜨고 내리는 곳
항구:배가 드나드는 곳
여행:집을 떠나 다른 곳을 돌아보는 일
사진:카메라로 찍은 그림
영화:극장 스크린으로 보는 이야기
음식:먹을거리
가족:부부와 자녀로 이루어진 집단
부모:아버지와 어머니
아버지:나를 낳아 준 남자 어른
어머니:나를 낳아 준 여자 어른
할머니:아버지나 어머니의 어머니
할아버지:아버지나 어머니의 아버지
동생:나보다 어린 형제자매
친구:가깝게 오래 사귄 사람
이웃:가까이 사는 집이나 사람
사랑:아끼고 귀하게 여기는 마음
행복:기쁘고 만족스러운 상태
기쁨:즐겁고 흐뭇한 마음
슬픔:마음이 아프고 괴로운 느낌
눈물:슬프거나 기쁠 때 눈에서 흐르는 물
웃음:기뻐서 짓는 표정이나 소리
희망:앞일에 거는 좋은 기대
용기:겁내지 않는 씩씩한 기운
약속:다른 사람과 미리 정해 둔 일
생일:태어난 날
선물:축하하거나 고마울 때 주는 물건
편지:종이에 적어 보내는 글
전화:멀리 있는 사람과 말할 수 있는 기계
시계:시간을 알려 주는 기계
안경:시력을 돕는 렌즈 두 알
우산:비를 가리는 도구
거울:모습을 비추어 보는 물건
침대:잠을 자는 가구
의자:앉는 가구
책상:앉아서 공부하거나 일하는 탁자
냉장고:음식을 차게 보관하는 가전
세탁기:빨래를 해 주는 가전
부엌:음식을 만드는 공간
거실:가족이 함께 모이는 방
창문:빛과 바람이 드나드는 문
지붕:집의 맨 위를 덮은 부분
계단:오르내리려고 층층이 만든 길
컴퓨터:정보를 처리하는 전자 기계
인터넷:전 세계 컴퓨터를 잇는 통신망
노래:가락에 맞춰 부르는 소리
축구:발로 공을 차서 골을 넣는 경기
야구:방망이로 공을 치는 경기, 홈런
농구:공을 링에 던져 넣는 경기
수영:물속에서 헤엄치는 운동
등산:산에 오르는 일
태권도:한국에서 시작된 무술
운동장:체육 활동을 하는 넓은 마당
공원:시민이 쉬는 넓은 녹지
시장:물건을 사고파는 곳, 또는 시의 우두머리
병원:아픈 사람을 치료하는 곳
은행:돈을 맡기고 빌리는 곳
우체국:편지와 소포를 보내는 곳
경찰서:경찰이 근무하는 관청
소방서:소방관이 근무하는 곳
식당:음식을 사 먹는 가게
편의점:늦은 밤에도 여는 작은 가게
서울:대한민국의 수도
부산:해운대가 있는 항구 도시
제주도:한라산이 있는 가장 큰 섬
한라산:제주도 한가운데 우뚝 선 산
백두산:천지가 있는 한반도 최고봉
한강:서울을 가로지르는 강
독도:동해에 있는 우리 땅 섬
한글:세종대왕이 만든 우리 글자
세종대왕:한글을 만든 조선의 임금
태극기:대한민국의 국기
무궁화:대한민국의 나라꽃
설날:음력 1월 1일 명절
추석:한가위, 송편을 빚는 명절
송편:추석에 빚는 반달 모양 떡
떡국:설날 아침에 먹는 음식
한복:우리 고유의 옷
김밥:김에 밥과 재료를 싸서 만 음식
주사:약을 바늘로 몸에 넣는 일
감기:콧물과 기침이 나는 흔한 병
약국:약을 파는 곳
치약:칫솔에 짜서 이를 닦는 것
비누:거품을 내어 씻는 물건
수건:물기를 닦는 천
모자:머리에 쓰는 것
장갑:손에 끼는 것
양말:발에 신는 얇은 것
신발:발에 신고 걷는 것
운동화:운동할 때 신는 신발
바지:두 다리를 꿰어 입는 옷
치마:다리가 갈라지지 않은 아래옷
시간:흘러가는 때의 길이
오늘:지금 지나고 있는 이 날
내일:오늘의 다음 날
어제:오늘의 바로 전날
아침:해가 뜨는 이른 때, 또는 그때 먹는 밥
저녁:해가 질 무렵
주말:토요일과 일요일
일요일:한 주를 여는 쉬는 날
생활:살아가는 일
사회:사람들이 모여 사는 공동체
경제:생산과 소비의 활동
정치:나라를 다스리는 일
문화:한 사회의 생활 방식과 예술
자연:사람이 만들지 않은 산·강·바다 등
환경:생물을 둘러싼 조건
공기:우리가 숨 쉬는 기체
전기:전구를 밝히는 에너지
기차역:기차가 서는 곳
수도:한 나라의 중앙 정부가 있는 도시
대학교:고등학교 다음의 교육 기관
고등학교:중학교 다음 과정의 학교
초등학교:6년 과정의 첫 학교
중학교:초등학교 다음 학교
회사:이윤을 목적으로 일하는 조직
회의:여럿이 모여 의논함
사장:회사의 우두머리
월급:매달 받는 급여
연봉:일 년 동안 받는 급여 총액
세금:나라에 내는 돈
통장:은행 거래를 적는 수첩
지갑:돈을 넣고 다니는 작은 주머니
동전:쇠붙이로 만든 돈
가격:물건의 값
시소:양쪽에 앉아 오르내리는 놀이 기구
그네:매달려 앞뒤로 흔들리는 놀이 기구
놀이터:아이들이 노는 곳
동물원:여러 동물을 모아 보여 주는 곳
수족관:물고기를 기르며 보여 주는 곳
박물관:유물을 모아 전시하는 곳
미술관:미술 작품을 전시하는 곳
사전:낱말의 뜻을 풀이한 책
소설:지어낸 이야기를 쓴 문학
시인:시를 쓰는 사람
동화:어린이를 위한 이야기
신문:매일 소식을 전하는 인쇄물
방송:전파로 소식을 전하는 일
가위:종이를 자르는 도구
바늘:실을 꿰어 바느질하는 도구
망치:못을 박는 도구
자석:쇠를 끌어당기는 물체
기름:물에 뜨는 미끌미끌한 액체
주전자:물을 끓이는 그릇
냄비:찌개를 끓이는 그릇
숟가락:국을 떠먹는 도구
젓가락:두 짝으로 음식을 집는 도구
접시:음식을 담는 납작한 그릇
사다리:높은 곳에 오를 때 딛는 도구
다리:강을 건너게 놓은 구조물, 또는 몸을 받치는 부분
나무:줄기와 가지가 있는 식물
장미:가시가 있는 사랑의 꽃
해바라기:해를 따라 도는 큰 노란 꽃
진달래:봄 산을 분홍빛으로 물들이는 꽃
개나리:이른 봄 담장을 덮는 노란 꽃
민들레:홀씨가 바람에 날리는 들꽃
벚꽃:봄에 분홍빛으로 흩날리는 꽃
연꽃:진흙 속에서 피는 꽃
씨앗:식물이 싹트는 알맹이
가지:나무줄기에서 뻗은 부분, 또는 보라색 채소
고추:매운 빨간 채소
마늘:냄새가 강한 양념 채소
양파:썰면 눈물이 나는 채소
당근:토끼가 좋아하는 주황 뿌리채소
배추:김치의 주재료인 채소
호박:늙으면 누렇게 되는 둥근 열매 채소
계란:닭이 낳은 알
치킨:튀긴 닭 요리
피자:치즈를 얹어 구운 둥근 이탈리아 음식
햄버거:빵 사이에 고기 패티를 넣은 음식
과자:간식으로 먹는 바삭한 음식
사탕:입에 넣고 녹여 먹는 단 것
빵집:빵을 굽고 파는 가게
수영장:헤엄칠 수 있게 만든 곳
바닷가:바다와 육지가 맞닿은 곳
모래:아주 잘게 부서진 돌 알갱이
조개:두 장 껍데기 속에 사는 바다 생물
강물:강에 흐르는 물
호수:땅으로 둘러싸인 큰 물
폭포:높은 곳에서 떨어지는 물줄기
동굴:바위나 땅속에 뚫린 굴
사막:비가 거의 오지 않는 모래 땅
화산:땅속 용암이 터져 나온 산
지진:땅이 흔들리는 현상
번개:하늘에서 번쩍이는 전기 불빛
천둥:번개 뒤에 울리는 소리
안개:땅 가까이 낀 작은 물방울
이슬:새벽 풀잎에 맺힌 물방울
우주:별과 은하를 품은 끝없는 공간
로켓:우주로 쏘아 올리는 비행체
과거:지나간 때
미래:앞으로 올 때
현재:지금 이때
기억:지난 일을 잊지 않고 떠올림
생각:머리를 써서 헤아림
마음:감정과 생각이 깃드는 곳
인사:만나거나 헤어질 때 하는 예절
대화:마주 보고 이야기를 주고받음
질문:모르는 것을 물음
대답:물음에 답함
공부:학문이나 기술을 배움
연습:잘하려고 되풀이해 익힘
운동:몸을 단련하려고 움직임
건강:몸과 마음이 튼튼함
주차장:차를 세워 두는 곳
고속도로:빠르게 달리도록 만든 자동차 전용 도로
도로:차와 사람이 다니는 길
기념일:특별한 일을 기억하는 날
사진기:사진을 찍는 기계
장난감:아이들이 가지고 노는 물건
인형:사람이나 동물 모양의 장난감
풍선:바람을 불어 넣어 부풀리는 놀잇감
자장가:아기를 재울 때 부르는 노래
주인공:이야기의 중심 인물
공주:임금의 딸
왕자:임금의 아들
거인:몸집이 아주 큰 사람
마법사:마법을 부리는 사람
도깨비:방망이를 든 옛이야기 속 존재
구두:가죽으로 만든 정장용 신발
기사:신문에 실린 글, 또는 중세의 말 탄 무사
사이:두 대상의 틈이나 관계
자리:앉는 곳
수리:고장 난 것을 고침
도시:사람이 많이 사는 큰 마을
지도:땅의 모양을 줄여 그린 그림
주소:사는 곳의 위치를 적은 것
시민:도시에 사는 사람
국가:나라
자유:남에게 얽매이지 않는 상태
이유:까닭
유리:창문에 끼우는 투명한 재료
리본:매듭지어 꾸미는 띠
본문:글의 중심이 되는 부분
문자:휴대폰으로 보내는 짧은 글, 또는 글자
자녀:아들과 딸
기온:공기의 온도
온도:따뜻하고 찬 정도를 나타낸 수치
도장:이름을 새겨 찍는 물건
장소:어떤 일이 일어나는 곳
소리:귀로 듣는 것
리더:무리를 이끄는 사람
대기:지구를 둘러싼 공기층, 또는 기다림
기타:여섯 줄을 튕겨 연주하는 악기
타자:야구에서 공을 치는 선수
자가용:개인이 타는 차
용기:겁내지 않는 기운, 또는 물건을 담는 그릇
기적:상식으로 설명할 수 없는 놀라운 일
적군:맞서 싸우는 편의 군대
군인:나라를 지키는 사람
인기:많은 사람이 좋아하는 정도
기분:마음에 생기는 유쾌함이나 불쾌함
분수:물을 뿜어 올리는 장치
수입:벌어들이는 돈
입구:들어가는 곳
구조:위험에 빠진 사람을 구함
조사:자세히 살펴봄
사고:뜻밖에 일어난 불행한 일
고향:태어나 자란 곳
향기:좋은 냄새
기도:신에게 비는 일
도로:차와 사람이 다니는 길
로봇:사람처럼 움직이는 기계
전구:전기로 빛을 내는 둥근 유리 등
구청:구의 행정을 맡은 관청
청소:더러운 것을 치움
소원:이루어지기를 바라는 일
원숭이:나무를 잘 타는 꾀 많은 동물
이사:사는 곳을 옮김
사진첩:사진을 모아 두는 책
가로수:길가에 줄지어 심은 나무
수건돌리기:둥글게 앉아 하는 전래 놀이`

const HANGUL = /^[가-힣]+$/

export const WORD_BANK: { answer: string; clue: string }[] = (() => {
  const seen = new Set<string>()
  const out: { answer: string; clue: string }[] = []
  for (const line of BANK_SRC.split('\n')) {
    const i = line.indexOf(':')
    const answer = line.slice(0, i).trim()
    // 7칸 판에 들어가는 2~5글자, 중복 제거
    if (!HANGUL.test(answer) || answer.length < 2 || answer.length > 5 || seen.has(answer)) continue
    seen.add(answer)
    out.push({ answer, clue: line.slice(i + 1).trim() })
  }
  return out
})()

// ── 시드 난수 (mulberry32) ──
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const SIZE = 7
const MAX_WORDS = 12

function tryGenerate(seed: number, size: number): Puzzle {
  const rand = rng(seed)
  const bank = WORD_BANK.slice()
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[bank[i], bank[j]] = [bank[j], bank[i]]
  }
  const N = size * size
  const grid: string[] = Array(N).fill('')
  const used = { across: Array(N).fill(false), down: Array(N).fill(false) }
  const placed: Omit<Word, 'n'>[] = []
  const usedWords = new Set<string>()
  const at = (r: number, c: number) => (r < 0 || c < 0 || r >= size || c >= size ? '' : grid[r * size + c])

  // 교차 규칙: 새로 채우는 칸은 옆(수직 방향) 칸이 비어 있어야 하고, 단어 앞뒤 칸도 비어야 함
  // → 판의 모든 2칸 이상 연속 구간이 은행 단어가 됨 (check 스크립트가 검증)
  const score = (w: string, r: number, c: number, dir: Dir): number => {
    const dr = dir === 'down' ? 1 : 0
    const dc = 1 - dr
    const er = r + dr * (w.length - 1)
    const ec = c + dc * (w.length - 1)
    if (er >= size || ec >= size) return -1
    if (at(r - dr, c - dc) || at(er + dr, ec + dc)) return -1
    let cross = 0
    for (let i = 0; i < w.length; i++) {
      const rr = r + dr * i
      const cc = c + dc * i
      const cur = grid[rr * size + cc]
      if (cur) {
        if (cur !== w[i] || used[dir][rr * size + cc]) return -1
        cross++
      } else if (at(rr + dc, cc + dr) || at(rr - dc, cc - dr)) return -1
    }
    if (placed.length && (cross === 0 || cross === w.length)) return -1
    return cross
  }
  const place = (w: { answer: string; clue: string }, r: number, c: number, dir: Dir) => {
    const dr = dir === 'down' ? 1 : 0
    for (let i = 0; i < w.answer.length; i++) {
      const k = (r + dr * i) * size + c + (1 - dr) * i
      grid[k] = w.answer[i]
      used[dir][k] = true
    }
    placed.push({ row: r, col: c, dir, answer: w.answer, clue: w.clue })
    usedWords.add(w.answer)
  }

  // 첫 단어: 3글자 이상, 가운데 줄
  const first = bank.find(w => w.answer.length >= 3) ?? bank[0]
  const firstDir: Dir = rand() < 0.5 ? 'across' : 'down'
  const mid = Math.floor(size / 2)
  const off = Math.floor(rand() * (size - first.answer.length + 1))
  if (firstDir === 'across') place(first, mid, off, 'across')
  else place(first, off, mid, 'down')

  while (placed.length < MAX_WORDS) {
    let best: { w: { answer: string; clue: string }; r: number; c: number; dir: Dir; s: number } | null = null
    for (const w of bank) {
      if (usedWords.has(w.answer)) continue
      for (const dir of ['across', 'down'] as Dir[]) {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const cross = score(w.answer, r, c, dir)
            if (cross <= 0) continue
            // 교차 많을수록, 길수록 우선. 동점은 은행 순서(시드 셔플)로 결정
            const s = cross * 4 + w.answer.length
            if (!best || s > best.s) best = { w, r, c, dir, s }
          }
        }
      }
    }
    if (!best) break
    place(best.w, best.r, best.c, best.dir)
  }

  // 번호: 시작 칸을 행 우선으로 정렬해 매김 (가로·세로가 같은 칸에서 시작하면 같은 번호)
  // 빈 가장자리 줄/열 잘라내기
  let r0 = size, r1 = 0, c0 = size, c1 = 0
  for (let k = 0; k < N; k++) if (grid[k]) {
    const r = Math.floor(k / size), c = k % size
    r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c)
  }
  const rows = r1 - r0 + 1
  const cols = c1 - c0 + 1
  const cropped: string[] = []
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cropped.push(grid[r * size + c])
  const moved = placed.map(p => ({ ...p, row: p.row - r0, col: p.col - c0 }))
  const starts = [...new Set(moved.map(p => p.row * cols + p.col))].sort((a, b) => a - b)
  const words: Word[] = moved
    .map(p => ({ ...p, n: starts.indexOf(p.row * cols + p.col) + 1 }))
    .sort((a, b) => a.n - b.n || (a.dir === 'across' ? -1 : 1))
  return { rows, cols, grid: cropped, words }
}

/** 시드 → 퍼즐. 몇 번 시도해 단어가 가장 많은 판을 고름 (결정적) */
export function generatePuzzle(seed: number, size = SIZE): Puzzle {
  let best: Puzzle | null = null
  for (let k = 0; k < 8; k++) {
    const p = tryGenerate((Math.imul(seed, 2654435761) + k * 97) >>> 0, size)
    if (!best || p.words.length > best.words.length) best = p
    if (best.words.length >= 9) break
  }
  return best!
}

// ── 날짜 (KST) ──
const DAY = 86400000
const KST = 9 * 3600000
/** #1 = 2026-09-30 (KST) */
const EPOCH_DAY = Math.floor(Date.UTC(2026, 8, 30) / DAY)

export function dailyNumber(now = Date.now()): number {
  return Math.floor((now + KST) / DAY) - EPOCH_DAY + 1
}
export function msUntilNextDaily(now = Date.now()): number {
  return DAY - ((now + KST) % DAY)
}
/** 퍼즐 번호 → 'YYYY-MM-DD' (KST) */
export function dailyDate(n: number): string {
  return new Date((EPOCH_DAY + n - 1) * DAY).toISOString().slice(0, 10)
}
export const dailySeed = (n: number) => n

// ── 판 탐색 ──
export function wordCells(w: Word, cols: number): number[] {
  return Array.from({ length: w.answer.length }, (_, i) =>
    w.dir === 'across' ? w.row * cols + w.col + i : (w.row + i) * cols + w.col)
}
/** 칸 → 방향별 단어 인덱스 (-1 = 없음) */
export function buildWordIndex(p: Puzzle): Record<Dir, number[]> {
  const idx = { across: Array(p.grid.length).fill(-1), down: Array(p.grid.length).fill(-1) }
  p.words.forEach((w, i) => wordCells(w, p.cols).forEach(k => { idx[w.dir][k] = i }))
  return idx
}

// ── 한글 입력 버퍼 → 칸 매핑 ──
// 숨은 input의 값(조합 중 글자 포함)을 커서 칸부터 단어 끝까지 칸에 그대로 비춤.
// IME가 값을 어떻게 바꾸든(받침 이동, 조합 중 지우기, iOS 재조합) 값만 따라가면 됨.
export const SENTINEL = '​'
export function toTyped(raw: string): string {
  return raw.normalize('NFC').replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ]/g, '')
}
/**
 * base: 버퍼 시작 시점 슬롯 값, typed: 입력된 한글, touched: 지금까지 덮어쓴 슬롯 수.
 * 글자를 지우면 덮어썼던 칸은 빈칸이 됨. 슬롯보다 길게 치면 마지막 칸을 마지막 글자로 교체.
 */
export function mapTyped(base: string[], typed: string, touched: number): { values: string[]; touched: number } {
  const n = base.length
  const len = Math.min(typed.length, n)
  const t = Math.max(touched, len)
  const values = base.map((b, i) => {
    if (i < len) return i === n - 1 && typed.length > n ? typed[typed.length - 1] : typed[i]
    return i < t ? '' : b
  })
  return { values, touched: t }
}
/** 입력 후 커서 슬롯: 조합 중이면 조합 중인 칸, 아니면 다음 칸 (단어 끝에서 멈춤) */
export function cursorSlot(typedLen: number, slots: number, composing: boolean): number {
  if (!slots) return 0
  const i = composing ? typedLen - 1 : typedLen
  return Math.max(0, Math.min(i, slots - 1))
}
export const isJamo = (ch: string) => /^[ㄱ-ㅎㅏ-ㅣ]$/.test(ch)

// ── 오늘의 퍼즐 기록 ──
export interface DailyResult { time: number; hints: number }
export type DailyResults = Record<string, DailyResult>
export interface Stats { solved: number; streak: number; maxStreak: number; best: number | null; avg: number | null; clean: number }

export function computeStats(results: DailyResults, today: number): Stats {
  const days = Object.keys(results).map(Number).filter(n => n >= 1 && n <= today).sort((a, b) => a - b)
  let maxStreak = 0
  let run = 0
  let prev = -1
  for (const d of days) {
    run = d === prev + 1 ? run + 1 : 1
    maxStreak = Math.max(maxStreak, run)
    prev = d
  }
  // 오늘 아직 안 풀었으면 어제까지 이어진 연속도 유지
  let streak = 0
  for (let d = results[today] ? today : today - 1; results[d]; d--) streak++
  const times = days.map(d => results[d].time)
  return {
    solved: days.length,
    streak,
    maxStreak,
    best: times.length ? Math.min(...times) : null,
    avg: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    clean: days.filter(d => results[d].hints === 0).length,
  }
}

/** 공유용 모양 격자 (정답 노출 없음): 검은 칸 / 직접 푼 칸 / 힌트로 푼 칸 */
export function shapeGrid(p: Puzzle, hinted: Set<number>): string {
  const lines: string[] = []
  for (let r = 0; r < p.rows; r++) {
    let line = ''
    for (let c = 0; c < p.cols; c++) {
      const k = r * p.cols + c
      line += !p.grid[k] ? '⬜' : hinted.has(k) ? '🟨' : '🟦'
    }
    lines.push(line)
  }
  return lines.join('\n')
}
