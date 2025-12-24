# 온라인 게임 아키텍처 문서

이 문서는 온라인 오목 게임 구현을 기반으로, 향후 장기, 오셀로, 바둑 등 다른 보드 게임을 개발할 때 재사용할 수 있는 아키텍처와 기술 스택을 정리합니다.

## 목차

1. [기술 스택](#기술-스택)
2. [아키텍처 개요](#아키텍처-개요)
3. [핵심 컴포넌트](#핵심-컴포넌트)
4. [데이터베이스 스키마](#데이터베이스-스키마)
5. [재사용 가능한 모듈](#재사용-가능한-모듈)
6. [새 게임 추가 가이드](#새-게임-추가-가이드)

---

## 기술 스택

### 프론트엔드
- **Next.js 15** (App Router, Static Export)
- **React 18** (Hooks: useState, useEffect, useCallback, useRef)
- **TypeScript** - 타입 안전성
- **Tailwind CSS v4** - 스타일링 (다크모드 지원)
- **Lucide React** - 아이콘

### 실시간 통신
- **PeerJS (WebRTC)** - P2P 게임 데이터 전송
  - 낮은 지연시간 (서버 경유 없음)
  - 1:1 대전에 최적화
  - 채팅 기능 포함

### 백엔드 (서버리스)
- **Supabase**
  - PostgreSQL - 방 목록, 통계 저장
  - Realtime - 방 목록 실시간 구독
  - pg_cron - 비활성 방 자동 정리

### 배포
- **Cloudflare Pages** - 정적 사이트 호스팅

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Omok.tsx  │  │ GameLobby   │  │   OmokBoard.tsx     │  │
│  │  (메인로직) │  │   (로비UI)  │  │   (게임보드UI)      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│  ┌──────▼────────────────▼─────────────────────▼──────────┐ │
│  │                    Custom Hooks                         │ │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  │ │
│  │  │  useGameRoom    │  │     usePeerConnection       │  │ │
│  │  │  (Supabase)     │  │     (WebRTC)                │  │ │
│  │  └────────┬────────┘  └──────────────┬──────────────┘  │ │
│  └───────────┼──────────────────────────┼─────────────────┘ │
└──────────────┼──────────────────────────┼───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│       Supabase           │  │         PeerJS               │
│  ┌────────────────────┐  │  │  ┌────────────────────────┐  │
│  │  game_rooms 테이블 │  │  │  │  WebRTC P2P 연결       │  │
│  │  - 방 목록 관리    │  │  │  │  - 게임 데이터 전송    │  │
│  │  - 통계 저장       │  │  │  │  - 채팅 메시지         │  │
│  │  - 실시간 구독     │  │  │  │  - 저지연 통신         │  │
│  └────────────────────┘  │  │  └────────────────────────┘  │
└──────────────────────────┘  └──────────────────────────────┘
```

### 통신 흐름

1. **방 생성 (호스트)**
   ```
   호스트 → PeerJS 피어 생성 → Supabase에 방 등록 (peerId 저장) → 대기
   ```

2. **방 입장 (게스트)**
   ```
   게스트 → Supabase에서 방 목록 조회 → 입장 시도 (atomic update)
         → 성공 시 PeerJS로 호스트에 연결 → 게임 시작
   ```

3. **게임 진행**
   ```
   플레이어A → PeerJS → 플레이어B (서버 경유 없음, P2P)
   ```

---

## 핵심 컴포넌트

### 1. 공통 컴포넌트 (재사용 가능)

#### GameLobby.tsx
방 목록 표시, 방 생성, 통계 표시를 담당하는 범용 로비 컴포넌트

```typescript
interface GameLobbyProps {
  rooms: GameRoom[]
  stats: RoomStats
  monthlyStats: MonthlyStats[]
  isLoading: boolean
  error: string | null
  isConfigured: boolean
  onCreateRoom: (hostName: string, isPrivate: boolean) => Promise<GameRoom | null>
  onJoinRoom: (room: GameRoom) => void
  onRefresh: () => void
  gameTitle: string
  gameDescription?: string
}
```

**기능:**
- 대기 중인 방 목록 (실시간 업데이트)
- 방 만들기 (공개/비공개 선택)
- 실시간 통계 (플레이 중, 공개방, 비공개방)
- 월별 게임 통계

### 2. Custom Hooks

#### useGameRoom.ts
Supabase 연동 훅 - 방 관리 전담

```typescript
interface UseGameRoomReturn {
  rooms: GameRoom[]
  stats: RoomStats
  monthlyStats: MonthlyStats[]
  isLoading: boolean
  error: string | null
  playerId: string
  isConfigured: boolean
  createRoom: (hostName: string, peerId?: string, isPrivate?: boolean) => Promise<GameRoom | null>
  joinRoom: (roomId: string) => Promise<boolean>
  leaveRoom: (roomId: string) => Promise<boolean>
  refreshRooms: () => Promise<void>
}

// 사용법
const { rooms, stats, createRoom, joinRoom } = useGameRoom('omok')
const { rooms, stats, createRoom, joinRoom } = useGameRoom('chess')  // 다른 게임
```

#### usePeerConnection.ts
WebRTC P2P 연결 훅 - 실시간 게임 통신 전담

```typescript
interface UsePeerConnectionReturn {
  isConnected: boolean
  peerId: string | null
  error: string | null
  lastMessage: PeerMessage | null
  createRoom: () => Promise<string | null>
  joinRoom: (hostPeerId: string) => Promise<boolean>
  sendMessage: (type: MessageType, payload: unknown) => void
  disconnect: () => void
  onDisconnect: (callback: () => void) => void
}

// 사용법
const { isConnected, sendMessage, lastMessage } = usePeerConnection()
```

### 3. 메시지 타입 (PeerJS)

```typescript
type MessageType =
  | 'move'       // 착수
  | 'chat'       // 채팅
  | 'ready'      // 게임 준비 완료
  | 'restart'    // 재시작
  | 'surrender'  // 기권
  | 'leave'      // 퇴장
  | 'gameStart'  // 게임 시작 (호스트 → 게스트)

interface PeerMessage {
  type: MessageType
  payload: unknown
  timestamp: number
}
```

---

## 데이터베이스 스키마

### game_rooms 테이블

```sql
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_name VARCHAR(50) NOT NULL,
  host_id VARCHAR(100) NOT NULL,        -- PeerJS의 peerId
  game_type VARCHAR(20) NOT NULL,       -- 'omok', 'chess', 'othello', 'baduk'
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',  -- waiting, playing, finished, closed
  is_private BOOLEAN NOT NULL DEFAULT false,
  games_played INTEGER NOT NULL DEFAULT 0,  -- 완료된 게임 수 (통계용)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_game_rooms_public_waiting
ON game_rooms (game_type, status, is_private)
WHERE status = 'waiting' AND is_private = false;

CREATE INDEX idx_game_rooms_created_at
ON game_rooms (game_type, created_at);
```

### RPC 함수

```sql
-- 게임 완료 시 카운트 증가 (atomic)
CREATE OR REPLACE FUNCTION increment_games_played(room_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE game_rooms
  SET games_played = games_played + 1, updated_at = NOW()
  WHERE id = room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 비활성 방 자동 정리 (pg_cron)
CREATE OR REPLACE FUNCTION cleanup_stale_rooms()
RETURNS void AS $$
BEGIN
  UPDATE game_rooms
  SET status = 'closed', updated_at = NOW()
  WHERE status IN ('waiting', 'playing')
    AND updated_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10분마다 실행
SELECT cron.schedule('cleanup-stale-game-rooms', '*/10 * * * *', 'SELECT cleanup_stale_rooms()');
```

---

## 재사용 가능한 모듈

### 파일 구조

```
src/
├── components/
│   ├── GameLobby.tsx          # 공통 로비 UI
│   ├── Omok.tsx               # 오목 메인 컴포넌트
│   ├── OmokBoard.tsx          # 오목 보드 UI + 게임 로직
│   ├── Chess.tsx              # [예정] 장기 메인 컴포넌트
│   ├── ChessBoard.tsx         # [예정] 장기 보드
│   ├── Othello.tsx            # [예정] 오셀로 메인 컴포넌트
│   └── OthelloBoard.tsx       # [예정] 오셀로 보드
│
├── hooks/
│   ├── useGameRoom.ts         # Supabase 방 관리 (공통)
│   └── usePeerConnection.ts   # WebRTC P2P 연결 (공통)
│
├── utils/webrtc/
│   ├── index.ts               # Export 모음
│   ├── types.ts               # 공통 타입 정의
│   ├── roomManager.ts         # Supabase 방 관리 함수
│   ├── peerManager.ts         # PeerJS 연결 관리
│   ├── supabaseClient.ts      # Supabase 클라이언트
│   └── gameChannel.ts         # 유틸리티
│
└── app/
    ├── omok/page.tsx          # 오목 페이지
    ├── chess/page.tsx         # [예정] 장기 페이지
    ├── othello/page.tsx       # [예정] 오셀로 페이지
    └── baduk/page.tsx         # [예정] 바둑 페이지
```

### 공통 타입 정의

```typescript
// types.ts
export type GameType = 'omok' | 'chess' | 'othello' | 'baduk' | string

export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'closed'

export interface GameRoom {
  id: string
  host_name: string
  host_id: string
  game_type: GameType
  status: RoomStatus
  is_private: boolean
  games_played: number
  created_at: string
  updated_at: string
}

export interface RoomStats {
  total: number
  public: number
  private: number
  waiting: number
  playing: number
}

export interface MonthlyStats {
  month: string      // YYYY-MM
  totalGames: number
  totalRooms: number
}
```

---

## 새 게임 추가 가이드

### 1단계: 게임 타입 등록

```typescript
// types.ts
export type GameType = 'omok' | 'chess' | 'othello' | 'baduk' | string
```

### 2단계: 게임 보드 컴포넌트 생성

```typescript
// ChessBoard.tsx 예시
interface ChessBoardProps {
  gameState: ChessGameState
  myColor: 'red' | 'blue' | null
  onMove: (from: Position, to: Position) => void
  disabled?: boolean
}

export default function ChessBoard({ gameState, myColor, onMove, disabled }: ChessBoardProps) {
  // 장기 보드 UI 렌더링
  // 클릭 이벤트 처리
  // 유효한 이동 표시
}

// 게임 로직 함수 export
export const createInitialGameState = (): ChessGameState => { ... }
export const checkWinner = (state: ChessGameState): 'red' | 'blue' | null => { ... }
export const isValidMove = (state: ChessGameState, from: Position, to: Position): boolean => { ... }
```

### 3단계: 메인 게임 컴포넌트 생성

Omok.tsx를 복사하여 수정:

```typescript
// Chess.tsx
export default function Chess() {
  const t = useTranslations('chess')

  // useGameRoom 훅 사용 (gameType만 변경)
  const { rooms, stats, monthlyStats, ... } = useGameRoom('chess')

  // usePeerConnection 훅 사용 (동일)
  const { isConnected, sendMessage, lastMessage, ... } = usePeerConnection()

  // 게임 상태
  const [gameState, setGameState] = useState<ChessGameState>(createInitialGameState())

  // 메시지 처리 (게임별 로직)
  useEffect(() => {
    if (!lastMessage) return
    const { type, payload } = lastMessage

    switch (type) {
      case 'move':
        // 장기 이동 처리
        break
      // ...
    }
  }, [lastMessage])

  // 나머지는 Omok.tsx와 거의 동일
}
```

### 4단계: 페이지 생성

```typescript
// app/chess/page.tsx
import Chess from '@/components/Chess'

export default function ChessPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Chess />
    </Suspense>
  )
}
```

### 5단계: 번역 추가

```json
// messages/ko.json
{
  "chess": {
    "title": "온라인 장기",
    "description": "친구와 실시간으로 장기 대전을 즐기세요.",
    // ...
  }
}
```

### 6단계: 메뉴 등록

```typescript
// menuConfig.ts
{
  href: '/chess',
  labelKey: 'footer.links.chess',
  descriptionKey: 'toolsShowcase.tools.chess.description',
  icon: '♟️'
}
```

---

## 구현된 기능 체크리스트

### 핵심 기능
- [x] 방 생성/입장/퇴장
- [x] 실시간 방 목록 업데이트
- [x] P2P 게임 통신 (WebRTC)
- [x] 1:1 채팅
- [x] 공개/비공개 방
- [x] 직접 입장 (Peer ID로)

### 게임 규칙
- [x] 오목 승리 판정 (5목)
- [x] 쌍삼(3-3) 금수 (렌주 룰, 흑돌만)
- [x] 기권/재시작

### UX
- [x] 토스트 알림 (alert 대체)
- [x] 실시간 통계 (플레이 중, 대기 중)
- [x] 월별 게임 통계
- [x] 다크모드 지원
- [x] 반응형 디자인

### 안정성
- [x] 동시 입장 방지 (atomic update)
- [x] 연결 끊김 감지 및 처리
- [x] 비활성 방 자동 정리 (30분)
- [x] Heartbeat (5분마다)

### 통계/기록
- [x] 게임 완료 횟수 기록
- [x] 월별 통계 조회
- [x] 방 삭제 대신 closed 상태로 보존

---

## 향후 게임 개발 계획

| 게임 | GameType | 보드 크기 | 특이사항 |
|------|----------|-----------|----------|
| 오목 | `omok` | 19x19 | 쌍삼 금수 (완료) |
| 장기 | `chess` | 9x10 | 기물 이동 규칙 복잡 |
| 오셀로 | `othello` | 8x8 | 돌 뒤집기 로직 |
| 바둑 | `baduk` | 19x19/13x13/9x9 | 집 계산, 따내기 |

---

## 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 참고 자료

- [PeerJS Documentation](https://peerjs.com/docs/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
