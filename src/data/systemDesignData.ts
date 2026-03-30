export type DesignDifficulty = 'intermediate' | 'advanced' | 'expert'
export type DesignCategory = 'web' | 'data' | 'messaging' | 'storage' | 'infrastructure'

export interface DesignComponent {
  name: string
  description: string
}

export interface DesignStep {
  title: string
  content: string
}

export interface SystemDesignQuestion {
  id: string
  title: string
  titleEn: string
  category: DesignCategory
  difficulty: DesignDifficulty
  description: string
  requirements: {
    functional: string[]
    nonFunctional: string[]
  }
  estimations: {
    title: string
    items: string[]
  }
  architecture: {
    overview: string
    components: DesignComponent[]
    dataFlow: string[]
  }
  deepDive: DesignStep[]
  scalability: string[]
  tradeoffs: string[]
  interviewTips: string[]
  relatedTermIds?: string[]
  diagramAscii?: string
}

export const DESIGN_CATEGORIES: Record<DesignCategory, { nameKo: string; nameEn: string; icon: string }> = {
  web: { nameKo: '웹 서비스', nameEn: 'Web Services', icon: '🌐' },
  data: { nameKo: '데이터 처리', nameEn: 'Data Processing', icon: '📊' },
  messaging: { nameKo: '메시징/실시간', nameEn: 'Messaging/Real-time', icon: '💬' },
  storage: { nameKo: '저장/검색', nameEn: 'Storage/Search', icon: '🗄️' },
  infrastructure: { nameKo: '인프라', nameEn: 'Infrastructure', icon: '🏗️' },
}

