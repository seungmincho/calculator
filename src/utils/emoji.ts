/** 이모지·특수문자·이모티콘 데이터 + 한글 검색·피부색·코드포인트. 검증: node scripts/check-emoji.ts */
import { chosung } from './koreanSyllable.ts'
import { engToKorConvert } from './keyboardConvert.ts'

export type EmojiCategory = 'smileys' | 'people' | 'animals' | 'food' | 'travel' | 'activities' | 'objects' | 'symbols' | 'flags'
export interface Emoji { e: string; ko: string; en: string; cat: EmojiCategory }

// 'emoji|한글 키워드(첫 단어 = 이름)|english name,keyword,…'
const RAW: Record<EmojiCategory, string> = {
  smileys: `
😀|웃음 기쁨 스마일 활짝|grinning face,smile,happy
😃|웃음 기쁨 신남|grinning face with big eyes,smile,happy
😄|웃음 환한웃음 기쁨|grinning face with smiling eyes,smile
😁|활짝 웃음 이빨|beaming face,grin
😆|빵터짐 크게웃음 ㅋㅋ|grinning squinting face,laugh
😅|머쓱 땀 민망 식은땀 웃음|grinning face with sweat,nervous
🤣|데굴데굴 웃음 빵터짐 개웃김 ㅋㅋ|rolling on the floor laughing,lol,rofl
😂|웃겨 눈물 웃음 빵터짐 ㅋㅋ|face with tears of joy,laugh,lol
🙂|미소 살짝웃음|slightly smiling face,smile
🙃|거꾸로 장난 비꼼|upside-down face,silly,sarcastic
🫠|녹음 녹는얼굴 민망 더워|melting face,hot,embarrassed
😉|윙크 장난|winking face,wink
😊|미소 행복 수줍 기쁨 감사|smiling face with smiling eyes,blush,happy
😇|천사 착함 순수|smiling face with halo,angel,innocent
🥰|사랑 하트얼굴 행복 좋아|smiling face with hearts,love,adore
😍|하트눈 사랑 반함 좋아|smiling face with heart-eyes,love,crush
🤩|별눈 신남 감탄 대박|star-struck,excited,wow
😘|뽀뽀 키스 사랑 하트뽀뽀|face blowing a kiss,kiss,love
😗|뽀뽀 키스|kissing face,kiss
😚|뽀뽀 수줍|kissing face with closed eyes,kiss
😋|냠냠 맛있음 맛있다|face savoring food,yummy,delicious
😛|메롱 혀|face with tongue,tongue
😜|메롱 윙크 장난|winking face with tongue,silly
🤪|정신없음 미친 장난|zany face,crazy,goofy
😝|메롱 장난|squinting face with tongue
🤑|돈 부자|money-mouth face,rich,money
🤗|포옹 허그 안아줘|smiling face with open hands,hug
🤭|킥킥 웃음참기 앗|face with hand over mouth,giggle,oops
🫢|헉 놀람 입막음|face with open eyes and hand over mouth,gasp
🤫|쉿 조용 비밀|shushing face,quiet,secret
🤔|생각 고민 흠|thinking face,think,hmm
🫡|경례 충성 알겠습니다|saluting face,salute
🤐|입다물기 비밀 지퍼|zipper-mouth face,secret
🤨|의심 수상 갸웃|face with raised eyebrow,suspicious
😐|무표정 무덤덤|neutral face,meh
😑|할말없음 무표정|expressionless face
😶|침묵 할말없음|face without mouth,silent
🫥|투명 존재감없음|dotted line face,invisible
😏|썩소 의미심장 흥|smirking face,smirk
😒|시큰둥 불만 별로|unamused face,meh
🙄|어이없음 눈굴림 한심|face with rolling eyes,eye roll
😬|어색 이빨 민망|grimacing face,awkward
😮‍💨|한숨 휴|face exhaling,sigh,relief
😌|안도 만족 평온|relieved face,calm
😔|시무룩 우울 슬픔|pensive face,sad
😪|졸림 콧물|sleepy face,tired
🤤|군침 침 먹고싶다|drooling face,drool
😴|잠 졸림 쿨쿨 zzz|sleeping face,sleep
😷|마스크 아픔 감기|face with medical mask,sick,mask
🤒|열 아픔 감기 체온계|face with thermometer,sick,fever
🤕|부상 아픔 붕대|face with head-bandage,hurt
🤢|메스꺼움 토 역겨움|nauseated face,sick,gross
🤮|구토 토 역겨움|face vomiting,vomit
🤧|재채기 감기 콧물|sneezing face,sneeze,cold
🥵|더위 더움 땀 화끈|hot face,hot,sweat
🥶|추위 추움 얼음 덜덜|cold face,cold,freezing
🥴|취함 어지러움 술|woozy face,drunk,dizzy
😵|기절 어지러움|face with crossed-out eyes,dizzy
😵‍💫|어질어질 혼란|face with spiral eyes,dizzy
🤯|충격 머리폭발 대박|exploding head,mind blown,shock
🤠|카우보이|cowboy hat face,cowboy
🥳|축하 파티 생일|partying face,party,celebrate
🥸|변장 위장|disguised face,disguise
😎|멋짐 선글라스 쿨|smiling face with sunglasses,cool
🤓|범생이 공부 안경|nerd face,nerd,geek
🧐|관찰 돋보기 탐정|face with monocle,inspect
😕|혼란 갸우뚱 시무룩|confused face,confused
😟|걱정 불안|worried face,worried
🙁|시무룩 슬픔|slightly frowning face,sad
😮|놀람 헉 오|face with open mouth,surprised,wow
😯|놀람 조용히|hushed face,surprised
😲|깜짝 놀람 헉|astonished face,shocked
😳|당황 부끄러움 화들짝|flushed face,embarrassed
🥺|애원 부탁 글썽 제발|pleading face,please,puppy eyes
🥹|감동 글썽 눈물 참기|face holding back tears,touched
😦|당황 놀람|frowning face with open mouth
😧|괴로움 당황|anguished face
😨|무서움 공포 겁|fearful face,scared
😰|초조 식은땀 불안|anxious face with sweat,nervous
😥|실망 안도 휴|sad but relieved face
😢|눈물 슬픔 울음 ㅠㅠ|crying face,sad,tear
😭|오열 엉엉 울음 눈물 슬픔 ㅠㅠ|loudly crying face,sob,cry
😱|비명 공포 충격 경악|face screaming in fear,scream,shock
😖|괴로움 혼란|confounded face
😣|끙끙 참음|persevering face
😞|실망 낙담|disappointed face,sad
😓|식은땀 실망|downcast face with sweat
😩|힘들어 지침 피곤|weary face,tired
😫|피곤 지침 짜증|tired face,exhausted
🥱|하품 졸림 지루|yawning face,bored,yawn
😤|씩씩 분노 의기양양|face with steam from nose,frustrated
😡|분노 화남 빡침|enraged face,angry,mad
😠|화남 짜증|angry face,mad
🤬|욕 분노 빡침|face with symbols on mouth,swearing
😈|악마 장난 음흉|smiling face with horns,devil
👿|악마 화남|angry face with horns,devil
💀|해골 죽음 웃겨죽음|skull,dead,lol
☠️|해골 위험 독|skull and crossbones,danger
💩|똥 응가|pile of poo,poop
🤡|광대 삐에로|clown face,clown
👻|유령 귀신 할로윈|ghost,halloween
👽|외계인 에일리언|alien,ufo
🤖|로봇 기계 AI|robot,bot
😺|고양이 웃음|grinning cat,cat
😻|고양이 하트눈|smiling cat with heart-eyes,cat love
🙈|못본척 원숭이 부끄|see-no-evil monkey,shy
🙉|못들은척 원숭이|hear-no-evil monkey
🙊|입막음 원숭이 비밀|speak-no-evil monkey,oops`,
  people: `
👋|안녕 손인사 바이 하이|waving hand,hello,bye,hi
🤚|손등 손|raised back of hand
🖐️|손바닥 다섯 하이파이브|hand with fingers splayed,five
✋|손 멈춰 손들기 하이파이브|raised hand,stop,high five
🖖|벌칸경례 스타트렉|vulcan salute
👌|오케이 좋아 OK 완벽|ok hand,ok,perfect
🤌|손모음 이탈리아|pinched fingers,italian
🤏|쪼끔 조금|pinching hand,small,tiny
✌️|브이 피스 승리 V|victory hand,peace,v
🤞|행운 손가락꼬기 기도|crossed fingers,luck
🫰|손가락하트|hand with index finger and thumb crossed,finger heart
🤟|사랑해 러브유|love-you gesture,love you
🤘|락 메탈 뿔|sign of the horns,rock
🤙|전화해 샤카|call me hand,call
👈|왼쪽 가리킴 손가락|backhand index pointing left,left
👉|오른쪽 가리킴 손가락|backhand index pointing right,right
👆|위 가리킴 손가락|backhand index pointing up,up
🖕|가운데손가락 욕 뻐큐|middle finger
👇|아래 가리킴 손가락|backhand index pointing down,down
☝️|검지 하나 위|index pointing up,one
🫵|너 가리킴 당신|index pointing at the viewer,you
👍|좋아요 최고 따봉 엄지척 굿|thumbs up,like,good,ok
👎|싫어요 별로 나빠요|thumbs down,dislike,bad
✊|주먹 파이팅 화이팅|raised fist,fist,power
👊|펀치 주먹 주먹인사|oncoming fist,punch,fist bump
🤛|왼주먹 주먹인사|left-facing fist
🤜|오른주먹 주먹인사|right-facing fist
👏|박수 짝짝 축하 브라보|clapping hands,clap,applause
🙌|만세 축하 환호|raising hands,hooray,celebrate
🫶|하트손 사랑|heart hands,love
👐|양손 펼침|open hands
🤲|두손 받기 기도|palms up together
🤝|악수 협력 계약|handshake,deal
🙏|감사 기도 부탁 제발 합장|folded hands,thanks,please,pray
✍️|글쓰기 필기|writing hand,write
💅|네일 매니큐어|nail polish,nails
🤳|셀카 셀피|selfie
💪|근육 힘 파이팅 화이팅 운동|flexed biceps,strong,muscle
🦵|다리|leg
🦶|발|foot
👂|귀 듣기|ear,listen
👃|코 냄새|nose,smell
🧠|뇌 두뇌 생각|brain,smart
👀|눈 보기 쳐다봄 관심|eyes,look,see
👁️|눈 하나|eye
👅|혀 메롱|tongue
👄|입 입술|mouth,lips
💋|입술 키스 뽀뽀|kiss mark,lips,kiss
👶|아기 신생아|baby
🧒|어린이 아이|child,kid
👦|소년 남자아이|boy
👧|소녀 여자아이|girl
🧑|사람 성인|person,adult
👨|남자 남성|man
👩|여자 여성|woman
🧓|노인 어르신|older person
👴|할아버지|old man,grandfather
👵|할머니|old woman,grandmother
🙋|저요 손들기 질문|person raising hand,me,question
🙆|오케이 동그라미 좋아|person gesturing ok,ok
🙅|안돼 엑스 거절 노|person gesturing no,no
💁|안내 정보|person tipping hand,info
🤷|몰라 어쩌라고 글쎄|person shrugging,shrug,dunno
🤦|이마짚기 어이없음 한심|person facepalming,facepalm
🙇|죄송 사과 절 꾸벅|person bowing,sorry,bow
🙍|찡그림 불만|person frowning
🧑‍💻|개발자 프로그래머 코딩|technologist,developer,coder
👨‍💼|직장인 회사원|man office worker,office
👩‍🍳|요리사 셰프|woman cook,chef
👮|경찰|police officer,police
👷|공사 노동자|construction worker
🧑‍⚕️|의사 간호사 의료|health worker,doctor
🧑‍🎓|졸업생 학생 졸업|student,graduate
🧑‍🏫|선생님 교사|teacher
👸|공주|princess
🤴|왕자|prince
👼|아기천사 천사|baby angel
🎅|산타 크리스마스|santa claus,christmas
🤰|임산부 임신|pregnant woman,pregnant
🤱|모유수유 육아|breast-feeding
🏃|달리기 뛰기 런닝|person running,run
🚶|걷기 산책|person walking,walk
💃|춤 댄스 여자|woman dancing,dance
🕺|춤 댄스 남자|man dancing,dance
🧘|요가 명상|person in lotus position,yoga
🏋️|헬스 역도 운동|person lifting weights,gym
🚴|자전거 라이딩|person biking,cycling
🏊|수영|person swimming,swim
👫|커플 남녀|woman and man holding hands,couple
💑|연인 커플 사랑|couple with heart,couple
👪|가족|family
🗣️|말하기 발표|speaking head,speak
👤|프로필 사람 실루엣|bust in silhouette,user`,
  animals: `
🐶|강아지 개 멍멍이 댕댕이 반려견|dog face,dog,puppy
🐱|고양이 냥이 야옹|cat face,cat,kitten
🐭|쥐|mouse face,mouse
🐹|햄스터|hamster
🐰|토끼|rabbit face,bunny
🦊|여우|fox
🐻|곰|bear
🐼|판다|panda
🐨|코알라|koala
🐯|호랑이|tiger face,tiger
🦁|사자|lion
🐮|소 젖소|cow face,cow
🐷|돼지 꿀꿀|pig face,pig
🐸|개구리|frog
🐵|원숭이|monkey face,monkey
🐺|늑대|wolf
🐴|말|horse face,horse
🦄|유니콘|unicorn
🐗|멧돼지|boar
🐑|양|ewe,sheep
🐐|염소|goat
🦒|기린|giraffe
🐘|코끼리|elephant
🦔|고슴도치|hedgehog
🦦|수달|otter
🦥|나무늘보 느림|sloth
🐿️|다람쥐|chipmunk,squirrel
🐔|닭|chicken
🐥|병아리|front-facing baby chick,chick
🐧|펭귄|penguin
🐦|새|bird
🦆|오리|duck
🦅|독수리|eagle
🦉|부엉이 올빼미|owl
🦋|나비|butterfly
🐝|꿀벌 벌|honeybee,bee
🐛|애벌레 벌레|bug
🐞|무당벌레|lady beetle
🦟|모기|mosquito
🐌|달팽이 느림|snail
🐢|거북이 느림|turtle
🐍|뱀|snake
🦖|공룡 티라노|t-rex,dinosaur
🐙|문어|octopus
🦑|오징어|squid
🦀|게 꽃게|crab
🦐|새우|shrimp
🐠|열대어 물고기|tropical fish,fish
🐟|물고기 생선|fish
🐬|돌고래|dolphin
🦈|상어|shark
🐳|고래|spouting whale,whale
🌸|벚꽃 꽃 봄|cherry blossom,flower,spring
🌹|장미 꽃|rose,flower
🌷|튤립 꽃|tulip
🌻|해바라기 꽃|sunflower
💐|꽃다발 축하|bouquet,flowers
🌱|새싹 성장|seedling,sprout
🌿|풀 잎|herb,leaf
🍀|네잎클로버 행운|four leaf clover,luck
🍁|단풍 가을|maple leaf,autumn,fall
🍂|낙엽 가을|fallen leaf,autumn
🌲|나무 소나무|evergreen tree,tree
🌴|야자수 여름 휴가|palm tree,summer
🌵|선인장|cactus
☀️|해 태양 맑음 날씨|sun,sunny,weather
🌤️|구름조금 맑음 날씨|sun behind small cloud
⛅|흐림 구름 날씨|sun behind cloud,cloudy
☁️|구름 흐림|cloud,cloudy
🌧️|비 우천 날씨|cloud with rain,rain
⛈️|천둥 번개 비|cloud with lightning and rain,storm
❄️|눈 겨울 눈꽃 추위|snowflake,snow,winter
☃️|눈사람 겨울|snowman
🌈|무지개|rainbow
☔|우산 비|umbrella with rain drops,rain
⚡|번개 전기 빠름|high voltage,lightning,electric
🌙|달 초승달 밤|crescent moon,moon,night
🌕|보름달 달|full moon,moon
🌊|파도 바다|water wave,wave,ocean
💧|물방울 물|droplet,water`,
  food: `
🍎|사과|red apple,apple
🍐|배|pear
🍊|귤 오렌지|tangerine,orange
🍋|레몬|lemon
🍌|바나나|banana
🍉|수박 여름|watermelon
🍇|포도|grapes
🍓|딸기|strawberry
🍈|멜론|melon
🍒|체리|cherries
🍑|복숭아|peach
🍍|파인애플|pineapple
🥭|망고|mango
🥥|코코넛|coconut
🥝|키위|kiwi fruit
🍅|토마토|tomato
🥑|아보카도|avocado
🥕|당근|carrot
🌽|옥수수|ear of corn,corn
🥔|감자|potato
🍠|고구마 군고구마|roasted sweet potato
🌶️|고추 매운|hot pepper,spicy
🧄|마늘|garlic
🥦|브로콜리|broccoli
🍄|버섯|mushroom
🥜|땅콩|peanuts
🌰|밤|chestnut
🍞|빵 식빵|bread
🥐|크루아상 빵|croissant
🥯|베이글|bagel
🧀|치즈|cheese wedge,cheese
🥚|계란 달걀|egg
🍳|계란후라이 요리 아침|cooking,fried egg
🥓|베이컨|bacon
🍗|치킨 닭다리|poultry leg,chicken
🍖|고기 갈비|meat on bone,meat
🥩|스테이크 고기 소고기|cut of meat,steak
🍔|햄버거|hamburger,burger
🍟|감자튀김|french fries,fries
🍕|피자|pizza
🌭|핫도그|hot dog
🥪|샌드위치|sandwich
🌮|타코|taco
🍚|밥 쌀밥|cooked rice,rice
🍙|주먹밥 삼각김밥|rice ball
🍛|카레|curry rice,curry
🍜|라면 국수|steaming bowl,ramen,noodle
🍝|스파게티 파스타|spaghetti,pasta
🍲|찌개 전골 국|pot of food,stew
🥘|요리 빠에야|shallow pan of food
🥗|샐러드 다이어트|green salad,salad
🍣|초밥 스시|sushi
🍱|도시락|bento box,lunch
🥟|만두|dumpling
🍤|새우튀김|fried shrimp
🍡|경단 떡|dango
🍿|팝콘 영화|popcorn
🍦|아이스크림 소프트콘|soft ice cream,ice cream
🍧|빙수 팥빙수|shaved ice
🍰|케이크 조각케이크|shortcake,cake
🎂|생일케이크 생일 케이크 축하|birthday cake,birthday
🧁|컵케이크|cupcake
🍪|쿠키|cookie
🍩|도넛|doughnut,donut
🍫|초콜릿|chocolate bar,chocolate
🍬|사탕|candy
🍭|막대사탕|lollipop
🍯|꿀|honey pot,honey
☕|커피 카페 아메리카노|hot beverage,coffee
🍵|차 녹차|teacup without handle,tea
🧋|버블티 밀크티|bubble tea
🥤|음료수 콜라|cup with straw,soda
🧃|주스|beverage box,juice
🥛|우유|glass of milk,milk
🍺|맥주 술|beer mug,beer
🍻|건배 맥주|clinking beer mugs,cheers
🥂|건배 축하 샴페인|clinking glasses,cheers
🍷|와인 술|wine glass,wine
🍾|샴페인 축하|bottle with popping cork,champagne
🍸|칵테일|cocktail glass,cocktail
🍹|트로피컬 칵테일|tropical drink
🥃|위스키 술|tumbler glass,whisky
🍶|사케 술|sake
🍽️|식사 밥 포크 나이프|fork and knife with plate,meal
🥢|젓가락|chopsticks`,
  travel: `
🚗|자동차 차|automobile,car
🚕|택시|taxi
🚙|SUV 차량|sport utility vehicle,suv
🚌|버스|bus
🚎|트롤리버스 버스|trolleybus
🏎️|경주용차 레이싱|racing car,race
🚓|경찰차|police car
🚑|구급차 응급|ambulance
🚒|소방차|fire engine
🚚|트럭 배달 택배|delivery truck,truck
🛵|스쿠터 오토바이 배달|motor scooter
🏍️|오토바이|motorcycle
🚲|자전거|bicycle,bike
🛴|킥보드|kick scooter
✈️|비행기 여행|airplane,plane,flight
🛫|이륙 출발 비행기|airplane departure
🚀|로켓 우주 발사|rocket,launch
🚁|헬리콥터|helicopter
🚂|기차 증기기관차|locomotive,train
🚄|KTX 고속열차 기차|high-speed train,ktx
🚆|열차 기차|train
🚇|지하철|metro,subway
🚢|배 크루즈|ship
⛵|요트 돛단배|sailboat
🛺|툭툭|auto rickshaw
⛽|주유소 기름|fuel pump,gas
🚦|신호등|vertical traffic light
🧳|캐리어 여행가방|luggage,travel
🏠|집 홈|house,home
🏢|빌딩 회사 사무실|office building,office
🏫|학교|school
🏥|병원|hospital
🏦|은행|bank
🏪|편의점|convenience store
⛪|교회|church
🏰|성 궁전|castle
🗼|도쿄타워 탑|tokyo tower,tower
🗽|자유의여신상 뉴욕|statue of liberty
🗻|후지산 산|mount fuji,mountain
⛰️|산 등산|mountain
🏕️|캠핑 텐트|camping
🏖️|해변 바닷가 휴가|beach with umbrella,beach,vacation
🏝️|섬 무인도|desert island,island
🎡|관람차 놀이공원|ferris wheel
🌃|야경 밤|night with stars,night
🌅|일출 해돋이|sunrise
🌍|지구 유럽 아프리카|globe showing europe-africa,earth
🌎|지구 아메리카|globe showing americas,earth
🌏|지구 아시아|globe showing asia-australia,earth
🗺️|지도 세계지도|world map,map`,
  activities: `
🎉|축하 파티 폭죽 생일|party popper,party,celebrate
🎊|축하 색종이 파티|confetti ball,celebrate
🎁|선물 생일 기프트|wrapped gift,gift,present
🎈|풍선 생일 파티|balloon,party
🎄|크리스마스 트리 성탄절|christmas tree,christmas
🎃|할로윈 호박|jack-o-lantern,halloween
🧧|세뱃돈 봉투 설날|red envelope
🎆|불꽃놀이|fireworks
🎇|불꽃 폭죽|sparkler
🎫|티켓 표|ticket
🏆|트로피 우승 1등|trophy,winner,champion
🥇|금메달 1등 일등|1st place medal,gold
🥈|은메달 2등 이등|2nd place medal,silver
🥉|동메달 3등 삼등|3rd place medal,bronze
🏅|메달|sports medal,medal
⚽|축구 공|soccer ball,football
⚾|야구 공|baseball
🏀|농구 공|basketball
🏐|배구 공|volleyball
🏈|미식축구|american football
🎾|테니스|tennis
🏓|탁구|ping pong
🏸|배드민턴|badminton
⛳|골프|flag in hole,golf
🥊|복싱 권투|boxing glove,boxing
🎳|볼링|bowling
⛸️|스케이트|ice skate
🎿|스키|skis,ski
🎱|당구 포켓볼|pool 8 ball,billiards
🎮|게임 게임기 패드|video game,game,gaming
🎯|다트 과녁 목표|bullseye,target,dart
🎲|주사위|game die,dice
🃏|조커 카드|joker
🧩|퍼즐 조각|puzzle piece,puzzle
🎵|음표 음악|musical note,music
🎶|음악 노래 음표|musical notes,music,song
🎤|마이크 노래방 노래|microphone,karaoke
🎧|헤드폰 음악|headphone,music
🎸|기타|guitar
🎹|피아노 건반|musical keyboard,piano
🎬|영화 촬영 슬레이트|clapper board,movie
🎭|연극 공연|performing arts,theater
🎨|그림 미술 팔레트|artist palette,art
🎪|서커스|circus tent,circus
📚|책 공부 독서|books,study
📸|카메라 사진 찰칵|camera with flash,photo
📷|카메라 사진|camera,photo`,
  objects: `
📱|휴대폰 스마트폰 핸드폰|mobile phone,phone
💻|노트북 컴퓨터|laptop,computer
⌨️|키보드|keyboard
🖥️|모니터 컴퓨터 데스크탑|desktop computer,monitor
🖨️|프린터|printer
📺|티비 TV 텔레비전|television,tv
📹|캠코더 비디오|video camera
🔋|배터리 충전|battery
🔌|플러그 전원 충전|electric plug,plug
💡|전구 아이디어|light bulb,idea
🔦|손전등|flashlight
🕯️|촛불 양초|candle
⏰|알람 시계 기상|alarm clock,alarm
⌛|모래시계 시간|hourglass done,time
📅|달력 일정 날짜|calendar,date
🗓️|일정 스케줄 달력|spiral calendar,schedule
📊|그래프 차트 통계|bar chart,chart
📈|상승 떡상 주식 그래프|chart increasing,up,stocks
📉|하락 떡락 그래프|chart decreasing,down
📁|폴더 파일|file folder,folder
📄|문서 페이지|page facing up,document
📋|클립보드|clipboard
📝|메모 글쓰기|memo,note
✏️|연필 필기|pencil,write
🖊️|펜 볼펜|pen
📌|압정 핀 고정|pushpin,pin
📎|클립 첨부|paperclip,attach
📖|책 독서|open book,book,read
🎓|졸업 학사모|graduation cap,graduate
💼|서류가방 출근 회사|briefcase,work
✉️|편지 봉투|envelope,mail
📧|이메일 메일|e-mail,email
📦|택배 상자 박스|package,box,delivery
📫|우편함|closed mailbox with raised flag,mailbox
📢|확성기 공지 알림|loudspeaker,announcement
📣|메가폰 응원|megaphone,cheer
🔔|알림 종|bell,notification
🔕|알림끔 무음|bell with slash,mute
🔑|열쇠 키|key,password
🔒|잠금 자물쇠|locked,lock
🔓|잠금해제 열림|unlocked,unlock
🔍|검색 돋보기 찾기|magnifying glass tilted left,search
🔎|돋보기 검색|magnifying glass tilted right,search
🔧|공구 렌치 수리|wrench,tool,fix
🔨|망치|hammer
⚒️|망치 곡괭이|hammer and pick
🔩|나사 볼트|nut and bolt
🧲|자석|magnet
💰|돈 돈주머니 부자|money bag,money
💵|달러 지폐 돈|dollar banknote,money
💸|탕진 돈 지출|money with wings,spend
🪙|동전|coin
💳|카드 신용카드 결제|credit card,payment
🧾|영수증|receipt
💎|다이아몬드 보석|gem stone,diamond
🛒|장바구니 쇼핑 카트|shopping cart,shopping
🛍️|쇼핑백 쇼핑|shopping bags
🎀|리본 선물|ribbon,bow
💊|약 알약|pill,medicine
💉|주사 백신|syringe,vaccine
🩹|반창고 밴드|adhesive bandage
🧸|곰인형 인형|teddy bear
🪄|마술봉 마법|magic wand
🛏️|침대 잠|bed
🚽|변기 화장실|toilet
🧻|휴지 화장지|roll of paper,toilet paper`,
  symbols: `
❤️|하트 빨간하트 사랑|red heart,heart,love
🩷|분홍하트 핑크 하트|pink heart,heart
🧡|주황하트 하트|orange heart,heart
💛|노란하트 하트|yellow heart,heart
💚|초록하트 하트|green heart,heart
💙|파란하트 하트|blue heart,heart
🩵|하늘색하트 하트|light blue heart,heart
💜|보라하트 하트|purple heart,heart
🤎|갈색하트 하트|brown heart,heart
🖤|검은하트 하트|black heart,heart
🤍|하얀하트 흰하트 하트|white heart,heart
💔|상처 이별 깨진하트 하트|broken heart,heartbreak
❤️‍🔥|불타는하트 열정 하트|heart on fire,heart
❤️‍🩹|회복 치유 하트|mending heart,heart
❣️|하트느낌표 하트|heart exclamation,heart
💕|두하트 사랑 하트|two hearts,heart,love
💞|빙글하트 사랑 하트|revolving hearts,heart
💓|두근두근 설렘 하트|beating heart,heart
💗|설렘 커지는하트 하트|growing heart,heart
💖|반짝하트 하트|sparkling heart,heart
💘|큐피드 화살 하트|heart with arrow,cupid,heart
💝|하트선물 리본 하트|heart with ribbon,heart
💌|러브레터 편지 하트|love letter,heart
🔥|불 화재 대박 핫|fire,hot,lit
✨|반짝 반짝반짝 빛|sparkles,shine
⭐|별|star
🌟|빛나는별 별|glowing star,star
💫|어질 별 반짝|dizzy,star
💯|100점 백점 완벽|hundred points,perfect,100
💢|화남 분노|anger symbol,angry
💥|쾅 충돌 폭발|collision,boom
💦|땀 물 물방울|sweat droplets,sweat
💨|휙 빠름 바람|dashing away,fast
💬|말풍선 대화 채팅|speech balloon,chat
💭|생각풍선 생각|thought balloon,thinking
💤|쿨쿨 잠 zzz|zzz,sleep
✅|완료 체크 확인 정답|check mark button,check,done
✔️|체크 확인|check mark,check
☑️|체크박스 체크|check box with check
❌|엑스 취소 틀림 오답|cross mark,x,no
⭕|동그라미 정답 O|hollow red circle,correct
❗|느낌표 중요|red exclamation mark,exclamation
❓|물음표 질문|red question mark,question
❕|느낌표 흰색|white exclamation mark
❔|물음표 흰색|white question mark
‼️|느낌표 두개|double exclamation mark
⁉️|느낌표물음표|exclamation question mark
⚠️|경고 주의|warning,caution
🚫|금지 안됨|prohibited,no
⛔|진입금지 금지|no entry
🔞|19금 성인 미성년자불가|no one under eighteen
➕|플러스 더하기|plus
➖|마이너스 빼기|minus
✖️|곱하기|multiply
➗|나누기|divide
➡️|오른쪽 화살표|right arrow,arrow
⬅️|왼쪽 화살표|left arrow,arrow
⬆️|위 화살표|up arrow,arrow
⬇️|아래 화살표|down arrow,arrow
↗️|오른쪽위 화살표|up-right arrow,arrow
🔄|새로고침 반복 화살표|counterclockwise arrows button,refresh
🔝|TOP 탑 최고|top arrow,top
🆕|NEW 새로운 신규|new button,new
🆗|OK 오케이|ok button,ok
🆙|UP 업|up! button,up
🆘|SOS 도움 구조|sos button,help
🔴|빨간원 빨강 동그라미|red circle,circle
🟠|주황원 주황 동그라미|orange circle,circle
🟡|노란원 노랑 동그라미|yellow circle,circle
🟢|초록원 초록 동그라미|green circle,circle
🔵|파란원 파랑 동그라미|blue circle,circle
🟣|보라원 보라 동그라미|purple circle,circle
⚫|검은원 동그라미|black circle,circle
⚪|흰원 동그라미|white circle,circle
🟥|빨간네모 사각형|red square,square
🟩|초록네모 사각형|green square,square
🟦|파란네모 사각형|blue square,square
🔊|소리 스피커 볼륨|speaker high volume,sound
🔇|음소거 무음|muted speaker,mute
♻️|재활용|recycling symbol,recycle
💲|달러 돈|heavy dollar sign,dollar
©️|저작권 카피라이트|copyright
®️|등록상표|registered
™️|상표 TM|trade mark,tm
#️⃣|샵 해시태그 우물정|keycap number sign,hashtag
0️⃣|영 숫자 0|keycap 0,zero
1️⃣|일 하나 숫자 1|keycap 1,one
2️⃣|이 둘 숫자 2|keycap 2,two
3️⃣|삼 셋 숫자 3|keycap 3,three
4️⃣|사 넷 숫자 4|keycap 4,four
5️⃣|오 다섯 숫자 5|keycap 5,five
6️⃣|육 여섯 숫자 6|keycap 6,six
7️⃣|칠 일곱 숫자 7|keycap 7,seven
8️⃣|팔 여덟 숫자 8|keycap 8,eight
9️⃣|구 아홉 숫자 9|keycap 9,nine
🔟|십 열 숫자 10|keycap 10,ten`,
  flags: `
🇰🇷|한국 대한민국 태극기|south korea,korea,flag
🇺🇸|미국 성조기|united states,usa,america,flag
🇯🇵|일본|japan,flag
🇨🇳|중국|china,flag
🇹🇼|대만|taiwan,flag
🇭🇰|홍콩|hong kong,flag
🇬🇧|영국|united kingdom,uk,britain,flag
🇫🇷|프랑스|france,flag
🇩🇪|독일|germany,flag
🇮🇹|이탈리아|italy,flag
🇪🇸|스페인|spain,flag
🇳🇱|네덜란드|netherlands,flag
🇨🇭|스위스|switzerland,flag
🇸🇪|스웨덴|sweden,flag
🇷🇺|러시아|russia,flag
🇨🇦|캐나다|canada,flag
🇲🇽|멕시코|mexico,flag
🇧🇷|브라질|brazil,flag
🇦🇺|호주|australia,flag
🇳🇿|뉴질랜드|new zealand,flag
🇮🇳|인도|india,flag
🇹🇭|태국|thailand,flag
🇻🇳|베트남|vietnam,flag
🇵🇭|필리핀|philippines,flag
🇸🇬|싱가포르|singapore,flag
🇮🇩|인도네시아|indonesia,flag
🇺🇳|유엔 UN|united nations,flag
🏁|체크무늬 결승 레이스|chequered flag,finish
🚩|빨간깃발 경고|triangular flag,red flag
🏳️‍🌈|무지개깃발 프라이드|rainbow flag,pride`,
}

