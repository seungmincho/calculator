'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from '@/lib/i18n'
import { Search, Copy, Check, BookOpen } from 'lucide-react'
import { glassCard, glassInset, glassInput } from '@/lib/glass'

// Emoji data structure
interface EmojiData {
  emoji: string
  keywords: string
  category: string
}

// Comprehensive emoji list with Korean/English keywords
const EMOJI_DATA: EmojiData[] = [
  // Smileys & Emotion (30 emojis)
  { emoji: '😀', keywords: '웃음 기쁨 smile grin happy cheerful', category: 'smileys' },
  { emoji: '😂', keywords: '눈물 웃음 laughing crying joy tears funny', category: 'smileys' },
  { emoji: '😍', keywords: '하트 사랑 heart eyes love adore', category: 'smileys' },
  { emoji: '🥺', keywords: '슬픔 애원 pleading sad puppy', category: 'smileys' },
  { emoji: '😊', keywords: '미소 행복 blush happy smile warm', category: 'smileys' },
  { emoji: '🤔', keywords: '생각 고민 thinking ponder consider', category: 'smileys' },
  { emoji: '😭', keywords: '울음 슬픔 crying sob tears sad', category: 'smileys' },
  { emoji: '😘', keywords: '뽀뽀 키스 kiss love heart', category: 'smileys' },
  { emoji: '🥰', keywords: '사랑 하트 smiling hearts love adore', category: 'smileys' },
  { emoji: '😎', keywords: '멋짐 선글라스 cool sunglasses awesome', category: 'smileys' },
  { emoji: '😅', keywords: '땀 웃음 sweat smile nervous relief', category: 'smileys' },
  { emoji: '😉', keywords: '윙크 wink playful flirt', category: 'smileys' },
  { emoji: '😃', keywords: '웃음 기쁨 smile happy cheerful', category: 'smileys' },
  { emoji: '😄', keywords: '환한 웃음 grinning smile happy', category: 'smileys' },
  { emoji: '😁', keywords: '환하게 웃음 beaming smile happy', category: 'smileys' },
  { emoji: '🤣', keywords: '웃음 rolling laughing funny hilarious', category: 'smileys' },
  { emoji: '😆', keywords: '크게 웃음 laughing grinning squinting', category: 'smileys' },
  { emoji: '😇', keywords: '천사 angel innocent halo', category: 'smileys' },
  { emoji: '🙂', keywords: '미소 smile slightly happy', category: 'smileys' },
  { emoji: '🙃', keywords: '거꾸로 upside down sarcastic silly', category: 'smileys' },
  { emoji: '😋', keywords: '맛있음 yummy delicious savoring', category: 'smileys' },
  { emoji: '😌', keywords: '만족 relieved content peaceful', category: 'smileys' },
  { emoji: '😏', keywords: '짓궂음 smirk sly confident', category: 'smileys' },
  { emoji: '😳', keywords: '부끄러움 flushed embarrassed surprised', category: 'smileys' },
  { emoji: '🥹', keywords: '감동 눈물 tears touched emotional', category: 'smileys' },
  { emoji: '😬', keywords: '어색함 grimace awkward nervous', category: 'smileys' },
  { emoji: '😴', keywords: '졸림 sleeping tired sleepy', category: 'smileys' },
  { emoji: '😪', keywords: '졸림 sleepy tired yawn', category: 'smileys' },
  { emoji: '🤗', keywords: '포옹 hug embrace warm', category: 'smileys' },
  { emoji: '🤭', keywords: '놀람 oops surprise giggle', category: 'smileys' },

  // People & Body (25 emojis)
  { emoji: '👋', keywords: '손흔듦 wave hello goodbye hi', category: 'people' },
  { emoji: '👍', keywords: '좋아요 thumbs up like good approve', category: 'people' },
  { emoji: '👎', keywords: '싫어요 thumbs down dislike bad disapprove', category: 'people' },
  { emoji: '👏', keywords: '박수 clap applause bravo congratulations', category: 'people' },
  { emoji: '🙏', keywords: '기도 pray please thanks gratitude', category: 'people' },
  { emoji: '💪', keywords: '힘 근육 strong muscle power flex', category: 'people' },
  { emoji: '🤝', keywords: '악수 handshake deal agreement partnership', category: 'people' },
  { emoji: '✌️', keywords: '평화 피스 peace victory two', category: 'people' },
  { emoji: '👌', keywords: '오케이 okay ok perfect fine', category: 'people' },
  { emoji: '🖐️', keywords: '손 hand five stop palm', category: 'people' },
  { emoji: '✋', keywords: '손들기 raised hand stop high', category: 'people' },
  { emoji: '🤚', keywords: '손등 raised back hand', category: 'people' },
  { emoji: '👊', keywords: '주먹 fist bump punch', category: 'people' },
  { emoji: '✊', keywords: '주먹 raised fist power solidarity', category: 'people' },
  { emoji: '🤛', keywords: '왼쪽 주먹 left fist bump', category: 'people' },
  { emoji: '🤜', keywords: '오른쪽 주먹 right fist bump', category: 'people' },
  { emoji: '🤞', keywords: '행운 fingers crossed luck hope', category: 'people' },
  { emoji: '🤟', keywords: '사랑 love you rock', category: 'people' },
  { emoji: '🤘', keywords: '락 rock horns metal', category: 'people' },
  { emoji: '👈', keywords: '왼쪽 가리킴 left point finger', category: 'people' },
  { emoji: '👉', keywords: '오른쪽 가리킴 right point finger', category: 'people' },
  { emoji: '👆', keywords: '위 가리킴 up point finger', category: 'people' },
  { emoji: '👇', keywords: '아래 가리킴 down point finger', category: 'people' },
  { emoji: '🙌', keywords: '만세 raising hands celebration hooray', category: 'people' },
  { emoji: '👐', keywords: '열린 손 open hands', category: 'people' },

  // Animals & Nature (30 emojis)
  { emoji: '🐶', keywords: '강아지 개 dog puppy pet cute', category: 'animals' },
  { emoji: '🐱', keywords: '고양이 cat kitten pet cute', category: 'animals' },
  { emoji: '🐭', keywords: '쥐 mouse rat small', category: 'animals' },
  { emoji: '🐹', keywords: '햄스터 hamster pet cute', category: 'animals' },
  { emoji: '🐰', keywords: '토끼 rabbit bunny cute hop', category: 'animals' },
  { emoji: '🦊', keywords: '여우 fox clever smart', category: 'animals' },
  { emoji: '🐻', keywords: '곰 bear teddy strong', category: 'animals' },
  { emoji: '🐼', keywords: '판다 panda bamboo cute', category: 'animals' },
  { emoji: '🐸', keywords: '개구리 frog toad green', category: 'animals' },
  { emoji: '🦁', keywords: '사자 lion king strong', category: 'animals' },
  { emoji: '🐯', keywords: '호랑이 tiger strong fierce', category: 'animals' },
  { emoji: '🐮', keywords: '소 cow cattle milk', category: 'animals' },
  { emoji: '🐷', keywords: '돼지 pig pork cute', category: 'animals' },
  { emoji: '🐵', keywords: '원숭이 monkey primate playful', category: 'animals' },
  { emoji: '🐔', keywords: '닭 chicken rooster hen', category: 'animals' },
  { emoji: '🐧', keywords: '펭귄 penguin cute waddle', category: 'animals' },
  { emoji: '🐦', keywords: '새 bird fly tweet', category: 'animals' },
  { emoji: '🦅', keywords: '독수리 eagle hawk strong', category: 'animals' },
  { emoji: '🦋', keywords: '나비 butterfly pretty colorful', category: 'animals' },
  { emoji: '🐝', keywords: '벌 bee honey buzz', category: 'animals' },
  { emoji: '🐢', keywords: '거북이 turtle slow shell', category: 'animals' },
  { emoji: '🐍', keywords: '뱀 snake serpent', category: 'animals' },
  { emoji: '🦖', keywords: '공룡 dinosaur t-rex ancient', category: 'animals' },
  { emoji: '🐙', keywords: '문어 octopus tentacles sea', category: 'animals' },
  { emoji: '🦑', keywords: '오징어 squid sea tentacles', category: 'animals' },
  { emoji: '🐠', keywords: '물고기 fish tropical sea', category: 'animals' },
  { emoji: '🐟', keywords: '생선 fish sea ocean', category: 'animals' },
  { emoji: '🐬', keywords: '돌고래 dolphin smart sea', category: 'animals' },
  { emoji: '🦈', keywords: '상어 shark dangerous sea', category: 'animals' },
  { emoji: '🐳', keywords: '고래 whale big sea ocean', category: 'animals' },

  // Food & Drink (35 emojis)
  { emoji: '🍎', keywords: '사과 apple red fruit healthy', category: 'food' },
  { emoji: '🍐', keywords: '배 pear fruit green', category: 'food' },
  { emoji: '🍊', keywords: '오렌지 orange citrus fruit', category: 'food' },
  { emoji: '🍋', keywords: '레몬 lemon citrus sour', category: 'food' },
  { emoji: '🍌', keywords: '바나나 banana yellow fruit', category: 'food' },
  { emoji: '🍉', keywords: '수박 watermelon summer fruit', category: 'food' },
  { emoji: '🍇', keywords: '포도 grapes fruit purple', category: 'food' },
  { emoji: '🍓', keywords: '딸기 strawberry red fruit sweet', category: 'food' },
  { emoji: '🍈', keywords: '멜론 melon fruit green', category: 'food' },
  { emoji: '🍒', keywords: '체리 cherry red fruit', category: 'food' },
  { emoji: '🍑', keywords: '복숭아 peach fruit pink', category: 'food' },
  { emoji: '🍍', keywords: '파인애플 pineapple tropical fruit', category: 'food' },
  { emoji: '🥭', keywords: '망고 mango tropical fruit', category: 'food' },
  { emoji: '🥥', keywords: '코코넛 coconut tropical nut', category: 'food' },
  { emoji: '🥝', keywords: '키위 kiwi fruit green', category: 'food' },
  { emoji: '🍅', keywords: '토마토 tomato red vegetable', category: 'food' },
  { emoji: '🥑', keywords: '아보카도 avocado healthy green', category: 'food' },
  { emoji: '🍕', keywords: '피자 pizza italian cheese', category: 'food' },
  { emoji: '🍔', keywords: '햄버거 burger hamburger fast food', category: 'food' },
  { emoji: '🍟', keywords: '감자튀김 fries french potato', category: 'food' },
  { emoji: '🌮', keywords: '타코 taco mexican food', category: 'food' },
  { emoji: '🍜', keywords: '라면 국수 noodle ramen soup', category: 'food' },
  { emoji: '🍣', keywords: '초밥 sushi japanese fish', category: 'food' },
  { emoji: '🍱', keywords: '도시락 bento lunch box', category: 'food' },
  { emoji: '🍛', keywords: '카레 curry rice indian', category: 'food' },
  { emoji: '🍝', keywords: '스파게티 pasta italian noodle', category: 'food' },
  { emoji: '🍦', keywords: '아이스크림 ice cream dessert cold', category: 'food' },
  { emoji: '🍰', keywords: '케이크 cake dessert sweet birthday', category: 'food' },
  { emoji: '🎂', keywords: '생일 케이크 birthday cake celebration', category: 'food' },
  { emoji: '🍪', keywords: '쿠키 cookie biscuit sweet', category: 'food' },
  { emoji: '🍩', keywords: '도넛 donut doughnut sweet', category: 'food' },
  { emoji: '☕', keywords: '커피 coffee hot drink cafe', category: 'food' },
  { emoji: '🍵', keywords: '차 tea hot drink green', category: 'food' },
  { emoji: '🍺', keywords: '맥주 beer alcohol drink', category: 'food' },
  { emoji: '🍷', keywords: '와인 wine alcohol drink red', category: 'food' },

  // Travel & Places (25 emojis)
  { emoji: '🚗', keywords: '자동차 차 car automobile vehicle', category: 'travel' },
  { emoji: '🚕', keywords: '택시 taxi cab yellow car', category: 'travel' },
  { emoji: '🚙', keywords: 'SUV 차량 vehicle car blue', category: 'travel' },
  { emoji: '🚌', keywords: '버스 bus public transport', category: 'travel' },
  { emoji: '🚎', keywords: '트롤리 버스 trolleybus electric bus', category: 'travel' },
  { emoji: '🏎️', keywords: '경주용 차 race car fast speed', category: 'travel' },
  { emoji: '✈️', keywords: '비행기 airplane plane flight travel', category: 'travel' },
  { emoji: '🚀', keywords: '로켓 rocket space launch', category: 'travel' },
  { emoji: '🚁', keywords: '헬리콥터 helicopter flight', category: 'travel' },
  { emoji: '🚂', keywords: '기차 train locomotive railway', category: 'travel' },
  { emoji: '🚆', keywords: '열차 train railway transport', category: 'travel' },
  { emoji: '🚇', keywords: '지하철 metro subway underground', category: 'travel' },
  { emoji: '🛺', keywords: '툭툭 auto rickshaw taxi', category: 'travel' },
  { emoji: '🚲', keywords: '자전거 bicycle bike cycling', category: 'travel' },
  { emoji: '🛴', keywords: '킥보드 scooter kick', category: 'travel' },
  { emoji: '🏠', keywords: '집 house home building', category: 'travel' },
  { emoji: '🏢', keywords: '빌딩 office building business', category: 'travel' },
  { emoji: '🏖️', keywords: '해변 beach sand summer vacation', category: 'travel' },
  { emoji: '🏝️', keywords: '섬 island tropical paradise', category: 'travel' },
  { emoji: '🗼', keywords: '탑 tower tokyo eiffel', category: 'travel' },
  { emoji: '🗽', keywords: '자유의 여신상 statue liberty new york', category: 'travel' },
  { emoji: '🌍', keywords: '지구 유럽 아프리카 earth globe europe africa', category: 'travel' },
  { emoji: '🌎', keywords: '지구 아메리카 earth globe americas', category: 'travel' },
  { emoji: '🌏', keywords: '지구 아시아 earth globe asia australia', category: 'travel' },
  { emoji: '🗺️', keywords: '지도 map world navigation', category: 'travel' },

  // Activities (25 emojis)
  { emoji: '⚽', keywords: '축구 soccer football ball sport', category: 'activities' },
  { emoji: '🏀', keywords: '농구 basketball ball sport', category: 'activities' },
  { emoji: '🏈', keywords: '미식축구 american football sport', category: 'activities' },
  { emoji: '⚾', keywords: '야구 baseball ball sport', category: 'activities' },
  { emoji: '🎾', keywords: '테니스 tennis ball sport', category: 'activities' },
  { emoji: '🏐', keywords: '배구 volleyball ball sport', category: 'activities' },
  { emoji: '🎱', keywords: '당구 billiards pool 8ball', category: 'activities' },
  { emoji: '🎮', keywords: '게임 game controller video gaming', category: 'activities' },
  { emoji: '🎯', keywords: '다트 dart target bullseye aim', category: 'activities' },
  { emoji: '🎲', keywords: '주사위 dice game random', category: 'activities' },
  { emoji: '🏆', keywords: '트로피 trophy winner champion award', category: 'activities' },
  { emoji: '🥇', keywords: '금메달 1등 gold medal first winner', category: 'activities' },
  { emoji: '🥈', keywords: '은메달 2등 silver medal second', category: 'activities' },
  { emoji: '🥉', keywords: '동메달 3등 bronze medal third', category: 'activities' },
  { emoji: '🎵', keywords: '음악 music note sound', category: 'activities' },
  { emoji: '🎶', keywords: '음악 노래 musical notes song', category: 'activities' },
  { emoji: '🎸', keywords: '기타 guitar rock music', category: 'activities' },
  { emoji: '🎹', keywords: '피아노 piano keyboard music', category: 'activities' },
  { emoji: '🎤', keywords: '마이크 microphone sing karaoke', category: 'activities' },
  { emoji: '🎧', keywords: '헤드폰 headphones music listen', category: 'activities' },
  { emoji: '🎬', keywords: '영화 촬영 movie clapper film', category: 'activities' },
  { emoji: '🎨', keywords: '미술 그림 art palette paint', category: 'activities' },
  { emoji: '📸', keywords: '카메라 사진 camera photo flash', category: 'activities' },
  { emoji: '📷', keywords: '카메라 camera photo picture', category: 'activities' },
  { emoji: '🎪', keywords: '서커스 circus tent carnival', category: 'activities' },

  // Objects (30 emojis)
  { emoji: '📱', keywords: '휴대폰 스마트폰 mobile phone smartphone', category: 'objects' },
  { emoji: '💻', keywords: '노트북 컴퓨터 laptop computer pc', category: 'objects' },
  { emoji: '⌨️', keywords: '키보드 keyboard typing', category: 'objects' },
  { emoji: '🖥️', keywords: '데스크탑 컴퓨터 desktop computer monitor', category: 'objects' },
  { emoji: '🖨️', keywords: '프린터 printer print', category: 'objects' },
  { emoji: '📷', keywords: '카메라 camera photo picture', category: 'objects' },
  { emoji: '📹', keywords: '비디오 카메라 video camera recording', category: 'objects' },
  { emoji: '💡', keywords: '전구 아이디어 lightbulb idea bright', category: 'objects' },
  { emoji: '🔦', keywords: '손전등 flashlight torch light', category: 'objects' },
  { emoji: '🔧', keywords: '렌치 공구 wrench tool fix', category: 'objects' },
  { emoji: '🔨', keywords: '망치 hammer tool build', category: 'objects' },
  { emoji: '⚒️', keywords: '망치 곡괭이 hammer pick tools', category: 'objects' },
  { emoji: '🔩', keywords: '나사 bolt nut screw', category: 'objects' },
  { emoji: '📦', keywords: '박스 상자 package box delivery', category: 'objects' },
  { emoji: '📫', keywords: '우편함 mailbox mail post', category: 'objects' },
  { emoji: '✉️', keywords: '편지 envelope mail letter', category: 'objects' },
  { emoji: '📧', keywords: '이메일 email mail electronic', category: 'objects' },
  { emoji: '📝', keywords: '메모 글쓰기 memo writing note', category: 'objects' },
  { emoji: '📄', keywords: '문서 document paper page', category: 'objects' },
  { emoji: '📋', keywords: '클립보드 clipboard list', category: 'objects' },
  { emoji: '📌', keywords: '핀 pushpin pin mark', category: 'objects' },
  { emoji: '📎', keywords: '클립 paperclip attach', category: 'objects' },
  { emoji: '🔑', keywords: '열쇠 key unlock password', category: 'objects' },
  { emoji: '🔒', keywords: '자물쇠 잠김 lock locked secure', category: 'objects' },
  { emoji: '🔓', keywords: '열린 자물쇠 unlock unlocked open', category: 'objects' },
  { emoji: '🔍', keywords: '돋보기 찾기 magnifying glass search find', category: 'objects' },
  { emoji: '🔎', keywords: '돋보기 오른쪽 magnifying glass right search', category: 'objects' },
  { emoji: '💰', keywords: '돈 자루 money bag dollar wealth', category: 'objects' },
  { emoji: '💳', keywords: '카드 신용카드 credit card payment', category: 'objects' },
  { emoji: '💎', keywords: '다이아몬드 보석 diamond gem jewel', category: 'objects' },

  // Symbols (30 emojis)
  { emoji: '❤️', keywords: '빨강 하트 red heart love romance', category: 'symbols' },
  { emoji: '🧡', keywords: '주황 하트 orange heart love', category: 'symbols' },
  { emoji: '💛', keywords: '노랑 하트 yellow heart love friendship', category: 'symbols' },
  { emoji: '💚', keywords: '초록 하트 green heart love nature', category: 'symbols' },
  { emoji: '💙', keywords: '파랑 하트 blue heart love trust', category: 'symbols' },
  { emoji: '💜', keywords: '보라 하트 purple heart love magic', category: 'symbols' },
  { emoji: '🖤', keywords: '검정 하트 black heart love dark', category: 'symbols' },
  { emoji: '🤍', keywords: '하얀 하트 white heart love pure', category: 'symbols' },
  { emoji: '💔', keywords: '상처 하트 broken heart sad heartbreak', category: 'symbols' },
  { emoji: '❗', keywords: '느낌표 exclamation mark important alert', category: 'symbols' },
  { emoji: '❓', keywords: '물음표 question mark ask wonder', category: 'symbols' },
  { emoji: '❕', keywords: '느낌표 흰색 white exclamation mark', category: 'symbols' },
  { emoji: '❔', keywords: '물음표 흰색 white question mark', category: 'symbols' },
  { emoji: '✅', keywords: '체크 완료 check mark done success', category: 'symbols' },
  { emoji: '❌', keywords: '엑스 취소 cross mark cancel wrong no', category: 'symbols' },
  { emoji: '⭐', keywords: '별 star favorite bookmark', category: 'symbols' },
  { emoji: '🌟', keywords: '빛나는 별 glowing star sparkle', category: 'symbols' },
  { emoji: '💯', keywords: '100점 백점 hundred points perfect score', category: 'symbols' },
  { emoji: '🔥', keywords: '불 화재 fire hot lit', category: 'symbols' },
  { emoji: '💫', keywords: '현기증 dizzy star sparkle', category: 'symbols' },
  { emoji: '✨', keywords: '반짝 sparkles shine magic', category: 'symbols' },
  { emoji: '🎉', keywords: '축하 파티 party popper celebration', category: 'symbols' },
  { emoji: '🎊', keywords: '축하 장식 confetti ball celebration', category: 'symbols' },
  { emoji: '💢', keywords: '화남 anger symbol mad angry', category: 'symbols' },
  { emoji: '💬', keywords: '말풍선 speech balloon comment talk', category: 'symbols' },
  { emoji: '💭', keywords: '생각 thought balloon thinking', category: 'symbols' },
  { emoji: '💤', keywords: '잠 수면 sleep zzz sleeping', category: 'symbols' },
  { emoji: '🔔', keywords: '종 bell notification ring alarm', category: 'symbols' },
  { emoji: '🔕', keywords: '종 끔 bell slash mute silent', category: 'symbols' },
  { emoji: '🆕', keywords: '새로운 new latest fresh', category: 'symbols' },

  // Flags (20 emojis)
  { emoji: '🇰🇷', keywords: '한국 대한민국 south korea korean flag', category: 'flags' },
  { emoji: '🇺🇸', keywords: '미국 america united states usa flag', category: 'flags' },
  { emoji: '🇯🇵', keywords: '일본 japan japanese flag', category: 'flags' },
  { emoji: '🇨🇳', keywords: '중국 china chinese flag', category: 'flags' },
  { emoji: '🇬🇧', keywords: '영국 britain england uk flag', category: 'flags' },
  { emoji: '🇫🇷', keywords: '프랑스 france french flag', category: 'flags' },
  { emoji: '🇩🇪', keywords: '독일 germany german flag', category: 'flags' },
  { emoji: '🇮🇹', keywords: '이탈리아 italy italian flag', category: 'flags' },
  { emoji: '🇪🇸', keywords: '스페인 spain spanish flag', category: 'flags' },
  { emoji: '🇧🇷', keywords: '브라질 brazil brazilian flag', category: 'flags' },
  { emoji: '🇦🇺', keywords: '호주 australia australian flag', category: 'flags' },
  { emoji: '🇨🇦', keywords: '캐나다 canada canadian flag', category: 'flags' },
  { emoji: '🇮🇳', keywords: '인도 india indian flag', category: 'flags' },
  { emoji: '🇷🇺', keywords: '러시아 russia russian flag', category: 'flags' },
  { emoji: '🇲🇽', keywords: '멕시코 mexico mexican flag', category: 'flags' },
  { emoji: '🇳🇱', keywords: '네덜란드 netherlands dutch flag', category: 'flags' },
  { emoji: '🇸🇪', keywords: '스웨덴 sweden swedish flag', category: 'flags' },
  { emoji: '🇨🇭', keywords: '스위스 switzerland swiss flag', category: 'flags' },
  { emoji: '🇹🇭', keywords: '태국 thailand thai flag', category: 'flags' },
  { emoji: '🇻🇳', keywords: '베트남 vietnam vietnamese flag', category: 'flags' },
]