export const SYSTEM_DESIGN_QUESTIONS: SystemDesignQuestion[] = [
  // ──────────────────────────────────────────────────────────────
  // 1. URL 단축기
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-url-shortener',
    title: 'URL 단축기 설계',
    titleEn: 'URL Shortener',
    category: 'web',
    difficulty: 'intermediate',
    description: 'TinyURL이나 Bitly처럼 긴 URL을 짧은 URL로 변환하고, 짧은 URL 접속 시 원래 URL로 리다이렉트하는 서비스를 설계하세요. 읽기 트래픽이 쓰기보다 압도적으로 많은 읽기 중심 시스템입니다.',
    requirements: {
      functional: [
        '긴 URL을 입력받아 짧은 URL(7자리)을 생성한다',
        '짧은 URL 접속 시 원래 URL로 301/302 리다이렉트한다',
        '같은 URL에 대해 동일한 짧은 URL을 반환한다 (선택적)',
        '사용자 지정 단축 URL을 허용한다 (custom alias)',
        '단축 URL에 만료 기간을 설정할 수 있다',
      ],
      nonFunctional: [
        '리다이렉트 지연시간 100ms 이하 (p99)',
        '99.99% 가용성 보장',
        '생성된 단축 URL은 예측 불가능해야 한다',
        '읽기:쓰기 비율 100:1을 감당할 수 있어야 한다',
        '하루 1억 건 리다이렉트 처리 가능',
      ],
    },
    estimations: {
      title: 'URL 단축기 용량 추정',
      items: [
        'DAU 1,000만 명, 사용자당 하루 평균 0.1건 생성 → 일일 100만 건 쓰기',
        '읽기:쓰기 = 100:1 → 일일 1억 건 읽기 → 약 1,160 QPS (피크 2,300 QPS)',
        '레코드당 평균 500 bytes (원본URL 256 + 단축키 7 + 메타데이터) → 연간 약 180GB',
        '5년 운영 시 약 900GB 저장소 필요 → 18억 레코드',
        'Base62(a-z, A-Z, 0-9) 7자리 → 62^7 ≈ 3.5조 개 조합, 충분한 키 공간',
      ],
    },
    architecture: {
      overview: '클라이언트 요청을 로드밸런서가 분배하고, API 서버에서 단축 URL 생성/조회를 처리한다. 캐시 레이어(Redis)로 읽기 성능을 극대화하고, NoSQL DB(DynamoDB)에 URL 매핑을 저장한다. 키 생성 서비스(KGS)가 고유 키를 사전 생성하여 충돌을 방지한다.',
      components: [
        { name: 'Load Balancer', description: 'L7 로드밸런서로 API 서버에 트래픽 분배, 헬스체크 및 자동 페일오버' },
        { name: 'API Server', description: 'URL 생성(POST)과 리다이렉트(GET) 엔드포인트 제공, 무상태(stateless) 설계' },
        { name: 'Key Generation Service (KGS)', description: 'Base62 키를 사전 생성하여 키 풀에 저장, API 서버가 요청 시 미사용 키 할당' },
        { name: 'Cache (Redis)', description: '자주 접근되는 URL 매핑을 캐싱, LRU 정책으로 메모리 효율화, 80% 캐시 적중률 목표' },
        { name: 'Database (NoSQL)', description: 'URL 매핑(short_key → long_url, 생성일, 만료일) 저장, 파티셔닝으로 수평 확장' },
        { name: 'Analytics Service', description: '클릭 수, 접속 지역, User-Agent 등 통계 데이터를 비동기로 수집·집계' },
      ],
      dataFlow: [
        '1. 사용자가 긴 URL을 POST /api/shorten으로 전송',
        '2. API 서버가 KGS에서 미사용 Base62 키를 할당받아 DB에 매핑 저장',
        '3. 생성된 짧은 URL을 사용자에게 반환 (예: https://short.ly/aB3x7Kp)',
        '4. 짧은 URL 접속 시 캐시에서 먼저 조회, 미스 시 DB 조회 후 캐시에 적재',
        '5. 원래 URL로 301(영구) 또는 302(임시) 리다이렉트, Analytics에 클릭 이벤트 비동기 전송',
      ],
    },
    deepDive: [
      {
        title: 'Base62 인코딩 vs 해시 기반 키 생성',
        content: 'Base62는 auto-increment ID를 62진수로 변환하는 방식으로 충돌이 없지만 순차적이라 예측 가능하다. MD5/SHA-256 해시의 앞 7자리를 사용하면 충돌 가능성이 있어 재시도 로직이 필요하다. KGS 방식은 키를 사전 생성하여 두 문제를 모두 해결한다. KGS는 두 테이블(미사용/사용됨)을 관리하며, 서버 재시작 시 할당된 키를 복구하는 로직이 필요하다.',
      },
      {
        title: '301 vs 302 리다이렉트 트레이드오프',
        content: '301(영구 이동)은 브라우저가 캐싱하여 서버 부하를 줄이지만 클릭 통계를 수집할 수 없다. 302(임시 이동)는 매번 서버를 거치므로 정확한 통계 수집이 가능하지만 서버 부하가 높다. 비즈니스 요구사항에 따라 선택하되, 대부분의 URL 단축 서비스는 통계가 중요하므로 302를 사용하고 캐시 레이어로 성능을 보완한다.',
      },
      {
        title: '캐시 전략 및 핫 URL 처리',
        content: '파레토 법칙에 따라 20%의 URL이 80%의 트래픽을 차지한다. Redis에 LRU 정책으로 상위 20% URL을 캐싱하면 캐시 적중률 80%를 달성할 수 있다. 일일 1억 읽기 × 500 bytes × 20% = 약 10GB 캐시 메모리면 충분하다. 캐시 워밍업, 캐시 스탬피드(thundering herd) 방지를 위한 뮤텍스 패턴도 고려해야 한다.',
      },
      {
        title: 'URL 만료 및 정리 전략',
        content: '만료된 URL은 lazy deletion(접근 시 체크 후 삭제)과 active deletion(크론 작업으로 주기적 스캔) 두 가지 방식을 병행한다. TTL 인덱스를 활용하면 DB 레벨에서 자동 삭제가 가능하다. 삭제된 키는 KGS 풀에 반환하여 재활용한다. 만료 URL 접근 시 404 또는 커스텀 만료 페이지로 안내한다.',
      },
    ],
    scalability: [
      '읽기 전용 레플리카를 추가하여 읽기 QPS를 수평 확장',
      'DB를 단축 키의 첫 글자 기준으로 범위 파티셔닝(range partitioning) 적용',
      'CDN 엣지에서 301 리다이렉트를 캐싱하여 오리진 서버 부하 감소',
      'KGS를 다중 인스턴스로 운영하고, 각 인스턴스에 키 범위를 미리 할당',
      'Analytics 데이터를 Kafka로 비동기 처리하여 메인 경로 지연시간에 영향 없도록 분리',
      'Rate Limiter를 API 게이트웨이에 배치하여 악성 대량 생성 요청 차단',
    ],
    tradeoffs: [
      '301 리다이렉트(성능 우선) vs 302 리다이렉트(통계 수집 우선) — 비즈니스 가치에 따라 결정',
      '사전 키 생성(KGS, 복잡하지만 충돌 없음) vs 실시간 해시 생성(단순하지만 충돌 가능)',
      'NoSQL(확장성, 단순 조회에 유리) vs RDB(ACID, 중복 방지에 유리)',
      '같은 URL에 같은 단축키 반환(저장 효율) vs 매번 새 키 생성(사용자별 통계 분리)',
    ],
    interviewTips: [
      '읽기:쓰기 비율(100:1)을 먼저 언급하고, 읽기 최적화 중심으로 설계하라',
      'Base62 키 공간(62^7 = 3.5조)이 충분함을 수학적으로 보여줘라',
      'KGS의 단일 장애점(SPOF) 문제와 해결책(다중 인스턴스, 키 범위 분할)을 준비하라',
      '면접관이 "같은 URL에 같은 키를 반환하려면?"이라고 물으면 bloom filter나 별도 조회 테이블을 제안하라',
    ],
    relatedTermIds: ['net-dns', 'net-http', 'db-nosql', 'arch-cache', 'arch-load-balancer'],
    diagramAscii: `
┌─────────┐     ┌──────────────┐     ┌─────────────┐
│  Client  │────▶│ Load Balancer │────▶│  API Server  │
└─────────┘     └──────────────┘     └──────┬──────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          ▼                 ▼                 ▼
                   ┌────────────┐   ┌────────────┐   ┌──────────────┐
                   │  Cache      │   │  Database   │   │     KGS      │
                   │  (Redis)    │   │  (NoSQL)    │   │ (Key Gen Svc)│
                   └────────────┘   └────────────┘   └──────────────┘
                                            │
                                            ▼
                                   ┌──────────────┐
                                   │  Analytics   │
                                   │  (Kafka+S3)  │
                                   └──────────────┘`,
  },

  // ──────────────────────────────────────────────────────────────
  // 2. 실시간 채팅 시스템
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-chat-system',
    title: '실시간 채팅 시스템 설계',
    titleEn: 'Real-time Chat System',
    category: 'messaging',
    difficulty: 'advanced',
    description: '카카오톡이나 슬랙처럼 1:1 및 그룹 채팅을 지원하는 실시간 메시징 시스템을 설계하세요. 메시지 전달 보장, 읽음 표시, 오프라인 사용자 처리, 대규모 그룹채팅 등 다양한 실시간 통신 문제를 다룹니다.',
    requirements: {
      functional: [
        '1:1 채팅 메시지를 실시간으로 전송·수신한다',
        '최대 500명 규모의 그룹 채팅을 지원한다',
        '메시지 읽음 표시(단톡방: N명 읽음)를 실시간 업데이트한다',
        '오프라인 사용자에게 메시지를 저장하고 접속 시 동기화한다',
        '접속 상태(온라인/오프라인/자리비움)를 표시한다',
      ],
      nonFunctional: [
        '메시지 전달 지연시간 200ms 이하 (p95)',
        '메시지 순서 보장 (같은 채팅방 내)',
        '메시지 유실 없음 — at-least-once 전달 보장',
        '동시접속 500만 사용자 처리',
        'DAU 5,000만 기준 설계',
      ],
    },
    estimations: {
      title: '채팅 시스템 용량 추정',
      items: [
        'DAU 5,000만 명, 사용자당 하루 평균 40개 메시지 → 일일 20억 메시지',
        '피크 시간 QPS: 20억 / 86,400 × 3(피크 배율) ≈ 69,000 메시지/초',
        '메시지당 평균 100 bytes → 일일 200GB, 연간 73TB 저장소',
        '동시접속 500만 × WebSocket 연결당 10KB 메모리 ≈ 50GB 메모리',
        '그룹채팅 팬아웃: 평균 50명 그룹 × 메시지당 50 알림 → 읽기 증폭 50배',
      ],
    },
    architecture: {
      overview: '클라이언트와 Chat Server 간 WebSocket으로 양방향 실시간 통신을 유지한다. 메시지는 Message Queue(Kafka)를 통해 비동기 처리되며, 채팅방 메시지 저장소(Cassandra)에 시간순으로 기록된다. Presence Service가 사용자 접속 상태를 관리하고, Push Service가 오프라인 사용자에게 푸시 알림을 전송한다.',
      components: [
        { name: 'WebSocket Gateway', description: '클라이언트의 WebSocket 연결을 관리하고 Chat Server와 중계, 커넥션 라우팅 테이블 유지' },
        { name: 'Chat Service', description: '메시지 전송/수신 로직 처리, 메시지 ID 생성(Snowflake), 채팅방 멤버 관리' },
        { name: 'Message Queue (Kafka)', description: '메시지를 토픽별(채팅방 ID)로 파티셔닝하여 순서 보장, 소비자 그룹으로 병렬 처리' },
        { name: 'Message Store (Cassandra)', description: '채팅방 ID를 파티션 키, 메시지 ID를 클러스터링 키로 사용하여 시간순 저장' },
        { name: 'Presence Service', description: 'Redis에 사용자별 heartbeat 저장, TTL 5초로 온라인/오프라인 판단' },
        { name: 'Push Service', description: 'FCM/APNs를 통해 오프라인 사용자에게 푸시 알림 발송' },
        { name: 'Sync Service', description: '오프라인 사용자 재접속 시 마지막 읽은 메시지 이후 누적 메시지를 일괄 동기화' },
      ],
      dataFlow: [
        '1. 사용자 A가 WebSocket을 통해 메시지를 Chat Service에 전송',
        '2. Chat Service가 메시지 ID(Snowflake)를 생성하고 Kafka에 발행',
        '3. Kafka 컨슈머가 메시지를 Cassandra에 저장하고 수신자 목록을 조회',
        '4. 온라인 수신자에게 WebSocket으로 실시간 전달, 오프라인 수신자에게 Push 발송',
        '5. 수신자가 메시지를 읽으면 read receipt를 Chat Service에 보내고, 발신자에게 전파',
      ],
    },
    deepDive: [
      {
        title: 'WebSocket 연결 관리와 확장',
        content: '단일 서버가 유지할 수 있는 WebSocket 연결은 약 50만 개(메모리/파일디스크립터 한계)다. 500만 동시접속을 위해 최소 10대의 WebSocket Gateway가 필요하다. 사용자-서버 매핑을 Redis에 저장하여 특정 사용자에게 메시지를 전달할 Gateway를 찾는다. 연결 끊김 시 자동 재연결과 지수 백오프(exponential backoff)를 구현하며, 재연결 시 누락 메시지를 Sync Service로 보충한다.',
      },
      {
        title: '메시지 순서 보장 전략',
        content: '분산 환경에서 절대적 전역 순서는 비현실적이므로, 채팅방 단위의 부분 순서(causal ordering)를 보장한다. Snowflake ID(타임스탬프 41bit + 머신ID 10bit + 시퀀스 12bit)로 단조증가하는 메시지 ID를 생성한다. Kafka 파티션을 채팅방 ID로 설정하면 같은 방의 메시지가 동일 파티션에서 순서대로 처리된다. 클라이언트는 서버 타임스탬프가 아닌 메시지 ID 기준으로 정렬한다.',
      },
      {
        title: '그룹채팅 팬아웃 최적화',
        content: '500명 그룹에서 메시지 1건 → 500명에게 전달해야 한다. 소규모 그룹(≤50명)은 write-time fanout으로 각 멤버의 인박스에 즉시 기록한다. 대규모 그룹(>50명)은 read-time fanout으로 멤버가 접속할 때 채팅방에서 새 메시지를 가져간다. 하이브리드 방식으로 온라인 멤버에게만 즉시 push하고, 오프라인 멤버는 접속 시 pull 하도록 구현하면 쓰기 증폭을 줄일 수 있다.',
      },
      {
        title: '읽음 표시(Read Receipt) 설계',
        content: '1:1 채팅은 수신자의 마지막 읽은 메시지 ID를 저장하면 된다. 그룹채팅은 (방ID, 사용자ID) → 마지막 읽은 메시지 ID 매핑을 관리한다. "N명 읽음" 표시는 특정 메시지 ID보다 큰 last_read를 가진 멤버 수를 카운트한다. 대규모 그룹에서는 정확한 카운트 대신 "읽음/안읽음" 이진 표시로 단순화하거나, 카운트를 주기적으로 배치 업데이트한다.',
      },
      {
        title: '오프라인 메시지 동기화',
        content: '사용자별 last_synced_message_id를 저장한다. 재접속 시 이 ID 이후의 메시지를 채팅방별로 일괄 조회한다. 대량의 미읽 메시지(예: 일주일 부재)는 페이지네이션으로 최근 메시지부터 로드하고, 위로 스크롤 시 추가 로드한다. 동기화 중 새 메시지가 도착하면 실시간 스트림과 병합하여 중복을 제거한다.',
      },
    ],
    scalability: [
      'WebSocket Gateway를 수평 확장하고 사용자-서버 매핑을 Redis에 관리',
      'Kafka 파티션 수를 늘려 메시지 처리량 수평 확장 (채팅방 ID 기반 파티셔닝)',
      'Cassandra 노드를 추가하여 저장 용량과 읽기/쓰기 처리량 확장',
      '핫 채팅방(대규모 그룹)의 메시지를 별도 캐시 레이어로 분리',
      'Presence 하트비트를 Redis Cluster로 분산하여 단일 노드 병목 제거',
      '지역별 데이터센터 배치로 글로벌 지연시간 최소화 (메시지는 결과적 일관성)',
    ],
    tradeoffs: [
      'WebSocket(양방향 실시간) vs Long Polling(구현 단순, 지연 있음) — 실시간성이 핵심이므로 WebSocket 선택',
      'Write-time fanout(즉시 전달, 쓰기 비용 높음) vs Read-time fanout(읽기 비용, 지연 가능) — 그룹 규모에 따라 하이브리드',
      'At-least-once(중복 가능, 유실 없음) vs At-most-once(유실 가능, 중복 없음) — 채팅은 유실이 치명적이므로 at-least-once + 클라이언트 중복 제거',
      'Cassandra(쓰기 최적화, 순서 보장) vs MongoDB(유연한 스키마) — 시간순 메시지 저장에 Cassandra가 적합',
    ],
    interviewTips: [
      'WebSocket의 한계(연결 수, 상태 관리)를 먼저 언급하고 확장 전략을 제시하라',
      '1:1과 그룹채팅의 아키텍처 차이점을 명확히 구분하여 설명하라',
      '메시지 순서 보장 방법(Snowflake ID + Kafka 파티셔닝)을 구체적으로 설명하라',
      '"사용자가 동시에 여러 기기에서 접속하면?"이라는 질문에 대비하여 멀티 디바이스 동기화 전략을 준비하라',
    ],
    relatedTermIds: ['net-websocket', 'net-tcp', 'arch-message-queue', 'db-nosql', 'arch-load-balancer'],
    diagramAscii: `
┌──────────┐  WebSocket  ┌─────────────────┐
│ Client A │◀───────────▶│   WS Gateway    │
└──────────┘             │  (연결 관리)     │
                         └────────┬────────┘
┌──────────┐  WebSocket          │
│ Client B │◀───────────▶────────┤
└──────────┘                     ▼
                         ┌──────────────┐      ┌───────────────┐
                         │ Chat Service │─────▶│ Kafka (MQ)    │
                         └──────┬───────┘      └───────┬───────┘
                                │                      │
                    ┌───────────┼──────────┐           ▼
                    ▼           ▼          ▼    ┌──────────────┐
             ┌──────────┐ ┌─────────┐ ┌──────┐│ Message Store│
             │ Presence │ │  Push   │ │ Sync ││ (Cassandra)  │
             │ (Redis)  │ │ Service │ │ Svc  │└──────────────┘
             └──────────┘ └─────────┘ └──────┘`,
  },

  // ──────────────────────────────────────────────────────────────
  // 3. 뉴스피드
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-news-feed',
    title: '뉴스피드 시스템 설계',
    titleEn: 'News Feed System',
    category: 'web',
    difficulty: 'advanced',
    description: '인스타그램이나 트위터처럼 사용자가 팔로우하는 사람들의 게시물을 시간순 또는 관련성 기반으로 정렬하여 보여주는 뉴스피드 시스템을 설계하세요. 셀러브리티 팔로워 문제와 실시간 업데이트가 핵심 도전 과제입니다.',
    requirements: {
      functional: [
        '사용자가 텍스트/이미지/동영상 포함 게시물을 작성한다',
        '팔로우한 사람들의 게시물을 뉴스피드에 시간순/관련성순으로 표시한다',
        '게시물에 좋아요, 댓글을 달 수 있다',
        '새 게시물이 올라오면 피드를 실시간 업데이트한다',
        '무한 스크롤로 과거 게시물을 로드한다',
      ],
      nonFunctional: [
        '피드 로딩 500ms 이내 (p95)',
        'DAU 3억 명 규모 처리',
        '새 게시물이 팔로워 피드에 5초 이내 반영',
        '99.99% 가용성',
        '미디어(이미지/동영상) 포함 게시물 지원',
      ],
    },
    estimations: {
      title: '뉴스피드 용량 추정',
      items: [
        'DAU 3억 명, 사용자당 평균 10회 피드 조회 → 일일 30억 읽기',
        '일일 신규 게시물 약 6,000만 건 (DAU의 20%가 하루 1건 작성)',
        '평균 팔로워 200명 → fan-out 총 120억 건/일 (쓰기 시 팬아웃)',
        '게시물 메타데이터 1KB × 6,000만 = 60GB/일, 미디어 별도 저장',
        '피드 캐시: 사용자당 상위 200개 게시물 ID(1.6KB) × 3억 = 약 480GB Redis 메모리',
      ],
    },
    architecture: {
      overview: '게시물 작성 시 Post Service가 저장하고, Fanout Service가 팔로워들의 피드 캐시에 게시물 ID를 배포한다. 피드 조회 시 Feed Service가 캐시에서 게시물 ID 목록을 가져오고, Post Service에서 실제 내용을 hydrate한다. 셀러브리티(팔로워 100만+) 게시물은 read-time fanout으로 전환하여 쓰기 폭주를 방지한다.',
      components: [
        { name: 'Post Service', description: '게시물 CRUD 및 미디어 업로드 처리, 게시물 DB(MySQL) 및 미디어 스토리지(S3) 관리' },
        { name: 'Fanout Service', description: '게시물 발행 시 팔로워 목록 조회 후 각 팔로워 피드 캐시에 게시물 ID 추가 (비동기, Kafka 기반)' },
        { name: 'Feed Service', description: '사용자 피드 요청 시 캐시에서 게시물 ID 목록 조회 + 셀러브리티 게시물 병합 + 랭킹 적용' },
        { name: 'Feed Cache (Redis)', description: '사용자별 피드(게시물 ID 목록)를 sorted set으로 저장, 최신 200개만 유지' },
        { name: 'Social Graph Service', description: '팔로우/팔로워 관계 관리, 셀러브리티 여부 판단 (팔로워 100만+ 기준)' },
        { name: 'Ranking Service', description: '친밀도, 게시물 인기도, 컨텐츠 유형 등으로 피드 내 게시물 순위 조정' },
        { name: 'Media CDN', description: 'S3에 저장된 이미지/동영상을 글로벌 CDN으로 배포' },
      ],
      dataFlow: [
        '1. 사용자가 게시물 작성 → Post Service가 DB에 저장하고 Fanout Service에 이벤트 발행',
        '2. Fanout Service가 Social Graph에서 팔로워 목록을 조회',
        '3. 일반 사용자: 각 팔로워의 Feed Cache에 게시물 ID push (write-time fanout)',
        '4. 셀러브리티: 팬아웃 스킵, 피드 조회 시점에 병합 (read-time fanout)',
        '5. 피드 요청 시 Feed Cache에서 ID 목록 + 셀러브리티 게시물 merge → Ranking → hydrate 후 반환',
      ],
    },
    deepDive: [
      {
        title: 'Fan-out on Write vs Fan-out on Read',
        content: 'Write fanout은 게시물 작성 시 모든 팔로워 캐시에 즉시 배포한다. 피드 읽기가 빠르지만 팔로워가 많은 사용자(셀러브리티)의 게시물은 수백만 건의 쓰기를 유발한다. Read fanout은 피드 조회 시 팔로우하는 사람들의 최신 게시물을 동적으로 가져온다. 쓰기 비용은 없지만 읽기 지연이 크다. 하이브리드 방식이 최적이다: 일반 사용자는 write fanout, 셀러브리티(팔로워 10만+)는 read fanout으로 조회 시 병합한다.',
      },
      {
        title: '피드 랭킹 알고리즘',
        content: '시간순(역시간순) 정렬은 가장 단순하지만 사용자 참여도가 낮다. ML 기반 랭킹은 사용자-게시물 쌍의 참여 확률을 예측한다. 특성(feature)으로는 게시물 나이, 작성자와의 상호작용 빈도, 게시물 유형(사진>텍스트), 초기 참여도(좋아요·댓글 수/시간) 등을 사용한다. 2단계 파이프라인(후보 생성 → 랭킹 모델 스코어링)으로 구성하며, A/B 테스트로 지속적으로 개선한다.',
      },
      {
        title: '셀러브리티(핫 키) 문제 해결',
        content: '팔로워 1,000만 명의 셀러브리티가 게시물을 작성하면 1,000만 번의 캐시 쓰기가 발생한다. 이를 방지하기 위해 팔로워 수 임계값(예: 10만 명)을 기준으로 셀러브리티를 분류한다. 셀러브리티 게시물은 별도 "핫 캐시"에 저장하고, 피드 조회 시 사용자의 피드 캐시 + 팔로우 중인 셀러브리티의 핫 캐시를 병합(merge-sort)한다. 이 방식으로 쓰기 증폭을 수백만 배에서 수천 배로 줄인다.',
      },
      {
        title: '캐시 일관성과 무효화',
        content: '게시물 삭제 시 모든 팔로워의 피드 캐시에서 해당 ID를 제거해야 한다. 대규모 팬아웃 무효화는 비용이 크므로 lazy invalidation을 사용한다: 캐시에서 ID를 가져올 때 Post Service에서 실제 존재 여부를 확인하고, 삭제된 게시물이면 필터링한다. 게시물 수정은 캐시 무효화 없이 hydrate 단계에서 최신 버전을 가져오면 된다.',
      },
    ],
    scalability: [
      'Fanout Service를 Kafka 컨슈머 그룹으로 수평 확장하여 팬아웃 병렬 처리',
      'Feed Cache를 consistent hashing으로 사용자 ID 기반 파티셔닝',
      'Post DB를 사용자 ID 기준 수평 샤딩',
      'CDN을 활용한 미디어 전달로 오리진 서버 부하 감소',
      '랭킹 모델을 별도 ML Serving 인프라로 분리',
      '피드 프리페칭: 사용자 접속 패턴을 학습하여 미리 피드를 준비',
    ],
    tradeoffs: [
      'Write fanout(읽기 빠름, 쓰기 비용 높음) vs Read fanout(쓰기 없음, 읽기 느림) — 하이브리드가 최적',
      '시간순 정렬(단순, 공정) vs ML 랭킹(참여도 높음, 복잡도/편향 우려)',
      '피드 캐시 크기(최근 200개 vs 1,000개) — 메모리 비용 vs 캐시 미스 비율',
      '실시간 피드 업데이트(사용자 경험 좋음) vs 폴링 방식(구현 단순) — WebSocket/SSE로 실시간 구현',
    ],
    interviewTips: [
      'Fan-out on Write vs Read의 트레이드오프를 먼저 분석하고 하이브리드 방식을 제안하라',
      '셀러브리티 문제를 명시적으로 언급하고 해결 전략을 보여줘라',
      '피드 캐시 데이터 구조(Redis sorted set)와 용량 계산을 구체적으로 제시하라',
      '"피드에 광고를 삽입하려면?"이라는 후속 질문에 대비하여 Ad Insertion Service 설계를 준비하라',
    ],
    relatedTermIds: ['arch-cache', 'arch-message-queue', 'arch-cdn', 'db-sharding', 'arch-load-balancer'],
    diagramAscii: `
┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  Client  │───▶│  API Gateway │───▶│ Post Service │──▶ Post DB
└──────────┘    └──────┬───────┘    └──────┬───────┘
                       │                   │ event
                       │            ┌──────▼────────┐
                       │            │Fanout Service  │──▶ Social Graph
                       │            └──────┬────────┘
                       │                   │ push IDs
                       ▼            ┌──────▼────────┐
               ┌──────────────┐     │  Feed Cache   │
               │ Feed Service │◀───▶│  (Redis)      │
               │ (hydrate +   │     └───────────────┘
               │  ranking)    │     ┌───────────────┐
               └──────────────┘     │ Celebrity     │
                       │            │ Hot Cache     │
                       ▼            └───────────────┘
                ┌────────────┐
                │ Media CDN  │
                └────────────┘`,
  },

  // ──────────────────────────────────────────────────────────────
  // 4. 파일 저장소
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-file-storage',
    title: '클라우드 파일 저장소 설계',
    titleEn: 'Cloud File Storage',
    category: 'storage',
    difficulty: 'advanced',
    description: 'Google Drive나 Dropbox처럼 파일을 클라우드에 저장하고, 여러 기기 간 동기화하며, 다른 사용자와 공유할 수 있는 파일 저장 시스템을 설계하세요. 대용량 파일 업로드, 중복 제거, 동기화 충돌 해결이 핵심입니다.',
    requirements: {
      functional: [
        '파일을 업로드, 다운로드, 삭제할 수 있다',
        '여러 기기 간 파일을 자동 동기화한다',
        '파일/폴더를 다른 사용자와 공유할 수 있다 (읽기/쓰기 권한)',
        '파일 수정 이력(버전 관리)을 유지하고 이전 버전으로 복원할 수 있다',
        '오프라인에서 수정한 파일을 온라인 복구 시 자동 동기화한다',
      ],
      nonFunctional: [
        '최대 10GB 단일 파일 업로드 지원',
        '업로드 중단 시 이어받기(resume) 가능',
        '데이터 무손실 보장 (11 nines durability)',
        '파일 동기화 지연 5초 이내',
        'DAU 5,000만 명, 사용자당 평균 저장 2GB',
      ],
    },
    estimations: {
      title: '파일 저장소 용량 추정',
      items: [
        'DAU 5,000만 명 × 평균 2GB 저장 = 총 100PB 저장소',
        '사용자당 하루 평균 2회 동기화 → 일일 1억 동기화 이벤트',
        '평균 파일 크기 500KB, 일일 신규 파일 2억 개 → 100TB/일 순수 업로드',
        '중복 제거 시 실제 저장 40% 절감 → 60TB/일 실 저장',
        '피크 업로드 대역폭: 100TB / 86,400 × 3 ≈ 3.5GB/초',
      ],
    },
    architecture: {
      overview: '클라이언트의 파일 변경을 감지하여 Block Server에서 파일을 4MB 청크로 분할한 뒤, 각 청크를 해시(SHA-256)하여 중복 여부를 확인하고 Object Storage(S3)에 저장한다. Metadata Service가 파일 메타데이터와 블록 매핑을 관리하고, Sync Service가 변경 사항을 다른 기기에 전파한다.',
      components: [
        { name: 'Client Agent', description: '로컬 파일 시스템 변경 감지(inotify/FSEvents), 청크 분할, 해시 계산, 로컬 캐시 관리' },
        { name: 'Block Server', description: '파일을 4MB 블록으로 분할/결합, 블록 해시 기반 중복 제거(deduplication), 델타 동기화 처리' },
        { name: 'Object Storage (S3)', description: '실제 파일 블록을 저장, 11 nines durability, 다중 AZ 복제' },
        { name: 'Metadata Service', description: '파일/폴더 계층, 블록 매핑, 버전 정보, 공유 권한을 MySQL에 저장' },
        { name: 'Sync Service', description: '파일 변경 이벤트를 감지하여 같은 계정의 다른 기기에 실시간 통지 (WebSocket/Long Polling)' },
        { name: 'Notification Service', description: '파일 변경 시 공유 대상 사용자에게 알림 발송' },
      ],
      dataFlow: [
        '1. Client Agent가 로컬 파일 변경을 감지하고 변경된 블록만 해시 계산',
        '2. Block Server에 블록 해시를 전송하여 이미 존재하는 블록은 업로드 스킵 (중복 제거)',
        '3. 새로운 블록만 Object Storage에 업로드, Metadata Service에 블록 매핑 업데이트',
        '4. Sync Service가 변경 이벤트를 같은 계정의 다른 기기에 push',
        '5. 다른 기기의 Client Agent가 변경된 블록만 다운로드하여 로컬 파일 재구성',
      ],
    },
    deepDive: [
      {
        title: '청크 분할과 중복 제거(Deduplication)',
        content: '파일을 고정 크기(4MB) 블록으로 분할하고 각 블록의 SHA-256 해시를 계산한다. 같은 해시의 블록은 한 번만 저장하여 저장 공간을 40-60% 절감한다. Content-defined chunking(Rabin fingerprint)을 사용하면 파일 중간에 삽입이 있어도 영향받지 않는 블록이 동일 해시를 유지하여 중복 제거 효율이 높아진다. 블록 해시를 bloom filter로 빠르게 존재 여부를 확인하고, 충돌 시 전체 해시를 비교한다.',
      },
      {
        title: '동기화 충돌 해결 전략',
        content: '두 기기에서 같은 파일을 동시에 수정하면 충돌이 발생한다. 마지막 쓰기 승리(Last Writer Wins) 방식은 간단하지만 데이터 유실 위험이 있다. Dropbox 방식은 충돌 감지 시 두 버전을 모두 보존하고 사용자가 수동 병합하도록 한다. Operational Transform(OT)이나 CRDT를 사용하면 자동 병합이 가능하지만 텍스트 파일에만 적용 가능하다. 대부분의 클라우드 스토리지는 충돌 보존 + 사용자 선택 방식을 채택한다.',
      },
      {
        title: '이어받기(Resumable Upload) 구현',
        content: '10GB 파일 업로드 중 네트워크 끊김 시 처음부터 재업로드하면 비효율적이다. 청크 업로드 방식으로 각 4MB 블록을 독립적으로 업로드하고, 서버에서 수신 완료된 블록 목록을 관리한다. 클라이언트는 재연결 시 미완료 블록만 전송한다. GCS의 Resumable Upload API처럼 업로드 세션 URI를 발급하고, 각 청크의 byte range를 관리한다.',
      },
      {
        title: '버전 관리와 저장 효율',
        content: '모든 파일 수정마다 전체 복사본을 저장하면 저장 비용이 폭증한다. 델타 인코딩(rsync 알고리즘)으로 이전 버전과의 차이분(diff)만 저장한다. 4MB 블록 중 변경된 블록만 새로 저장하고, 변경되지 않은 블록은 기존 블록을 참조한다. 오래된 버전은 단계적으로 cold storage(Glacier)로 이동하거나, 정책에 따라 N개 버전만 유지하고 나머지를 삭제한다.',
      },
    ],
    scalability: [
      'Object Storage(S3)는 무한 확장 가능 — 저장 용량 병목 없음',
      'Metadata DB를 사용자 ID 기준 수평 샤딩하여 메타데이터 처리량 확장',
      'Block Server를 수평 확장하여 업로드/다운로드 처리량 증가',
      '지역별 CDN을 통한 다운로드 가속',
      'Hot 파일(자주 접근)은 SSD 캐시, Cold 파일은 HDD/Glacier로 계층화',
      '중복 제거율이 높을수록 저장 비용이 서브리니어하게 증가',
    ],
    tradeoffs: [
      '고정 크기 청크(구현 단순) vs 가변 크기 청크(Rabin fingerprint, 중복 제거 효율 높음)',
      'Strong consistency(동기화 즉시 반영) vs Eventual consistency(성능 우선, 일시적 불일치 허용)',
      '서버 측 충돌 자동 병합(편리하지만 복잡) vs 충돌 보존 + 사용자 선택(안전하지만 번거로움)',
      '모든 버전 보관(데이터 안전) vs N개 버전 제한(비용 절감) — 유료/무료 플랜 차등 적용',
    ],
    interviewTips: [
      '파일을 블록 단위로 분할하는 이유(중복 제거, 이어받기, 델타 동기화)를 먼저 설명하라',
      'Metadata와 실제 파일 저장을 분리하는 아키텍처를 명확히 제시하라',
      '동기화 충돌 시나리오를 구체적으로 설명하고 해결 전략의 트레이드오프를 분석하라',
      '"사용자가 10GB 파일을 모바일에서 업로드하면?" — 네트워크 불안정 대응(이어받기, 백그라운드 업로드)을 설명하라',
    ],
    relatedTermIds: ['arch-distributed-storage', 'db-sharding', 'net-http', 'arch-cdn'],
    diagramAscii: `
┌──────────────┐         ┌──────────────┐
│ Client Agent │────────▶│ Block Server │
│ (파일 감시,   │         │ (청크 분할,   │
│  청크 해시)   │         │  중복 제거)   │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ sync                   ▼
┌──────▼───────┐        ┌──────────────┐
│ Sync Service │        │Object Storage│
│ (변경 전파)   │        │   (S3)       │
└──────┬───────┘        └──────────────┘
       │
       ▼
┌──────────────┐        ┌──────────────┐
│  Metadata    │        │ Notification │
│  Service     │        │   Service    │
│  (MySQL)     │        └──────────────┘
└──────────────┘`,
  },

  // ──────────────────────────────────────────────────────────────
  // 5. 알림 시스템
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-notification-system',
    title: '알림 시스템 설계',
    titleEn: 'Notification System',
    category: 'messaging',
    difficulty: 'intermediate',
    description: '푸시 알림, 이메일, SMS를 통합 관리하는 알림 시스템을 설계하세요. 다양한 서비스에서 발생하는 알림 이벤트를 수집하고, 사용자 설정에 맞게 적절한 채널로 전달하는 것이 핵심입니다. 높은 처리량과 재시도 로직이 중요합니다.',
    requirements: {
      functional: [
        '푸시 알림(iOS/Android), 이메일, SMS 세 가지 채널을 지원한다',
        '사용자가 채널별·유형별 알림 수신 설정을 관리한다',
        '알림 템플릿 시스템으로 다국어 알림을 지원한다',
        '알림 발송 상태(발송/전달/읽음)를 추적한다',
        '대량 알림(공지, 마케팅)을 시간 분산 발송한다',
      ],
      nonFunctional: [
        '일일 10억 건 알림 처리',
        '알림 전달 지연 10초 이내 (p95)',
        '전달 실패 시 최대 3회 재시도',
        '중복 알림 방지 (exactly-once 의미론)',
        '초당 10만 건 피크 처리량',
      ],
    },
    estimations: {
      title: '알림 시스템 용량 추정',
      items: [
        '일일 10억 건: 푸시 60%, 이메일 30%, SMS 10%',
        '평균 QPS: 10억 / 86,400 ≈ 11,600/s, 피크 3배 ≈ 35,000/s',
        '알림 레코드 200 bytes × 10억 = 200GB/일, 30일 보관 시 6TB',
        'SMS 비용: 건당 30원 × 1억 건/일 = 30억 원/일 → 비용 최적화 필수',
        '이메일: 평균 5KB × 3억 건 = 1.5TB/일 발송 데이터',
      ],
    },
    architecture: {
      overview: '각 서비스에서 발생한 알림 이벤트를 Notification Service가 수집하고, 사용자 설정을 확인한 뒤 적절한 채널별 큐(Kafka)에 분배한다. 채널별 Worker가 큐에서 메시지를 소비하여 FCM/APNs, SMTP, SMS Gateway에 전달한다. 실패 시 Dead Letter Queue(DLQ)로 이동하여 재시도한다.',
      components: [
        { name: 'Notification Service', description: '알림 요청 수신, 중복 검사(idempotency key), 사용자 설정 확인, 템플릿 렌더링 후 채널별 큐에 발행' },
        { name: 'User Preference Store', description: '사용자별 알림 수신 설정(채널별 on/off, 방해금지 시간, 빈도 제한) 저장' },
        { name: 'Template Service', description: '알림 템플릿 관리, 다국어 지원, 변수 치환(사용자명, 금액 등)' },
        { name: 'Message Queue (Kafka)', description: '채널별 토픽(push/email/sms)으로 분리, 파티셔닝으로 병렬 처리, 재시도 토픽 별도 관리' },
        { name: 'Push Worker', description: 'FCM(Android)/APNs(iOS) API를 통해 푸시 알림 발송, 배치 API 활용으로 효율화' },
        { name: 'Email Worker', description: 'SMTP/SES를 통해 이메일 발송, 바운스/불만 처리' },
        { name: 'SMS Worker', description: 'SMS Gateway(Twilio, NHN Cloud) API를 통해 SMS 발송, 비용 최적화' },
        { name: 'Analytics & Tracking', description: '발송/전달/읽음 상태 추적, 알림별 클릭률(CTR) 집계' },
      ],
      dataFlow: [
        '1. 마이크로서비스가 알림 이벤트를 Notification Service에 전송 (POST /api/notify)',
        '2. Notification Service가 idempotency key로 중복 확인, User Preference에서 수신 설정 조회',
        '3. 수신 가능한 채널에 대해 Template Service로 렌더링 후 채널별 Kafka 토픽에 발행',
        '4. 채널별 Worker가 메시지를 소비하여 외부 서비스(FCM/SMTP/SMS)에 전달',
        '5. 전달 실패 시 지수 백오프로 최대 3회 재시도, 최종 실패 시 DLQ로 이동 후 알림',
      ],
    },
    deepDive: [
      {
        title: '중복 알림 방지 (Idempotency)',
        content: '네트워크 재시도나 이벤트 중복으로 같은 알림이 여러 번 발송될 수 있다. 각 알림 요청에 idempotency key(이벤트ID + 사용자ID + 채널)를 부여하고, Redis에 24시간 TTL로 저장한다. 동일 키가 이미 존재하면 발송을 스킵한다. Kafka consumer 측에서도 offset 커밋 후 재처리 시 DB의 발송 기록을 확인하여 이중 방어한다.',
      },
      {
        title: '우선순위 큐와 Rate Limiting',
        content: '알림 유형별 우선순위가 다르다: 결제 알림(긴급) > 소셜 알림(보통) > 마케팅(낮음). Kafka에 우선순위별 토픽을 분리하고 컨슈머 할당 비율을 차등 배분한다. Rate limiting은 두 레벨로 적용한다: (1) 사용자당 시간당 최대 N건으로 알림 피로도 관리, (2) 외부 API(FCM, SMS Gateway) 호출 속도를 provider의 rate limit 이내로 조절.',
      },
      {
        title: '재시도 전략과 Dead Letter Queue',
        content: '외부 서비스 장애 시 지수 백오프(1초→2초→4초)로 재시도한다. 일시적 오류(5xx, timeout)는 재시도하고, 영구 오류(잘못된 토큰, 존재하지 않는 이메일)는 즉시 DLQ로 이동한다. DLQ 메시지는 별도 대시보드에서 모니터링하고, 원인 해결 후 수동/자동 재처리한다. FCM 토큰 만료는 사용자 디바이스 정보를 업데이트하는 피드백 루프를 구성한다.',
      },
    ],
    scalability: [
      '채널별 Worker를 독립적으로 수평 확장 (푸시 50대, 이메일 20대, SMS 10대 등)',
      'Kafka 파티션 수를 늘려 채널별 처리량 확장',
      '마케팅 대량 발송은 시간 분산(spread over hours)으로 피크 완화',
      'User Preference를 Redis에 캐싱하여 DB 조회 부하 감소',
      '멀티 리전 배포로 FCM/APNs 엔드포인트에 가까운 Worker에서 발송',
      '오래된 알림 기록을 cold storage로 아카이빙하여 DB 크기 관리',
    ],
    tradeoffs: [
      '즉시 발송(실시간성) vs 배치 발송(효율성) — 알림 유형에 따라 차등 적용',
      'At-least-once(재시도로 안전하지만 중복 가능) vs At-most-once(중복 없지만 유실 가능)',
      '중앙집중형 알림 서비스(관리 용이) vs 마이크로서비스별 자체 발송(독립성 높음)',
      '자체 SMTP 인프라(비용 절감, 운영 부담) vs 외부 서비스(SES, SendGrid)(비용 높지만 편리)',
    ],
    interviewTips: [
      '세 채널(푸시/이메일/SMS)의 특성 차이와 각각의 병목점을 구분하여 설명하라',
      '중복 방지 메커니즘(idempotency key)을 반드시 포함하라 — 면접관이 높이 평가하는 포인트',
      '"마케팅 알림 1억 건을 1시간 안에 보내려면?" — 배치 크기, 파티셔닝, 시간 분산 전략을 설명하라',
      'SMS 비용 최적화(중요도 기반 채널 선택, 이메일 우선 발송 후 SMS 폴백)를 언급하라',
    ],
    relatedTermIds: ['arch-message-queue', 'arch-rate-limiter', 'net-http', 'arch-microservice'],
    diagramAscii: `
┌──────────┐  ┌──────────┐  ┌──────────┐
│Service A │  │Service B │  │Service C │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     └─────────────┼─────────────┘
                   ▼
          ┌─────────────────┐     ┌──────────────┐
          │  Notification   │────▶│  User Prefs  │
          │    Service      │     └──────────────┘
          └────────┬────────┘     ┌──────────────┐
                   │         ────▶│  Templates   │
                   ▼              └──────────────┘
          ┌─────────────────┐
          │   Kafka Topics  │
          │ push│email│sms  │
          └──┬────┬────┬────┘
             ▼    ▼    ▼
          ┌────┐┌────┐┌────┐
          │Push││Mail││SMS │──▶ DLQ
          │Wkr ││Wkr ││Wkr │
          └─┬──┘└─┬──┘└─┬──┘
            ▼     ▼     ▼
          FCM   SMTP  Gateway`,
  },

  // ──────────────────────────────────────────────────────────────
  // 6. 검색 엔진
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-search-engine',
    title: '검색 엔진 설계',
    titleEn: 'Web Search Engine',
    category: 'data',
    difficulty: 'expert',
    description: 'Google 검색을 간소화한 웹 검색 엔진을 설계하세요. 수십억 개의 웹 페이지를 크롤링하고, 역인덱스를 구축하며, 검색 쿼리에 대해 관련성 높은 결과를 밀리초 단위로 반환하는 시스템입니다. 분산 크롤링, 인덱싱, 랭킹의 세 기둥이 핵심입니다.',
    requirements: {
      functional: [
        '웹 페이지를 자동으로 크롤링하고 인덱싱한다',
        '키워드 검색 시 관련성 높은 결과를 순위화하여 반환한다',
        '자동 완성(autocomplete)과 오타 교정을 지원한다',
        '검색 결과에 제목, 스니펫, URL을 표시한다',
        '이미지/동영상 검색을 확장 가능하도록 설계한다',
      ],
      nonFunctional: [
        '검색 응답 500ms 이내 (p99)',
        '인덱스 1,000억 개 웹 페이지',
        '초당 10만 건 검색 쿼리 처리',
        '크롤러가 하루 10억 페이지를 수집',
        '인덱스 신선도: 주요 사이트 1시간 이내, 일반 사이트 1주 이내 반영',
      ],
    },
    estimations: {
      title: '검색 엔진 용량 추정',
      items: [
        '인덱스 대상 1,000억 페이지, 페이지당 평균 100KB = 10PB 원본 데이터',
        '압축된 역인덱스: 원본의 약 1-2% → 100TB~200TB',
        '일일 검색 쿼리 100억 건 → 평균 115,000 QPS, 피크 350,000 QPS',
        '크롤러: 10억 페이지/일 ÷ 86,400초 ≈ 11,600 페이지/초, 페이지당 1초 기준 11,600 동시 연결',
        '역인덱스 메모리: 핫 데이터(상위 10%) 10~20TB → 수백 대 서버 분산',
      ],
    },
    architecture: {
      overview: 'Crawler가 웹을 순회하며 페이지를 수집하고, Indexer가 텍스트를 토큰화하여 역인덱스를 구축한다. 검색 요청 시 Query Parser가 쿼리를 분석하고, Index Server에서 후보 문서를 검색한 뒤, Ranker가 PageRank + TF-IDF + 기계학습 모델로 결과를 순위화한다. 전체 인덱스는 수천 대 서버에 샤딩되어 분산 저장된다.',
      components: [
        { name: 'Web Crawler', description: '시드 URL에서 시작하여 BFS로 웹을 순회, URL Frontier로 우선순위 관리, robots.txt 준수, 중복 URL 제거' },
        { name: 'Document Store', description: '크롤링한 원본 HTML을 저장 (HDFS/S3), 컨텐츠 해시로 중복 페이지 제거' },
        { name: 'Indexer', description: '문서를 토큰화(형태소 분석), 역인덱스 구축, 문서별 TF-IDF 가중치 계산' },
        { name: 'Index Server', description: '역인덱스를 메모리/SSD에 유지, 검색어 매칭 쿼리 실행, 샤드별 병렬 검색' },
        { name: 'Query Parser', description: '검색어 토큰화, 불용어 제거, 동의어 확장, 오타 교정 (edit distance)' },
        { name: 'Ranker', description: 'TF-IDF + PageRank + 클릭 로그 기반 ML 모델로 최종 순위 결정' },
        { name: 'Autocomplete Service', description: 'Trie 자료구조 기반 실시간 자동 완성, 검색 로그에서 주기적 업데이트' },
      ],
      dataFlow: [
        '1. Crawler가 URL Frontier에서 URL을 가져와 페이지를 다운로드하고 Document Store에 저장',
        '2. Indexer가 Document Store에서 문서를 읽어 토큰화 → 역인덱스를 MapReduce로 구축',
        '3. 사용자 검색 시 Query Parser가 쿼리를 분석하고 확장',
        '4. Index Server 클러스터에서 샤드별 병렬 검색, 각 샤드가 상위 K개 결과 반환',
        '5. Ranker가 전체 후보를 병합·순위화하여 최종 Top 10을 사용자에게 반환',
      ],
    },
    deepDive: [
      {
        title: '역인덱스(Inverted Index) 구조와 최적화',
        content: '역인덱스는 "단어 → [문서ID 목록]" 매핑이다. 각 posting list에는 문서 ID, 단어 빈도(TF), 위치 정보가 포함된다. 복합 검색("A AND B")은 두 posting list의 교집합을 구한다. Skip pointer로 교집합 연산을 가속하고, variable-byte encoding이나 PForDelta로 문서 ID 목록을 압축한다. 전체 인덱스를 단어의 해시값으로 샤딩하여 수천 대 서버에 분산한다.',
      },
      {
        title: 'PageRank와 현대적 랭킹',
        content: 'PageRank는 웹을 방향 그래프로 모델링하여 인바운드 링크가 많고 질 높은 페이지에 높은 점수를 부여한다. 현대 검색엔진은 PageRank를 기본 시그널 중 하나로 사용하고, 수백 개의 추가 피처를 사용한다: 단어 위치(제목/본문/URL), 사이트 신뢰도, 모바일 친화성, 페이지 속도, 사용자 행동(클릭률, 체류 시간). 최종 랭킹은 LambdaMART 등의 Learning-to-Rank 모델로 결정한다.',
      },
      {
        title: '분산 크롤링과 예절(Politeness)',
        content: '크롤러는 robots.txt를 반드시 준수하고, 동일 도메인에 대해 일정 간격(1-5초)을 두고 요청한다. URL Frontier는 도메인별 큐를 분리하여 politeness를 보장한다. URL 우선순위는 PageRank, 최근 변경 시간, 갱신 빈도로 결정한다. 크롤러를 수천 대로 수평 확장하고, consistent hashing으로 URL 범위를 크롤러에 할당하여 중복 크롤링을 방지한다.',
      },
      {
        title: '자동 완성과 오타 교정',
        content: '자동 완성은 검색 로그에서 빈도가 높은 쿼리를 Trie에 저장하고 접두사 매칭으로 구현한다. 상위 N개 인기 쿼리를 각 노드에 캐싱하면 O(접두사 길이)로 결과를 반환한다. 오타 교정은 편집 거리(Levenshtein distance) 1-2 이내의 사전 단어를 후보로 제시한다. SymSpell 알고리즘으로 사전 계산하면 O(1)에 후보를 검색할 수 있다.',
      },
      {
        title: '인덱스 신선도와 점진적 업데이트',
        content: '전체 인덱스를 매번 재구축하면 수일이 소요된다. 뉴스 사이트 등 자주 변경되는 페이지는 별도 "실시간 인덱스"에 수분 단위로 반영하고, 일반 페이지는 "배치 인덱스"를 일주일 주기로 갱신한다. 검색 시 두 인덱스를 병합하여 결과를 반환한다. 크롤러가 변경을 감지(HTTP 304, sitemap.xml 변경)하면 해당 페이지만 재인덱싱한다.',
      },
    ],
    scalability: [
      '역인덱스를 단어 해시 기반으로 수천 샤드에 분산, 각 샤드가 독립적으로 검색 수행',
      '검색 쿼리를 모든 샤드에 scatter-gather하고 결과를 merge, 샤드 추가로 수평 확장',
      '인기 검색어 결과를 Redis/Memcached에 캐싱하여 인덱스 서버 부하 80% 감소',
      '크롤러를 수천 대로 수평 확장하고 URL 범위별 할당',
      'Document Store를 HDFS로 구축하여 무한 확장 가능한 원본 저장',
      '지역별 인덱스 복제본을 배치하여 글로벌 검색 지연 최소화',
    ],
    tradeoffs: [
      '인덱스 신선도(실시간 업데이트, 복잡도 높음) vs 배치 업데이트(단순, 시간 지연)',
      '단어 기반 샤딩(검색 빠름, 교집합 복잡) vs 문서 기반 샤딩(인덱싱 단순, 검색 시 모든 샤드 접근)',
      '정밀한 랭킹(ML 모델, 지연시간 증가) vs 근사 랭킹(규칙 기반, 빠르지만 덜 정확)',
      '크롤러 속도(더 많은 페이지 수집) vs 서버 부하 배려(politeness, 로봇 차단 위험)',
    ],
    interviewTips: [
      '역인덱스의 구조를 화이트보드에 그리면서 설명하라 — 검색엔진 설계의 핵심',
      '크롤링, 인덱싱, 서빙(검색) 세 파이프라인을 분리하여 설계하고 각각의 확장 전략을 제시하라',
      '"검색 결과가 1초 안에 나와야 한다" — 캐싱, 샤드 병렬 검색, 결과 수 제한(Top K) 전략을 설명하라',
      'PageRank 알고리즘을 간략히 설명할 수 있도록 준비하고, 현대 랭킹의 추가 시그널도 언급하라',
    ],
    relatedTermIds: ['algo-search', 'ds-trie', 'ds-hash-table', 'arch-distributed-storage', 'arch-mapreduce'],
    diagramAscii: `
┌───────────┐     ┌──────────────┐     ┌───────────────┐
│URL Frontier│────▶│  Crawler     │────▶│ Document Store│
│(우선순위큐) │     │  (분산 수집) │     │   (HDFS/S3)   │
└───────────┘     └──────────────┘     └───────┬───────┘
                                               │
                                        ┌──────▼──────┐
                                        │   Indexer   │
                                        │ (MapReduce) │
                                        └──────┬──────┘
                                               │
┌──────────┐    ┌──────────────┐     ┌─────────▼───────┐
│  Client  │───▶│ Query Parser │────▶│  Index Servers  │
└──────────┘    └──────┬───────┘     │ (분산 역인덱스)  │
                       │             └─────────┬───────┘
                       │                       │
                       │             ┌─────────▼───────┐
                       └────────────▶│     Ranker      │
                                     │ (PageRank + ML) │
                                     └─────────────────┘`,
  },

  // ──────────────────────────────────────────────────────────────
  // 7. 동영상 스트리밍
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-video-streaming',
    title: '동영상 스트리밍 플랫폼 설계',
    titleEn: 'Video Streaming Platform',
    category: 'storage',
    difficulty: 'expert',
    description: 'YouTube나 Netflix처럼 동영상을 업로드, 인코딩, 저장, 스트리밍하는 플랫폼을 설계하세요. 대용량 비디오 처리 파이프라인, 적응적 비트레이트 스트리밍(ABR), 글로벌 CDN 배포가 핵심 도전 과제입니다.',
    requirements: {
      functional: [
        '동영상을 업로드하고 다양한 해상도(240p~4K)로 인코딩한다',
        '적응적 비트레이트 스트리밍(ABR)으로 네트워크 상태에 맞게 재생한다',
        '동영상 검색, 추천, 시청 이력을 지원한다',
        '업로드 시 자동으로 썸네일을 생성한다',
        '댓글, 좋아요, 구독 기능을 제공한다',
      ],
      nonFunctional: [
        'DAU 2억 명, 일일 5억 시간 시청',
        '동영상 업로드부터 시청 가능까지 30분 이내',
        '재생 시작 지연 2초 이내',
        '99.99% 가용성, 버퍼링 최소화',
        '일일 50만 건 신규 동영상 업로드',
      ],
    },
    estimations: {
      title: '동영상 스트리밍 용량 추정',
      items: [
        '일일 50만 건 업로드, 평균 원본 500MB → 250TB/일 원본 저장',
        '해상도별 인코딩(240p~4K, 6종) → 원본 × 3배 ≈ 750TB/일 인코딩된 저장',
        '5억 시간/일 시청, 평균 5Mbps → 피크 대역폭 약 160Tbps',
        'CDN 캐시 적중률 95%로 오리진 트래픽 8Tbps로 감소',
        '동시 시청자: 2억 × 25%(동시 접속률) = 5,000만 동시 스트림',
      ],
    },
    architecture: {
      overview: '업로드된 원본 동영상을 Object Storage에 저장하고, Transcoding Pipeline이 비동기로 다양한 해상도/코덱으로 인코딩한다. 인코딩된 세그먼트를 글로벌 CDN에 배포하고, 클라이언트 플레이어가 ABR(HLS/DASH)로 네트워크 상태에 맞는 세그먼트를 선택하여 재생한다. Video Metadata Service가 검색·추천을 위한 메타데이터를 관리한다.',
      components: [
        { name: 'Upload Service', description: '이어받기 가능한 청크 업로드(tus 프로토콜), 원본을 S3에 저장 후 트랜스코딩 작업 발행' },
        { name: 'Transcoding Pipeline', description: '원본 → FFmpeg로 6개 해상도 × 2개 코덱(H.264, VP9) 인코딩, DAG(방향 비순환 그래프) 워크플로' },
        { name: 'Object Storage (S3)', description: '원본 + 인코딩된 세그먼트 + 썸네일 저장, 수 엑사바이트 규모' },
        { name: 'CDN (글로벌)', description: '인코딩된 세그먼트를 엣지 서버에 캐싱, 사용자에게 가장 가까운 엣지에서 서빙' },
        { name: 'Video Metadata Service', description: '동영상 정보(제목, 설명, 태그, 조회수), 인코딩 상태, ABR manifest 관리' },
        { name: 'Streaming Service', description: 'HLS/DASH manifest 생성 및 세그먼트 서빙, ABR 로직 지원' },
        { name: 'Recommendation Engine', description: '시청 이력, 좋아요, 유사 사용자 기반 협업 필터링으로 추천 목록 생성' },
      ],
      dataFlow: [
        '1. 크리에이터가 동영상을 Upload Service에 청크 업로드 → S3에 원본 저장',
        '2. Transcoding Pipeline이 원본을 6개 해상도로 인코딩, 10초 단위 세그먼트로 분할',
        '3. 인코딩된 세그먼트를 S3에 저장하고, CDN으로 배포, ABR manifest(m3u8/mpd) 생성',
        '4. 시청자가 재생 시 CDN 엣지에서 manifest를 받고, 네트워크 대역폭에 맞는 세그먼트 요청',
        '5. 시청 로그를 수집하여 추천 엔진 학습 및 조회수 집계에 활용',
      ],
    },
    deepDive: [
      {
        title: '적응적 비트레이트 스트리밍 (ABR)',
        content: '동영상을 10초 세그먼트로 분할하고 각 세그먼트를 여러 비트레이트(240p~4K)로 인코딩한다. HLS(Apple) 또는 DASH(국제 표준) 프로토콜로 manifest 파일에 모든 비트레이트 목록을 제공한다. 클라이언트 플레이어가 버퍼 수준과 다운로드 속도를 모니터링하여 다음 세그먼트의 비트레이트를 동적으로 선택한다. 네트워크가 나빠지면 자동으로 저해상도로 전환하여 버퍼링을 방지한다.',
      },
      {
        title: '트랜스코딩 파이프라인 설계',
        content: '단일 동영상의 인코딩을 DAG(방향 비순환 그래프) 워크플로로 표현한다: 원본 검증 → 오디오/비디오 분리 → 비디오를 6개 해상도로 병렬 인코딩 → 오디오 인코딩(AAC) → 세그먼트 분할 → 썸네일 추출 → manifest 생성. 각 단계를 Kubernetes Job으로 실행하고, 리소스(GPU/CPU)에 따라 스케줄링한다. 피크 시간에 spot instance를 활용하여 비용을 절감한다.',
      },
      {
        title: 'CDN 전략과 비용 최적화',
        content: '동영상 트래픽의 10%가 전체 시청의 80%를 차지한다(롱테일 분포). 인기 동영상은 글로벌 CDN 엣지에 사전 캐싱하고, 비인기 동영상은 요청 시 오리진에서 풀링한다. 멀티 CDN(Cloudflare + Akamai + 자체)을 사용하여 가용성을 높이고 비용을 최적화한다. ISP와 직접 피어링하여 대역폭 비용을 절감하고, 비피크 시간에 콘텐츠를 사전 배포한다.',
      },
      {
        title: '라이브 스트리밍 확장',
        content: '녹화 방송과 달리 라이브 스트리밍은 실시간 인코딩이 필요하다. 스트리머가 RTMP로 인제스트 서버에 전송하면, 실시간 트랜스코더가 3-5초 세그먼트로 인코딩하고 즉시 CDN에 배포한다. 지연시간을 줄이기 위해 LL-HLS(Low Latency HLS, 세그먼트 0.5초)나 WebRTC를 사용한다. 라이브 방송이 끝나면 세그먼트를 이어붙여 VOD로 자동 변환한다.',
      },
      {
        title: '콘텐츠 추천 시스템',
        content: '추천 파이프라인은 후보 생성(candidate generation)과 랭킹(ranking) 2단계로 구성된다. 후보 생성은 협업 필터링(비슷한 시청 패턴의 사용자가 본 영상)과 콘텐츠 기반 필터링(태그, 카테고리, 제목 유사도)을 병합한다. 랭킹 모델은 예상 시청 시간을 최대화하도록 학습하며, 다양성(diversity)과 참신성(novelty)을 위한 재랭킹 레이어를 추가한다.',
      },
    ],
    scalability: [
      'CDN 엣지 서버를 전 세계 200+ PoP에 배치하여 지연시간 최소화',
      '트랜스코딩을 GPU 클러스터에서 병렬 처리, auto-scaling으로 업로드 급증 대응',
      'Object Storage(S3)는 무한 확장, 수 엑사바이트 규모까지 지원',
      '메타데이터 DB를 동영상 ID 기반 샤딩, 읽기 레플리카로 검색 QPS 확장',
      '시청 로그를 Kafka → Flink로 실시간 집계하여 인기 동영상 감지',
      '추천 모델 서빙을 GPU inference 서버로 분리하여 독립적 확장',
    ],
    tradeoffs: [
      '사전 인코딩(모든 해상도, 저장 비용 높음) vs 온디맨드 인코딩(저장 절감, 첫 재생 지연)',
      'HLS(Apple 생태계 최적, 지연 높음) vs DASH(표준, 유연) vs WebRTC(초저지연, 확장 어려움)',
      'CDN 비용(대역폭 비싸지만 UX 좋음) vs 오리진 직접 서빙(저렴하지만 느림)',
      '시청 시간 최적화 추천(사용자 유지) vs 다양성 중시 추천(새로운 발견, 필터 버블 완화)',
    ],
    interviewTips: [
      '업로드→인코딩→저장→CDN→재생의 전체 파이프라인을 순서대로 설명하라',
      'ABR의 동작 원리(세그먼트 분할, manifest, 클라이언트 적응)를 구체적으로 설명하라',
      '"4K 라이브 스트리밍을 100만 동시 시청자에게 제공하려면?" — CDN, PoP, 피어링 전략을 설명하라',
      '트랜스코딩 비용 최적화(spot instance, 우선순위 큐, 사전 인코딩 범위 제한)를 언급하라',
    ],
    relatedTermIds: ['arch-cdn', 'arch-distributed-storage', 'net-http', 'arch-message-queue'],
    diagramAscii: `
┌──────────┐   청크업로드   ┌──────────────┐   원본저장   ┌─────────────┐
│Creator   │──────────────▶│Upload Service│──────────▶│  S3 (원본)  │
└──────────┘               └──────┬───────┘           └─────────────┘
                                  │ 이벤트
                           ┌──────▼───────┐           ┌─────────────┐
                           │ Transcoding  │──────────▶│S3 (인코딩)  │
                           │  Pipeline    │           └──────┬──────┘
                           │ (GPU 클러스터)│                  │ 배포
                           └──────────────┘           ┌──────▼──────┐
                                                      │  CDN Edge   │
┌──────────┐   HLS/DASH    ┌──────────────┐          │  (200+ PoP) │
│ Viewer   │◀──────────────│  Streaming   │◀─────────┤             │
└──────────┘               │   Service    │          └─────────────┘
                           └──────────────┘`,
  },

  // ──────────────────────────────────────────────────────────────
  // 8. Rate Limiter
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-rate-limiter',
    title: 'Rate Limiter 설계',
    titleEn: 'Rate Limiter',
    category: 'infrastructure',
    difficulty: 'intermediate',
    description: 'API 게이트웨이에 배치하여 클라이언트의 요청 빈도를 제한하는 Rate Limiter를 설계하세요. DDoS 방어, API 남용 방지, 서비스 안정성 보장이 목적이며, 분산 환경에서 정확한 카운팅과 낮은 지연시간이 핵심입니다.',
    requirements: {
      functional: [
        '클라이언트(IP/API 키)별 시간 단위 요청 횟수를 제한한다',
        '다양한 규칙 지원: 초당/분당/시간당 제한을 동시에 적용',
        '제한 초과 시 429 Too Many Requests 응답과 Retry-After 헤더 반환',
        'API 엔드포인트별 차등 제한 (예: GET 100/s, POST 10/s)',
        '실시간 대시보드로 제한 현황을 모니터링한다',
      ],
      nonFunctional: [
        'Rate Limiter 자체의 지연시간 1ms 이하',
        '초당 100만 건 요청 처리',
        '분산 환경(API 서버 100대)에서 정확한 글로벌 카운팅',
        'Rate Limiter 장애 시 요청을 차단하지 않고 통과 (fail-open)',
        '규칙 변경이 30초 이내에 전체 노드에 반영',
      ],
    },
    estimations: {
      title: 'Rate Limiter 용량 추정',
      items: [
        'API 서버 100대, 서버당 10,000 QPS → 총 100만 QPS',
        '활성 클라이언트 100만 개 × 규칙 3개 × 카운터 16 bytes = 48MB Redis 메모리',
        'Redis 단일 노드 10만 ops/s → 클러스터 10대로 100만 QPS 처리',
        '규칙 설정: 1,000개 API × 4 플랜(무료/기본/프로/엔터프라이즈) = 4,000 규칙',
        'Sliding window log 방식 시 요청당 8 bytes × 100/s × 100만 클라이언트 = 800GB → 비현실적, 근사 알고리즘 필수',
      ],
    },
    architecture: {
      overview: 'API Gateway 앞단에 Rate Limiter 미들웨어를 배치한다. 각 요청마다 Redis에서 클라이언트별 카운터를 원자적으로 조회·증가(INCR)하고, 규칙 초과 시 429를 반환한다. 규칙은 Config Service에서 관리하고 주기적으로 로컬 캐시에 동기화한다. Sliding Window Counter 알고리즘으로 정확도와 메모리 효율을 균형있게 맞춘다.',
      components: [
        { name: 'Rate Limiter Middleware', description: 'API Gateway의 미들웨어로 동작, 요청 가로채기 → Redis 조회 → 허용/거부 판단, 1ms 이내 처리' },
        { name: 'Redis Cluster', description: '클라이언트별 카운터 저장, MULTI/EXEC로 원자적 조회·증가, TTL 자동 만료' },
        { name: 'Rules Config Service', description: 'API별·플랜별 제한 규칙 관리 (YAML/DB), 변경 시 pubsub으로 전파' },
        { name: 'Local Cache', description: '각 API 서버에 규칙과 최근 카운터를 로컬 캐싱하여 Redis 왕복 감소' },
        { name: 'Monitoring Dashboard', description: '제한 현황, 429 비율, 클라이언트별 사용량을 실시간 시각화' },
      ],
      dataFlow: [
        '1. 클라이언트 요청이 API Gateway의 Rate Limiter 미들웨어에 도달',
        '2. 클라이언트 식별(API 키/IP) → 로컬 캐시에서 규칙 조회 → Redis에서 현재 카운터 조회',
        '3. Sliding Window Counter 알고리즘으로 현재 윈도우의 요청 수를 계산',
        '4. 제한 이내면 카운터 증가 후 요청 통과, 초과면 429 응답 + Retry-After 헤더',
        '5. 카운터 데이터를 Monitoring Dashboard에 주기적으로 집계·전송',
      ],
    },
    deepDive: [
      {
        title: 'Rate Limiting 알고리즘 비교',
        content: 'Token Bucket: 토큰이 일정 속도로 채워지고 요청마다 1개 소비, 버스트 허용. Leaky Bucket: 요청을 큐에 넣고 일정 속도로 처리, 버스트 불허. Fixed Window Counter: 시간 윈도우(1분)마다 카운터 리셋, 윈도우 경계에서 2배 버스트 가능. Sliding Window Log: 모든 요청 타임스탬프 저장, 정확하지만 메모리 과다. Sliding Window Counter: fixed window 두 개의 가중 평균으로 근사, 메모리 효율적이면서 정확도 높음.',
      },
      {
        title: 'Sliding Window Counter 구현',
        content: 'Redis에 현재 윈도우와 이전 윈도우의 카운터를 저장한다. 현재 시각이 윈도우의 30% 지점이라면: 추정 요청 수 = 이전 윈도우 카운터 × 0.7 + 현재 윈도우 카운터. 이 방식으로 fixed window의 경계 버스트 문제를 해결하면서 메모리는 카운터 2개(16 bytes)만 사용한다. Redis의 MULTI + INCR + EXPIRE를 하나의 Lua 스크립트로 실행하여 원자성을 보장한다.',
      },
      {
        title: '분산 환경에서의 동기화',
        content: 'API 서버 100대가 같은 Redis 클러스터를 공유하면 글로벌 카운팅이 자연스럽게 보장된다. 그러나 Redis 왕복 지연(0.5ms)이 매 요청마다 추가된다. 최적화: 로컬에서 대략적으로 카운팅하고 주기적으로 Redis와 동기화(sliding window + local batch). 정확도를 약간 희생하지만 Redis 부하를 10배 줄인다. Redis 장애 시 fail-open(모든 요청 허용) + 로컬 카운터로 폴백.',
      },
      {
        title: 'Rate Limit 응답 설계',
        content: '429 응답에 포함할 헤더: X-RateLimit-Limit(총 허용량), X-RateLimit-Remaining(남은 요청), X-RateLimit-Reset(리셋 시각 Unix timestamp), Retry-After(재시도까지 초). 이 정보를 통해 클라이언트가 지능적으로 요청 속도를 조절할 수 있다. 429 응답 자체도 rate limit을 적용하여 공격자가 429를 대량 발생시키는 것을 방지한다.',
      },
    ],
    scalability: [
      'Redis Cluster의 샤드를 추가하여 처리량과 메모리를 수평 확장',
      '로컬 카운터 + 주기적 Redis 동기화로 Redis 부하를 10배 감소',
      '규칙을 로컬 캐시에 저장하고 pubsub으로 동기화하여 Config Service 병목 제거',
      'IP별 제한은 L3/L4 레벨(iptables, 하드웨어)에서 1차 필터링하여 애플리케이션 부하 경감',
      '지역별 Rate Limiter 배치로 글로벌 서비스의 지연시간 최소화',
    ],
    tradeoffs: [
      'Token Bucket(버스트 허용, 구현 복잡) vs Sliding Window Counter(정확, 구현 단순)',
      '글로벌 정확 카운팅(Redis 매번 조회, 지연 증가) vs 로컬 근사 카운팅(빠르지만 부정확)',
      'Fail-open(장애 시 모든 요청 허용, 서비스 가용성 우선) vs Fail-closed(안전하지만 서비스 중단)',
      '클라이언트별 제한(공정하지만 관리 복잡) vs 전역 제한(단순하지만 불공정)',
    ],
    interviewTips: [
      '5가지 알고리즘(Token Bucket, Leaky Bucket, Fixed Window, Sliding Log, Sliding Counter)을 비교·설명하라',
      'Redis Lua 스크립트를 활용한 원자적 카운터 구현을 구체적으로 설명하라',
      '"Redis가 죽으면?" — fail-open 전략과 로컬 폴백을 준비하라',
      '429 응답의 헤더 설계(X-RateLimit-Limit, Remaining, Reset, Retry-After)를 상세히 설명하라',
    ],
    relatedTermIds: ['arch-rate-limiter', 'arch-cache', 'net-http', 'arch-api-gateway'],
    diagramAscii: `
┌──────────┐    요청    ┌─────────────────────────────────┐
│  Client  │──────────▶│          API Gateway             │
└──────────┘           │  ┌─────────────────────────┐     │
                       │  │   Rate Limiter 미들웨어  │     │
       429 + Retry     │  │                         │     │
    ◀──────────────────│  │  ┌───────┐ ┌─────────┐ │     │
                       │  │  │Local  │ │ Redis   │ │     │
                       │  │  │Cache  │◀▶│ Cluster │ │     │
                       │  │  └───────┘ └─────────┘ │     │
                       │  └────────────┬────────────┘     │
                       └───────────────┼──────────────────┘
                              허용 시   │
                                       ▼
                              ┌─────────────────┐
                              │   API Servers   │
                              │  (백엔드 서비스)  │
                              └─────────────────┘`,
  },

  // ──────────────────────────────────────────────────────────────
  // 9. 분산 캐시
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-distributed-cache',
    title: '분산 캐시 시스템 설계',
    titleEn: 'Distributed Cache System',
    category: 'infrastructure',
    difficulty: 'advanced',
    description: 'Redis나 Memcached처럼 대규모 분산 환경에서 키-값 데이터를 메모리에 캐싱하는 시스템을 설계하세요. 일관성 있는 해싱으로 노드 추가/제거 시 데이터 재분배를 최소화하고, 캐시 무효화와 TTL 관리가 핵심입니다.',
    requirements: {
      functional: [
        'key-value 쌍의 GET, SET, DELETE 연산을 지원한다',
        '키별 TTL(만료 시간)을 설정할 수 있다',
        '캐시 미스 시 원본 데이터 소스(DB)에서 자동 로딩을 지원한다 (read-through)',
        '데이터 구조(String, List, Hash, Set, Sorted Set)를 지원한다',
        '노드 장애 시 자동 페일오버가 된다',
      ],
      nonFunctional: [
        'GET/SET 지연시간 1ms 이내 (p99)',
        '초당 100만 ops 처리',
        '총 저장 용량 10TB (메모리)',
        '노드 추가/제거 시 20% 이하의 키만 재분배',
        '99.999% 가용성',
      ],
    },
    estimations: {
      title: '분산 캐시 용량 추정',
      items: [
        '10TB 메모리 / 노드당 64GB = 최소 160 노드',
        '100만 ops/s / 노드당 10만 ops = 최소 10 노드 (처리량 기준)',
        '복제 팩터 3 → 160 × 3 = 480 노드 (가용성 보장)',
        '키 평균 크기 50 bytes, 값 평균 1KB → 키 공간 약 100억 개',
        'Consistent hashing: 150개 가상 노드/물리 노드 → 노드당 표준편차 5% 이내 균등 분배',
      ],
    },
    architecture: {
      overview: '클라이언트 라이브러리가 Consistent Hashing으로 키를 해시하여 담당 노드를 찾고, 해당 노드에 직접 요청한다. 각 노드는 메모리에 해시 테이블을 유지하고, LRU/LFU 정책으로 메모리를 관리한다. Cluster Manager가 노드 상태를 모니터링하고, 노드 장애 시 복제본으로 페일오버한다.',
      components: [
        { name: 'Client Library', description: 'Consistent hashing으로 키 → 노드 매핑, 커넥션 풀링, 자동 재시도, 장애 노드 감지' },
        { name: 'Cache Node', description: '메모리 내 해시 테이블로 데이터 저장, LRU/LFU eviction, TTL 만료 처리, 복제본 동기화' },
        { name: 'Consistent Hash Ring', description: '가상 노드(vnodes)로 데이터를 균등 분배, 노드 추가/제거 시 인접 노드만 영향' },
        { name: 'Cluster Manager', description: '노드 헬스체크, 토폴로지 관리, 장애 감지 → 복제본 승격(failover), 새 노드 가입 조율' },
        { name: 'Replication Manager', description: '마스터-복제본 간 비동기 복제, 복제 지연 모니터링' },
        { name: 'Configuration Service', description: '클러스터 토폴로지, 해시 링 매핑 정보를 모든 클라이언트에 배포' },
      ],
      dataFlow: [
        '1. 클라이언트가 키를 해싱하여 Consistent Hash Ring에서 담당 노드를 결정',
        '2. 해당 노드에 GET/SET 요청을 직접 전송 (프록시 없이 직접 통신)',
        '3. SET 시 마스터 노드에 쓰고, 비동기로 2개 복제본에 전파',
        '4. GET 시 마스터에서 조회, 마스터 장애 시 복제본에서 읽기',
        '5. 노드 장애 감지 시 Cluster Manager가 복제본을 새 마스터로 승격하고 해시 링 업데이트',
      ],
    },
    deepDive: [
      {
        title: 'Consistent Hashing 심화',
        content: '기본 consistent hashing은 노드 수가 적으면 데이터 불균형이 심하다. 각 물리 노드를 100-200개의 가상 노드(vnodes)로 매핑하면 데이터 분포가 균등해진다. 노드 추가 시 새 노드의 vnodes가 해시 링에 삽입되고, 인접한 노드에서만 데이터를 이관한다. 전체 키의 1/N(N=노드 수)만 이동하므로 재분배가 최소화된다. Jump Consistent Hash는 가상 노드 없이도 균등 분배를 보장하는 대안이다.',
      },
      {
        title: '캐시 무효화 전략',
        content: 'Cache-Aside: 애플리케이션이 직접 캐시 관리(읽기 시 캐시 먼저 → 미스 시 DB → 캐시 적재). Write-Through: 쓰기 시 캐시와 DB를 동시에 업데이트. Write-Behind(Write-Back): 쓰기를 캐시에만 하고 비동기로 DB에 반영(성능 좋지만 유실 위험). 실무에서는 Cache-Aside + TTL이 가장 흔하다. 적극적 무효화가 필요하면 DB 변경 이벤트(CDC)를 구독하여 캐시를 삭제한다.',
      },
      {
        title: '캐시 스탬피드(Thundering Herd) 방지',
        content: '인기 키의 TTL이 만료되면 수천 요청이 동시에 DB를 조회하는 "캐시 스탬피드"가 발생한다. 해결책: (1) 뮤텍스 패턴 — 첫 번째 요청만 DB 조회하고 나머지는 짧은 대기 후 캐시에서 읽기, (2) 확률적 조기 갱신 — TTL 만료 전에 일정 확률로 미리 갱신, (3) 값에 논리적 TTL을 포함하여 만료 전에 백그라운드 갱신. 핫 키는 아예 만료하지 않고 이벤트 기반으로 갱신한다.',
      },
      {
        title: 'Eviction 정책 비교',
        content: 'LRU(Least Recently Used): 가장 오래 미접근된 키를 제거, 구현 단순(더블 링크드 리스트 + 해시맵). LFU(Least Frequently Used): 접근 빈도가 가장 낮은 키를 제거, 핫 데이터 보존에 유리. Redis의 approximated LRU는 랜덤 샘플링(5-10개) 후 가장 오래된 것을 제거하여 정확한 LRU의 메모리 오버헤드를 피한다. LFU는 시간에 따른 빈도 감쇠(decay)를 적용하지 않으면 과거에 인기였던 데이터가 영구 상주하는 문제가 있다.',
      },
      {
        title: '데이터 복제와 일관성',
        content: '마스터-복제본 비동기 복제는 성능이 좋지만 마스터 장애 시 아직 복제되지 않은 데이터가 유실될 수 있다. 반동기(semi-sync) 복제는 최소 1개 복제본에 쓰기 완료 후 ACK를 반환하여 유실을 최소화한다. 네트워크 파티션 시 "split-brain"을 방지하기 위해 과반수(quorum) 기반 장애 감지를 사용하고, 마스터 후보가 최신 데이터를 가진 복제본 중 선출되도록 한다.',
      },
    ],
    scalability: [
      'Consistent hashing으로 노드를 무중단 추가/제거, 점진적 데이터 마이그레이션',
      '읽기 부하가 높으면 복제본 수를 늘려 읽기 처리량 확장',
      '핫 키 문제: 복제본을 랜덤으로 읽거나, 키에 접미사를 추가하여 여러 노드에 분산',
      '클라이언트 사이드 캐시(로컬 L1 캐시 + 분산 L2 캐시) 2계층 구조로 네트워크 부하 감소',
      '대규모 클러스터는 데이터센터별로 분리하고 교차 복제로 재해 복구',
      'Gossip 프로토콜로 클러스터 상태를 분산 관리하여 중앙 관리 노드 병목 제거',
    ],
    tradeoffs: [
      'Consistent hashing(균등 분배, 복잡) vs 범위 파티셔닝(구현 단순, 핫스팟 위험)',
      '비동기 복제(빠름, 유실 가능) vs 동기 복제(안전, 지연 증가)',
      'LRU(최근 접근 기반, 범용) vs LFU(빈도 기반, 핫 데이터 보존)',
      'Cache-Aside(제어 가능, 코드 복잡) vs Write-Through(일관성 좋음, 쓰기 지연)',
    ],
    interviewTips: [
      'Consistent hashing을 화이트보드에 그리면서 노드 추가/제거 시 데이터 이동을 시각적으로 보여줘라',
      '캐시 무효화 3가지 패턴(Cache-Aside, Write-Through, Write-Behind)을 트레이드오프와 함께 비교하라',
      '"핫 키 문제(예: 연예인 게시물 캐시)"를 어떻게 해결하겠는가? — 복제, 로컬 캐시, 키 분산 전략을 설명하라',
      '캐시 스탬피드를 반드시 언급하고 뮤텍스 패턴을 설명하라 — 실무 경험을 보여주는 포인트',
    ],
    relatedTermIds: ['arch-cache', 'ds-hash-table', 'arch-consistent-hashing', 'arch-replication'],
    diagramAscii: `
                    ┌─────────────────────────────────┐
                    │     Consistent Hash Ring        │
                    │                                 │
                    │    N1──vn──vn    N2──vn──vn     │
                    │   ╱              ╲              │
                    │  ╱    Hash Ring    ╲             │
                    │ N4──vn──vn    N3──vn──vn        │
                    └─────────────────────────────────┘
                                  ▲
┌──────────┐   hash(key)         │
│  Client  │─────────────────────┘
│ Library  │──────────────┐
└──────────┘              ▼
                   ┌──────────────┐    복제    ┌──────────────┐
                   │ Cache Node   │──────────▶│   Replica    │
                   │ (Master)     │           │   (Slave)    │
                   │ ┌──────────┐ │           └──────────────┘
                   │ │ HashTable│ │
                   │ │ LRU List │ │    ┌──────────────┐
                   │ └──────────┘ │    │  Cluster Mgr │
                   └──────────────┘    │ (헬스체크,    │
                                       │  페일오버)    │
                                       └──────────────┘`,
  },

  // ──────────────────────────────────────────────────────────────
  // 10. 타임라인 / 활동 피드
  // ──────────────────────────────────────────────────────────────
  {
    id: 'sd-activity-feed',
    title: '활동 피드(타임라인) 설계',
    titleEn: 'Activity Feed / Timeline',
    category: 'data',
    difficulty: 'advanced',
    description: 'LinkedIn이나 GitHub처럼 사용자와 관련된 활동(게시물 작성, 좋아요, 댓글, 코드 커밋 등)을 시간순으로 집계하여 보여주는 활동 피드 시스템을 설계하세요. 다양한 이벤트 유형을 통합하고, 이벤트 소싱과 CQRS 패턴이 핵심입니다.',
    requirements: {
      functional: [
        '다양한 이벤트 유형(게시물, 좋아요, 댓글, 팔로우, 커밋 등)을 통합 피드에 표시한다',
        '팔로우하는 사용자와 참여한 프로젝트의 활동을 집계한다',
        '활동 유형별 필터링과 무한 스크롤을 지원한다',
        '비슷한 활동을 그룹핑한다 (예: "A님 외 3명이 좋아합니다")',
        '실시간 업데이트로 새 활동을 피드 상단에 표시한다',
      ],
      nonFunctional: [
        'DAU 1억 명, 일일 50억 건 이벤트',
        '피드 로딩 300ms 이내 (p95)',
        '새 이벤트가 팔로워 피드에 10초 이내 반영',
        '이벤트 유실 없음 (at-least-once)',
        '7일간 피드 보관, 이후 아카이빙',
      ],
    },
    estimations: {
      title: '활동 피드 용량 추정',
      items: [
        '일일 50억 이벤트 → 평균 58,000 이벤트/초, 피크 170,000/초',
        '이벤트당 500 bytes → 일일 2.5TB, 7일 보관 17.5TB',
        '사용자당 평균 200명 팔로우 → fanout 50억 × 200 = 1조 피드 항목/일 (쓰기 시)',
        '피드 캐시: 사용자당 상위 100개 이벤트 ID(800 bytes) × 1억 = 80GB Redis',
        '이벤트 그룹핑 후 피드 크기 약 30-50% 감소',
      ],
    },
    architecture: {
      overview: '각 서비스에서 발생한 이벤트를 Event Ingestion Layer(Kafka)로 수집하고, Event Store에 불변으로 저장한다(이벤트 소싱). Feed Generator가 이벤트를 소비하여 사용자별 피드를 물화(materialize)하고 Feed Cache에 저장한다(CQRS). 피드 조회 시 Feed Service가 캐시에서 이벤트 ID 목록을 가져오고 Event Store에서 상세 정보를 hydrate한다.',
      components: [
        { name: 'Event Ingestion (Kafka)', description: '모든 서비스의 이벤트를 통합 수집, 이벤트 유형별 토픽, 순서 보장' },
        { name: 'Event Store', description: '이벤트를 불변으로 저장 (Cassandra/DynamoDB), 시간순 조회 최적화, 이벤트 소싱의 원본' },
        { name: 'Feed Generator', description: 'Kafka 컨슈머로 이벤트를 소비하여 팔로워별 피드를 생성/업데이트, 그룹핑 로직 적용' },
        { name: 'Feed Cache (Redis)', description: '사용자별 피드(이벤트 ID sorted set)를 캐싱, 최신 100개 유지' },
        { name: 'Feed Service', description: '피드 조회 API, 캐시에서 ID 조회 + Event Store에서 hydrate + 필터링/페이지네이션' },
        { name: 'Aggregation Service', description: '유사 이벤트 그룹핑 ("A 외 N명이 좋아합니다"), 카운트 집계' },
        { name: 'Real-time Notification', description: 'SSE/WebSocket으로 피드 실시간 업데이트, 새 이벤트 도착 시 클라이언트에 push' },
      ],
      dataFlow: [
        '1. 마이크로서비스에서 이벤트 발생(게시물 작성, 좋아요 등) → Kafka에 발행',
        '2. Event Store Consumer가 이벤트를 불변 저장소에 기록 (이벤트 소싱)',
        '3. Feed Generator가 이벤트를 소비하여 팔로워 목록을 조회, 각 팔로워의 Feed Cache에 이벤트 ID 추가',
        '4. 유사 이벤트(같은 게시물에 대한 좋아요)는 Aggregation Service가 그룹핑',
        '5. 피드 조회 시 Feed Service가 캐시에서 ID 목록 → Event Store에서 상세 → 클라이언트 반환',
      ],
    },
    deepDive: [
      {
        title: '이벤트 소싱과 CQRS 패턴',
        content: '이벤트 소싱은 상태 변경을 이벤트로 기록하고, 현재 상태는 이벤트를 재생(replay)하여 도출한다. 활동 피드에 완벽히 적합하다: 모든 활동이 자연스럽게 이벤트이며, 이벤트를 삭제하지 않으므로 감사 추적이 가능하다. CQRS(Command Query Responsibility Segregation)로 쓰기(이벤트 저장)와 읽기(피드 조회)를 분리한다. 쓰기 모델은 이벤트 스토어에 최적화하고, 읽기 모델은 피드 캐시에 최적화하여 각각 독립적으로 확장한다.',
      },
      {
        title: '이벤트 그룹핑(Aggregation) 전략',
        content: '같은 게시물에 100명이 좋아요를 누르면 피드에 100줄이 표시되는 것은 UX상 좋지 않다. 시간 윈도우(10분) + 대상 객체(게시물 ID) + 이벤트 유형(좋아요)이 같은 이벤트를 그룹핑한다. "A님 외 99명이 게시물에 좋아요를 눌렀습니다"로 집약한다. 그룹핑은 Feed Generator 단계에서 수행하며, 새 이벤트가 기존 그룹에 속하면 카운트를 증가시키고 가장 최근 액터를 대표로 표시한다.',
      },
      {
        title: 'Fanout 전략과 하이브리드 접근',
        content: '뉴스피드와 유사하게 write-time fanout과 read-time fanout의 하이브리드를 사용한다. 팔로워 1,000명 이하인 일반 사용자의 이벤트는 write-time fanout으로 즉시 팔로워 피드에 기록한다. 팔로워가 많은 인플루언서의 이벤트는 read-time fanout으로 피드 조회 시 병합한다. 활동 피드 특성상 "내 활동" 탭은 자신의 이벤트만 Event Store에서 직접 조회하므로 fanout이 불필요하다.',
      },
      {
        title: '피드 페이지네이션과 커서',
        content: '무한 스크롤을 위해 커서 기반 페이지네이션을 사용한다. 커서는 마지막으로 조회한 이벤트의 타임스탬프+ID 조합이다. 오프셋 기반 페이지네이션은 새 이벤트 삽입 시 페이지가 어긋나는 문제가 있다. Redis sorted set에서 ZRANGEBYSCORE로 커서 이후의 이벤트를 효율적으로 조회한다. 캐시에 없는 오래된 피드는 Event Store에서 직접 조회하여 반환한다.',
      },
    ],
    scalability: [
      'Kafka 파티션을 늘려 이벤트 수집 처리량 수평 확장',
      'Feed Generator를 Kafka 컨슈머 그룹으로 수평 확장, 파티션 수만큼 병렬 처리',
      'Event Store(Cassandra)를 사용자 ID 기반 파티셔닝으로 확장',
      'Feed Cache(Redis)를 사용자 ID 기반 consistent hashing으로 분산',
      '이벤트 유형별 별도 파이프라인으로 분리하여 독립 확장 (좋아요 파이프라인, 게시물 파이프라인 등)',
      '7일 이상된 이벤트를 cold storage로 아카이빙하여 hot data 볼륨 관리',
    ],
    tradeoffs: [
      '이벤트 소싱(완전한 이력, 재생 가능) vs 상태 기반(단순, 이력 추적 불가)',
      'Write-time fanout(즉시 피드 반영) vs Read-time fanout(쓰기 부하 없음) — 팔로워 수에 따라 하이브리드',
      '실시간 업데이트(SSE/WebSocket, 서버 부하) vs 폴링(단순, 지연)',
      '적극적 그룹핑(UX 깔끔, 로직 복잡) vs 개별 표시(구현 단순, 피드 길어짐)',
    ],
    interviewTips: [
      '이벤트 소싱과 CQRS의 개념을 명확히 설명하고 활동 피드에 왜 적합한지 설명하라',
      '뉴스피드와 활동 피드의 차이점(이벤트 유형 다양성, 그룹핑 필요성)을 구분하라',
      '"이벤트를 잘못 발행했을 때 어떻게 취소하나?" — 보상 이벤트(compensating event) 패턴을 설명하라',
      '커서 기반 페이지네이션의 장점(일관성, 성능)을 오프셋 방식과 비교하여 설명하라',
    ],
    relatedTermIds: ['arch-event-sourcing', 'arch-cqrs', 'arch-message-queue', 'db-nosql', 'arch-cache'],
    diagramAscii: `
┌──────────┐ ┌──────────┐ ┌──────────┐
│Post Svc  │ │Like Svc  │ │Follow Svc│
└────┬─────┘ └────┬─────┘ └────┬─────┘
     └────────────┼────────────┘
                  ▼
         ┌────────────────┐       ┌───────────────┐
         │  Kafka Topics  │──────▶│  Event Store  │
         │ (이벤트 수집)   │       │ (Cassandra)   │
         └───────┬────────┘       └───────────────┘
                 │
        ┌────────▼────────┐
        │ Feed Generator  │
        │ + Aggregation   │
        └────────┬────────┘
                 │ push IDs
        ┌────────▼────────┐      ┌───────────────┐
        │  Feed Cache     │◀────▶│ Feed Service  │◀── Client
        │  (Redis)        │      │ (hydrate)     │
        └─────────────────┘      └───────────────┘`,
  },
]