export const EMOJI_CATEGORIES = Object.keys(RAW) as EmojiCategory[]

export const EMOJIS: Emoji[] = EMOJI_CATEGORIES.flatMap((cat) =>
  RAW[cat].trim().split('\n').map((line) => {
    const [e, ko, en = ''] = line.split('|')
    return { e, ko, en, cat }
  })
)

// ── 피부색 (Emoji_Modifier_Base 중 데이터에 있는 것 + 흔한 사람 이모지) ──
export const SKIN_TONES = ['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'] as const
const SKIN_BASES = new Set(Array.from(
  '👋🤚🖐✋🖖👌🤌🤏✌🤞🫰🤟🤘🤙👈👉👆🖕👇☝🫵👍👎✊👊🤛🤜👏🙌🫶👐🤲🙏✍💅🤳💪🦵🦶👂👃' +
  '👶🧒👦👧🧑👨👩🧓👴👵🙋🙆🙅💁🤷🤦🙇🙍👮👷👸🤴👼🎅🤰🤱🏃🚶💃🕺🧘🏋🚴🏊'
))

const first = (s: string) => Array.from(s)[0] ?? ''
export const supportsSkinTone = (e: string) => SKIN_BASES.has(first(e))

/** 첫 코드포인트 뒤에 피부색 수정자 삽입 (뒤따르는 VS16 제거). 🙋‍♀️ → 🙋🏻‍♀️, ✌️ → ✌🏻 */
export function applySkinTone(e: string, tone: string): string {
  if (!tone || !supportsSkinTone(e)) return e
  const cps = Array.from(e)
  const rest = cps.slice(1)
  if (rest[0] === '️') rest.shift()
  return cps[0] + tone + rest.join('')
}

