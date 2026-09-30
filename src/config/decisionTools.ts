/**
 * 랜덤·결정 도구 패밀리. 모든 결정 도구 페이지 상단의 전환 바(DecisionToolsBar) 순서와
 * 단독 페이지(/coin-flip 등) SEO 메타데이터의 단일 출처.
 */
import type { Metadata } from 'next'

export interface DecisionTool {
  href: string
  /** 전환 바에 쓰는 짧은 이름 */
  short: string
  /** 단독 페이지(DecisionToolPage)로 그릴 때만 */
  page?: {
    title: string
    description: string
    keywords: string[]
    intro: string
    faq: { q: string; a: string }[]
  }
}

export const decisionTools: DecisionTool[] = [
  { href: '/ladder-game', short: '사다리 타기' },
  {
    href: '/roulette', short: '돌림판',
    page: {
      title: '돌림판 돌리기 - 온라인 룰렛, 항목 직접 입력 | 툴허브',
      description: '항목을 입력하고 돌림판을 돌려 무작위로 하나를 고르세요. 경품 추첨, 벌칙, 당번 정하기에 쓰는 무료 온라인 룰렛입니다.',
      keywords: ['돌림판', '돌림판 돌리기', '온라인 룰렛', '룰렛 돌리기', '랜덤 룰렛', '추첨 룰렛'],
      intro: '원하는 항목을 입력하면 돌림판이 무작위로 하나를 골라 줍니다. 결과는 링크로 공유할 수 있어 단체방에서 바로 확인할 수 있습니다.',
      faq: [
        { q: '돌림판 결과는 정말 무작위인가요?', a: '네. 회전 각도를 매번 무작위로 정하기 때문에 특정 항목이 유리하지 않습니다.' },
        { q: '항목은 몇 개까지 넣을 수 있나요?', a: '2개 이상이면 되고, 칸이 너무 좁아지지 않는 30개 안팎까지 쓰기 좋습니다.' },
      ],
    },
  },
  { href: '/order-picker', short: '순서 정하기' },
  { href: '/menu-roulette', short: '메뉴 룰렛' },
  {
    href: '/team-divider', short: '팀 나누기',
    page: {
      title: '팀 나누기 - 랜덤 팀 편성, 조 짜기 | 툴허브',
      description: '이름을 입력하면 원하는 팀 수로 공정하게 랜덤 편성합니다. 운동 경기, 조별 과제, 회식 자리 배정에 쓰는 무료 팀 나누기 도구입니다.',
      keywords: ['팀 나누기', '팀나누기', '랜덤 팀 나누기', '조 짜기', '조편성', '팀 편성'],
      intro: '참가자와 팀 수를 정하면 무작위로 인원을 고르게 나눕니다. 다시 섞기 버튼으로 몇 번이든 새로 편성할 수 있습니다.',
      faq: [
        { q: '인원이 팀 수로 나누어떨어지지 않으면 어떻게 되나요?', a: '남는 인원은 앞 팀부터 한 명씩 더 배정해 팀 간 인원 차이가 1명을 넘지 않습니다.' },
        { q: '결과를 공유할 수 있나요?', a: '편성 결과를 복사해 메신저에 바로 붙여 넣을 수 있습니다.' },
      ],
    },
  },
  {
    href: '/lottery-draw', short: '제비뽑기',
    page: {
      title: '제비뽑기 - 온라인 당첨자 뽑기, 경품 추첨 | 툴허브',
      description: '전체 제비 수와 당첨 제비 수를 정하고 한 장씩 뒤집어 보는 온라인 제비뽑기입니다. 경품 추첨이나 벌칙 대상을 정할 때 쓰세요.',
      keywords: ['제비뽑기', '온라인 제비뽑기', '당첨자 뽑기', '경품 추첨', '랜덤 뽑기', '추첨기'],
      intro: '제비 수와 당첨 수를 정하면 당첨 제비가 무작위로 섞입니다. 한 장씩 뒤집으며 추첨하는 재미를 살릴 수 있습니다.',
      faq: [
        { q: '당첨 제비는 어디에 들어 있나요?', a: '제비를 만들 때마다 당첨 제비의 위치가 무작위로 섞여서 미리 알 수 없습니다.' },
        { q: '참가자 이름을 붙일 수 있나요?', a: '참가자 이름을 한 줄에 한 명씩 입력하면 제비마다 이름이 붙습니다.' },
      ],
    },
  },
  {
    href: '/coin-flip', short: '동전 던지기',
    page: {
      title: '동전 던지기 - 온라인 앞면 뒷면 랜덤 | 툴허브',
      description: '버튼 한 번으로 동전을 던져 앞면과 뒷면을 정하세요. 여러 번 던진 결과 통계도 보여 주는 무료 온라인 동전 던지기입니다.',
      keywords: ['동전 던지기', '동전던지기', '앞면 뒷면', '코인 플립', '랜덤 동전'],
      intro: '둘 중 하나를 빠르게 정할 때 쓰는 동전 던지기입니다. 던질 때마다 앞면과 뒷면 횟수가 누적되어 확률을 직접 확인할 수 있습니다.',
      faq: [
        { q: '앞면과 뒷면이 나올 확률은 같나요?', a: '네, 각각 50%입니다. 던진 횟수가 많아질수록 누적 비율이 50%에 가까워집니다.' },
      ],
    },
  },
  {
    href: '/dice-roller', short: '주사위',
    page: {
      title: '주사위 굴리기 - 온라인 주사위 최대 10개 | 툴허브',
      description: '주사위를 최대 10개까지 한 번에 굴리고 합계를 확인하세요. 보드게임, 술자리 게임에 쓰는 무료 온라인 주사위입니다.',
      keywords: ['주사위', '주사위 굴리기', '온라인 주사위', '랜덤 주사위', '주사위 게임'],
      intro: '굴릴 주사위 개수를 고르고 버튼을 누르면 각 주사위 눈과 합계를 보여 줍니다. 보드게임 주사위를 잃어버렸을 때 바로 쓸 수 있습니다.',
      faq: [
        { q: '각 눈이 나올 확률은 같나요?', a: '네. 6면 주사위라면 1부터 6까지 각각 1/6 확률로 나오고, 면 수를 바꾸면 그 안에서 같은 확률로 나옵니다.' },
      ],
    },
  },
  {
    href: '/random-number', short: '숫자 뽑기',
    page: {
      title: '랜덤 숫자 뽑기 - 범위 지정 난수 생성 | 툴허브',
      description: '최솟값과 최댓값을 정하면 그 사이에서 숫자를 무작위로 뽑습니다. 중복 없이 여러 개 뽑기, 번호표 추첨에 쓰는 무료 도구입니다.',
      keywords: ['랜덤 숫자 뽑기', '숫자 뽑기', '난수 생성', '랜덤 번호', '번호 추첨'],
      intro: '범위와 개수를 정해 숫자를 무작위로 뽑습니다. 중복 없이 뽑기 옵션으로 번호표 추첨이나 좌석 배정에 쓸 수 있습니다.',
      faq: [
        { q: '중복 없이 여러 개를 뽑을 수 있나요?', a: '네, 중복 허용을 끄면 같은 숫자가 다시 나오지 않습니다.' },
      ],
    },
  },
  {
    href: '/yes-no', short: 'Yes or No',
    page: {
      title: 'Yes or No 결정기 - 할까 말까 정해주는 도구 | 툴허브',
      description: '고민되는 질문을 입력하고 버튼을 누르면 Yes 또는 No로 답해 줍니다. 결정이 어려울 때 쓰는 무료 온라인 결정 도구입니다.',
      keywords: ['yes or no', '예스 노', '결정 도구', '할까 말까', '랜덤 결정'],
      intro: '할까 말까 고민될 때 질문을 적고 버튼을 누르세요. 무작위로 Yes 또는 No를 골라 줍니다.',
      faq: [
        { q: 'Yes와 No의 확률은 같나요?', a: '기본은 각각 50%이고, 설정에서 Yes가 나올 확률을 직접 조절할 수 있습니다.' },
      ],
    },
  },
  {
    href: '/rock-paper-scissors', short: '가위바위보',
    page: {
      title: '가위바위보 - 온라인 가위바위보 게임 | 툴허브',
      description: '컴퓨터와 가위바위보를 하고 승률을 기록하세요. 친구와 결정할 일이 있을 때도 쓰는 무료 온라인 가위바위보입니다.',
      keywords: ['가위바위보', '가위바위보 게임', '온라인 가위바위보', '묵찌빠'],
      intro: '가위, 바위, 보 중 하나를 고르면 컴퓨터도 무작위로 냅니다. 승, 무, 패 기록이 쌓여 승률을 볼 수 있습니다.',
      faq: [
        { q: '컴퓨터가 내 선택을 보고 내나요?', a: '아니요. 컴퓨터의 선택은 내가 고르기 전과 무관하게 무작위로 정해집니다.' },
      ],
    },
  },
  {
    href: '/penalty-roulette', short: '벌칙 룰렛',
    page: {
      title: '벌칙 룰렛 - 술자리·모임 벌칙 정하기 | 툴허브',
      description: '벌칙 목록을 룰렛으로 돌려 무작위로 정하세요. 기본 벌칙 모음이 들어 있고 직접 추가할 수도 있는 무료 벌칙 룰렛입니다.',
      keywords: ['벌칙 룰렛', '벌칙 정하기', '술자리 벌칙', '벌칙 게임', '벌칙 모음'],
      intro: '기본으로 들어 있는 벌칙이나 직접 적은 벌칙을 룰렛으로 돌려 하나를 고릅니다. 모임이나 술자리 게임의 마무리로 쓰기 좋습니다.',
      faq: [
        { q: '벌칙을 직접 추가할 수 있나요?', a: '네, 원하는 벌칙을 입력해 목록에 추가하거나 기본 벌칙을 지울 수 있습니다.' },
      ],
    },
  },
  { href: '/menu-picker', short: '오늘 뭐 먹지' },
  { href: '/random-picker', short: '랜덤 뽑기' },
  { href: '/lotto-generator', short: '로또 번호' },
]

export function decisionMetadata(href: string): Metadata {
  const p = decisionTools.find(d => d.href === href)!.page!
  const url = `https://toolhub.ai.kr${href}/`
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    openGraph: {
      title: p.title, description: p.description, url, siteName: '툴허브', locale: 'ko_KR', type: 'website',
      images: [{ url: `https://toolhub.ai.kr/og${href}.png`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: p.title, description: p.description, images: [`https://toolhub.ai.kr/og${href}.png`] },
    alternates: { canonical: url },
  }
}