const CATEGORIES = [
  { id: 'all', labelKey: 'categories.all' },
  { id: 'smileys', labelKey: 'categories.smileys' },
  { id: 'people', labelKey: 'categories.people' },
  { id: 'animals', labelKey: 'categories.animals' },
  { id: 'food', labelKey: 'categories.food' },
  { id: 'travel', labelKey: 'categories.travel' },
  { id: 'activities', labelKey: 'categories.activities' },
  { id: 'objects', labelKey: 'categories.objects' },
  { id: 'symbols', labelKey: 'categories.symbols' },
  { id: 'flags', labelKey: 'categories.flags' },
]

const RECENT_EMOJIS_KEY = 'toolhub-recent-emojis'
const MAX_RECENT_EMOJIS = 20

export default function EmojiPicker() {
  const t = useTranslations('emojiPicker')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [recentEmojis, setRecentEmojis] = useState<string[]>([])
  const [copiedEmoji, setCopiedEmoji] = useState<string | null>(null)

  // Load recent emojis from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_EMOJIS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        setRecentEmojis(parsed)
      }
    } catch (error) {
      console.error('Failed to load recent emojis:', error)
    }
  }, [])

  // Filter emojis based on search and category
  const filteredEmojis = useMemo(() => {
    let filtered = EMOJI_DATA

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((emoji) => emoji.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (emoji) =>
          emoji.keywords.toLowerCase().includes(query) ||
          emoji.emoji.includes(query)
      )
    }

    return filtered
  }, [searchQuery, selectedCategory])

  // Copy emoji to clipboard
  const copyEmoji = useCallback(
    async (emoji: string) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(emoji)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = emoji
          textarea.style.position = 'fixed'
          textarea.style.left = '-999999px'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }

        setCopiedEmoji(emoji)
        setTimeout(() => setCopiedEmoji(null), 2000)

        // Update recent emojis
        setRecentEmojis((prev) => {
          const updated = [emoji, ...prev.filter((e) => e !== emoji)].slice(
            0,
            MAX_RECENT_EMOJIS
          )
          try {
            localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated))
          } catch (error) {
            console.error('Failed to save recent emojis:', error)
          }
          return updated
        })
      } catch (error) {
        console.error('Failed to copy emoji:', error)
        setCopiedEmoji(emoji)
        setTimeout(() => setCopiedEmoji(null), 2000)
      }
    },
    []
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className={`w-full pl-10 pr-4 py-3 ${glassInput} focus:ring-2 focus:ring-blue-500 focus:outline-none`}
        />
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 min-w-max sm:min-w-0">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t(category.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Emoji Grid */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        {/* Counter */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedCategory === 'all'
              ? '전체 이모지'
              : t('categories.' + selectedCategory)}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredEmojis.length}{t('totalEmojis')}
          </span>
        </div>

        {/* Recently Used */}
        {!!recentEmojis.length && selectedCategory === 'all' && !searchQuery && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('recentlyUsed')}
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {recentEmojis.map((emoji, index) => (
                <button
                  key={`recent-${emoji}-${index}`}
                  onClick={() => copyEmoji(emoji)}
                  className="relative group aspect-square flex items-center justify-center text-3xl sm:text-4xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={emoji}
                >
                  {emoji}
                  {copiedEmoji === emoji && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {t('copied')}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700" />
          </div>
        )}

        {/* Emoji Grid */}
        {filteredEmojis.length > 0 ? (
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {filteredEmojis.map((emojiData, index) => (
              <button
                key={`${emojiData.emoji}-${index}`}
                onClick={() => copyEmoji(emojiData.emoji)}
                className="relative group aspect-square flex items-center justify-center text-3xl sm:text-4xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={emojiData.keywords}
              >
                {emojiData.emoji}
                {copiedEmoji === emojiData.emoji && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap flex items-center gap-1 z-10">
                    <Check className="w-3 h-3" />
                    {t('copied')}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {t('noResults')}
          </div>
        )}
      </div>

      {/* Guide Section */}
      <div className={`${glassCard} ${glassInset} p-6`}>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t('guide.title')}
        </h2>

        <div className="space-y-6">
          {/* How to Use */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.howToUse.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(
                t.raw('guide.howToUse.items') as string[]
              ).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Copy className="w-4 h-4 mt-1 flex-shrink-0 text-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              {t('guide.tips.title')}
            </h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              {(t.raw('guide.tips.items') as string[]).map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1 flex-shrink-0">💡</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