/** 피부색·VS16 제거한 비교용 키 */
const baseKey = (s: string) => s.replace(/[\u{1F3FB}-\u{1F3FF}️]/gu, '')
const BY_KEY = new Map(EMOJIS.map((x) => [baseKey(x.e), x]))
export const findEmoji = (s: string) => BY_KEY.get(baseKey(s))

// ── 코드포인트 표기 ──
const hex = (c: string) => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
export const toCodepoints = (s: string) => Array.from(s).map((c) => 'U+' + hex(c)).join(' ')
export const toHtmlEntity = (s: string) => Array.from(s).map((c) => `&#x${hex(c)};`).join('')
export const toJsEscape = (s: string) => Array.from(s).map((c) => `\\u{${hex(c)}}`).join('')

// ── 특수문자 (한글 자판 자음 + 한자 키 묶음 기준) ──
export interface CharGroup { id: string; ime?: string; rows: [chars: string, keys: string][] }
export const CHAR_GROUPS: CharGroup[] = [
  { id: 'popular', rows: [['★☆♥♡♪♬※☞✓✔✗→←↑↓↔①②③④⑤㈜℃㎡₩·…「」『』【】◆◇■□●○▶◀▲▼♣♧♠♤', '자주 인기 popular']] },
  { id: 'shapes', ime: 'ㅁ', rows: [
    ['★☆✦✧✩✪✫✬✭✮✯✰', '별 star'],
    ['♥♡❤❥❣', '하트 heart 사랑'],
    ['○●◎◯◐◑⊙', '원 동그라미 circle'],
    ['□■▣▢▤▥▦▧▨▩', '네모 사각형 square'],
    ['△▲▽▼▷▶◁◀', '세모 삼각형 재생 triangle'],
    ['◇◆◈', '마름모 diamond'],
    ['♤♠♧♣♢♦', '트럼프 카드 스페이드 클로버 suit'],
    ['♩♪♫♬♭♯', '음표 음악 노래 music note'],
    ['☞☜☝☟', '손가락 가리킴 pointing'],
    ['※', '참고 당구장 reference'],
    ['☎☏', '전화 phone'],
    ['☀☁☂☃♨', '날씨 해 구름 우산 눈사람 온천 weather'],
    ['♂♀', '남자 여자 성별 gender'],
    ['§¶†‡', '절 단락 칼표 section'],
    ['№™®©℡㏇㉿', '번호 상표 저작권 trademark'],
  ] },
  { id: 'arrows', rows: [
    ['→←↑↓↔↕↗↘↙↖', '화살표 방향 arrow'],
    ['⇒⇐⇑⇓⇔⇕', '이중화살표 화살표 arrow'],
    ['➜➔➝➞➟➠➡⬅⬆⬇', '굵은화살표 화살표 arrow'],
    ['↺↻⟲⟳', '회전 새로고침 화살표 rotate'],
  ] },
  { id: 'check', rows: [['✓✔☑✗✘☒', '체크 확인 엑스 check']] },
  { id: 'circled', ime: 'ㅇ', rows: [
    ['①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳', '원숫자 원문자 동그라미숫자 숫자 circled number'],
    ['⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽', '괄호숫자 숫자 parenthesized'],
    ['㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭', '원자음 원문자 자음'],
    ['㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻', '원한글 원문자 가나다'],
    ['㈀㈁㈂㈃㈄㈅㈆㈇㈈㈉㈊㈋㈌㈍㈎㈏㈐㈑㈒㈓㈔㈕㈖㈗㈘㈙㈚㈛㈜', '괄호자음 괄호한글 주식회사 company'],
    ['ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ', '원영문 원알파벳 circled letter'],
  ] },
  { id: 'brackets', ime: 'ㄴ', rows: [
    ['「」『』【】〈〉《》〔〕', '괄호 낫표 겹낫표 꺾쇠 bracket'],
    ['“”‘’＂＇', '따옴표 인용 quote'],
    ['（）［］｛｝', '전각괄호 괄호 bracket'],
  ] },
  { id: 'punct', ime: 'ㄱ', rows: [
    ['·‥…¨〃―∥＼∼～', '점 가운뎃점 말줄임 dot ellipsis'],
    ['！＇，．／：；？＾＿｀｜￣、。', '전각문장부호 문장부호 punctuation'],
    ['¡¿ˇ˘˝˚˙¸˛', '악센트 부호'],
  ] },
  { id: 'math', ime: 'ㄷ', rows: [
    ['±×÷≠≤≥≒≡∞√∴∵', '수학 곱하기 나누기 무한대 루트 math'],
    ['∑∏∫∬∮∂∇∠⊥⌒', '시그마 적분 미분 각도 math'],
    ['∈∋⊆⊇⊂⊃∪∩∧∨¬⇒⇔∀∃', '집합 논리 set logic'],
  ] },
  { id: 'units', ime: 'ㄹ', rows: [
    ['℃℉°′″', '도 온도 섭씨 화씨 각도 celsius degree'],
    ['₩￦$€£¥￠¢', '원 원화 달러 유로 엔 화폐 통화 currency won'],
    ['%‰', '퍼센트 퍼밀 percent'],
    ['㎜㎝㎞㎡㎢㎠㎥㎤㎣', '미터 길이 면적 제곱미터 평방미터 세제곱 m2'],
    ['㎎㎏㎍㏄㎖㎗ℓ㎘', '그램 무게 리터 부피 kg ml'],
    ['㎐㎑㎒㎓㎾㎿㏈Ω', '헤르츠 와트 데시벨 옴 hz'],
    ['㎳㎲㎱㏘㏂', '초 시간 오전 오후 am pm'],
  ] },
  { id: 'numbers', ime: 'ㅈ·ㅊ', rows: [
    ['ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ', '로마숫자 대문자 roman'],
    ['ⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹ', '로마숫자 소문자 roman'],
    ['½⅓⅔¼¾⅛⅜⅝⅞', '분수 fraction'],
    ['¹²³⁴ⁿ', '위첨자 제곱 superscript'],
    ['₁₂₃₄', '아래첨자 subscript'],
  ] },
  { id: 'lines', ime: 'ㅂ', rows: [['─│┌┐┘└├┬┤┴┼━┃┏┓┛┗┣┳┫┻╋', '괘선 표 선 박스 box line']] },
  { id: 'greek', ime: 'ㅎ', rows: [
    ['ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ', '그리스 대문자 알파 오메가 greek'],
    ['αβγδεζηθικλμνξοπρστυφχψω', '그리스 소문자 알파 베타 감마 파이 greek'],
  ] },
]
export const groupChars = (g: CharGroup) => g.rows.map((r) => r[0]).join('')

// ── 이모티콘 (카오모지·한글 텍스트) ──
export interface KaomojiGroup { id: string; keys: string; items: string[] }
export const KAOMOJI_GROUPS: KaomojiGroup[] = [
  { id: 'korean', keys: '한글 텍스트 자음 korean', items: ['ㅋㅋㅋ', 'ㅎㅎ', 'ㅠㅠ', 'ㅜㅜ', 'ㅠㅅㅠ', 'ㅠ_ㅠ', '^^', '^_^', '^^;', '^ㅅ^', '^0^', '-_-', '-_-;', 'ㅡㅡ', 'ㅡ_ㅡ', ';;', 'ㄷㄷ', 'ㅇㅅㅇ', 'ㅇㅁㅇ', 'ㅇㅂㅇ', 'ㅎㅅㅎ', '>_<', 'T_T', 'ㅇㅋ', 'ㄱㅅ', 'ㅊㅋ', 'ㅈㅅ', ':)', ':D', ';)', ':P', 'XD', '<3'] },
  { id: 'happy', keys: '기쁨 웃음 행복 신남 happy joy', items: ['(≧▽≦)', '٩(◕‿◕｡)۶', 'ヽ(•‿•)ノ', '(*^▽^*)', '(๑˃ᴗ˂)ﻭ', '＼(^o^)／', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', '(✿◠‿◠)', '◕‿◕', '٩(ˊᗜˋ*)و', '(｡•̀ᴗ-)✧', '(๑•̀ㅂ•́)و✧'] },
  { id: 'love', keys: '사랑 하트 포옹 안아줘 뽀뽀 love hug', items: ['(づ｡◕‿‿◕｡)づ', '(っ˘з(˘⌣˘ )', '(♡°▽°♡)', '(´,,•ω•,,)♡', '( ˘ ³˘)♥', '(灬º‿º灬)♡', '♡＾▽＾♡', '(๑♡⌓♡๑)', '₍ᐢ. ̫.ᐢ₎♡', '(ㅅ´ ˘ `)♡'] },
  { id: 'sad', keys: '슬픔 눈물 울음 ㅠㅠ sad cry', items: ['(╥﹏╥)', '(ಥ﹏ಥ)', '(T▽T)', '( ´•̥̥̥ω•̥̥̥` )', '(｡•́︿•̀｡)', '(ノ_<。)', '･ﾟ･(｡>ω<｡)･ﾟ･', '(ᗒᗣᗕ)՞', '˚‧º·(˚ ˃̣̣̥⌓˂̣̣̥ )‧º·˚'] },
  { id: 'angry', keys: '화남 분노 빡침 상뒤엎기 테이블 angry table flip', items: ['(╯°□°)╯︵ ┻━┻', '(ノಠ益ಠ)ノ彡┻━┻', '┬─┬ノ( º _ ºノ)', '(╬ Ò﹏Ó)', '( ｀ε´ )', '(｀へ´)', 'ヽ(`Д´)ﾉ', '(≖_≖ )', '(ꐦ°᷄д°᷅)'] },
  { id: 'surprise', keys: '놀람 헉 당황 충격 surprise shock', items: ['Σ(°△°|||)', '(⊙_⊙)', '(°ロ°) !', '⊙﹏⊙', '∑(O_O；)', 'w(°ｏ°)w', '(O_O)', '( ꒪⌓꒪)'] },
  { id: 'greet', keys: '인사 안녕 감사 죄송 꾸벅 hello thanks bow', items: ['(_ _)', 'm(_ _)m', '(^_^)/', '( ´ ▽ ` )ﾉ', '(´• ω •`)ﾉ', 'ヾ(＾∇＾)', 'ヾ(・ω・*)ﾉ', '(*・ω・)ﾉ', '( ˘▽˘)っ♨'] },
  { id: 'etc', keys: '어깨으쓱 몰라 글쎄 썬글라스 멋짐 의심 shrug cool', items: ['¯\\_(ツ)_/¯', '┐(´ー｀)┌', '┐(￣ヘ￣)┌', 'ಠ_ಠ', '( ͡° ͜ʖ ͡°)', '(•_•)', '( •_•)>⌐■-■', '(⌐■_■)', '(¬‿¬)', 'ᕦ(ò_óˇ)ᕤ'] },
  { id: 'animals', keys: '동물 곰 고양이 강아지 토끼 animal bear cat dog', items: ['ʕ•ᴥ•ʔ', 'ʕ っ•ᴥ•ʔっ', '(=^･ω･^=)', 'ฅ^•ﻌ•^ฅ', '(•ㅅ•)', '૮ ・ﻌ・ა', '(ᵔᴥᵔ)', '/ᐠ｡ꞈ｡ᐟ\\', '(・⊝・)', "><(((('>"] },
]

// ── 검색 ──
const CHO_ONLY = /^[ㄱ-ㅎ]+$/
const HAY = EMOJIS.map((x) => ({ x, hay: (x.ko + ' ' + x.en.replace(/,/g, ' ')).toLowerCase(), cho: chosung(x.ko), words: x.ko.split(' ') }))

function matchEmojis(tokens: string[]): Emoji[] {
  const scored: { x: Emoji; s: number }[] = []
  for (const h of HAY) {
    // 점수(토큰별 합, 낮을수록 위): 이름 일치 0 < 키워드 일치 1 < 키워드 앞부분 2 < 부분·초성 일치 3
    let s = 0
    for (const tok of tokens) {
      if (baseKey(h.x.e) === baseKey(tok) || h.words[0] === tok) continue
      if (h.words.includes(tok)) s += 1
      else if (h.words.some((w) => w.startsWith(tok))) s += 2
      else if (h.hay.includes(tok) || (CHO_ONLY.test(tok) && h.cho.includes(tok))) s += 3
      else { s = -1; break }
    }
    if (s >= 0) scored.push({ x: h.x, s })
  }
  return scored.sort((a, b) => a.s - b.s).map((r) => r.x) // Array.sort는 안정 정렬 → 같은 점수는 데이터 순서
}

function matchChars(tokens: string[]): string[] {
  const out = new Set<string>()
  for (const g of CHAR_GROUPS) for (const [chars, keys] of g.rows)
    for (const c of chars) if (tokens.every((tok) => keys.includes(tok) || tok === c)) out.add(c)
  return [...out]
}

function matchKaomoji(tokens: string[]): string[] {
  const out: string[] = []
  for (const g of KAOMOJI_GROUPS) for (const k of g.items)
    if (tokens.every((tok) => g.keys.includes(tok) || k.toLowerCase().includes(tok))) out.push(k)
  return out
}

export interface SearchResult { emojis: Emoji[]; chars: string[]; kaomoji: string[]; fixedQuery?: string }

/** 한글·영어·초성(ㅎㅌ)·이모지 직접 입력 검색. 결과 0개 + 영문이면 한/영 오타(gkxm → 하트)로 재시도 */
export function searchAll(query: string): SearchResult {
  const q = query.trim().toLowerCase()
  if (!q) return { emojis: [], chars: [], kaomoji: [] }
  const tokens = q.split(/\s+/)
  const r: SearchResult = { emojis: matchEmojis(tokens), chars: matchChars(tokens), kaomoji: matchKaomoji(tokens) }
  if (!r.emojis.length && !r.chars.length && !r.kaomoji.length && /^[a-z\s]+$/.test(q)) {
    const fixed = engToKorConvert(q)
    if (fixed !== q && /[가-힣]/.test(fixed)) {
      const r2 = searchAll(fixed)
      if (r2.emojis.length || r2.chars.length || r2.kaomoji.length) return { ...r2, fixedQuery: fixed }
    }
  }
  return r
}
