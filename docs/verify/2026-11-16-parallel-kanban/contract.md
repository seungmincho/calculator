# 병렬 구현 계약 — 회의록 → 칸반

사용자가 멀티 에이전트 병렬 구현을 요청했다. 기존 도구 개선의 다음 후보를 진행한다. 빌드·배포·커밋 금지. 기존 변경 보존. npm, 디자인 토큰, 44px 조작·16px 입력, custom useSearchParams·useHydrated. 신규 경로·서버·생성 모델 없음.

## 파일 소유권

- domain: `src/utils/meetingKanban.ts`, `scripts/check-meeting-kanban.ts`
- meeting_ui: `src/components/MeetingMinutes.tsx`, `src/components/MeetingActionExportPanel.tsx`, `src/utils/meetingMinutes.ts`의 선택적 `kanbanSourceId` 타입/검증만, `translations-meeting.json`
- kanban_ui: `src/components/KanbanBoard.tsx`, `src/components/KanbanMeetingImportPanel.tsx`, `translations-kanban.json`
- verification: `scripts/check-meeting-kanban-browser.mjs`, `review.md`. 다른 제품 파일 직접 편집 금지, 발견 사항 메시지.
- root: messages/ko.json·en.json 병합 및 생성, 메뉴·페이지 메타데이터, 인계·최종 검증. 각 UI 에이전트는 자기 번역을 `{ko: {namespace: {...추가키}}, en: {...}}` 형식으로 이 폴더에 제공. 기존 원본 JSON은 root만 쓴다.

## `src/utils/meetingKanban.ts` API

```ts
export type TaskStatus = 'pending' | 'in-progress' | 'done'
export interface MeetingTask { id: string; task: string; assignee: string; dueDate: string; status: TaskStatus }
export interface MeetingKanbanHandoff {
  id: string; source: 'meeting-minutes'; meetingId: string; meetingTitle: string;
  createdAt: number; items: MeetingTask[]
}
export const MEETING_KANBAN_KEY = 'toolhub-meeting-kanban-v1'
export const KANBAN_STORAGE_KEY = 'kanban-board-state'
export function createMeetingKanbanHandoff(meetingId: string, title: string, items: MeetingTask[], now?: number): MeetingKanbanHandoff
export function parseMeetingKanbanHandoff(raw: string | null, now?: number): MeetingKanbanHandoff | null
export function openMeetingKanbanHandoff(payload: MeetingKanbanHandoff): void
export type Priority = 'high' | 'medium' | 'low'
export type ColorLabel = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'orange' | 'gray'
export interface KanbanCard { id: string; title: string; description: string; priority: Priority; color: ColorLabel; dueDate: string; createdAt: number; assignee?: string; meetingSource?: { meetingId: string; actionId: string; meetingTitle: string } }
export interface KanbanColumn { id: string; title: string; cards: KanbanCard[] }
export interface KanbanState { version: 1; columns: KanbanColumn[] }
export type MeetingImportTarget = { kind: 'new-columns'; titles: Record<TaskStatus, string> } | { kind: 'existing'; columnIds: Record<TaskStatus, string> }
export function parseKanbanState(raw: string | null): KanbanState | null
export function importMeetingTasks(state: KanbanState, payload: MeetingKanbanHandoff, target: MeetingImportTarget): { state: KanbanState; added: number; skipped: number }
export function persistKanbanState(storage: Pick<Storage, 'getItem'|'setItem'>, state: KanbanState, expectedRaw: string | null): string
```

## 요구사항

- 최대 50개 선택·총 업무 본문 30,000자. 제목 최대 120자(회의록 제목이 더 길면 사용자에게 수정 안내), 담당자 120자. 본문 한 항목 최대 6,000자. 날짜는 빈값 또는 유효 YYYY-MM-DD. 유효하지 않은 항목은 조용히 버리지 말고 UI에 명시.
- sessionStorage 전달(유효 10분), 새 탭 `about:blank`를 사용자 클릭에서 열고 opener=null, 그 탭에만 payload 넣고 `/kanban-board/?from=meeting` 이동. 원문 URL 금지. 팝업·저장소 실패 처리. 원본 회의록 탭 유지.
- 회의록에 선택적 `kanbanSourceId`를 생성·저장해 안정적 회의 ID로 사용. `meetingId+actionId`로 칸반 기존 카드 중복 방지. 같은 일을 다시 보내도 칸반 편집 내용은 덮어쓰지 않는다. 카드를 직접 삭제한 뒤 다시 가져오는 것은 허용.
- 새 열 모드: 상태별로 새 열을 덧붙임. 항목이 없는 상태/모두 중복이면 빈 열 추가 금지. 기존 열 모드: 사용자가 상태별 목적 열을 선택, 임의로 열 의미 추정 금지. 기존 카드/열/원본 객체 보존.
- 담당자·기한·상태 보존. 새 우선순위는 medium(추정 아님·UI에 안내). 긴 업무 본문은 제목만 짧게 표시하더라도 description에 전체 본문을 보존.
- 이전 v1 보드(assignee/meetingSource 없는 카드) 호환. 손상된 데이터·새로운 버전은 덮어쓰지 않는다. 저장 실패·다른 탭 충돌 시 성공 표시 금지/가져오기 유지. 빈 보드 저장도 가능해야 한다.
- 기존 JSON 가져오기/내보내기, 카드 편집/드래그 유지. 휴대폰에서도 편집·열 이동을 눈에 보이는 조작으로 제공. 자동 역방향 동기화 없음, 복사본임을 안내.
- 가져오기 성공/닫기 시 session payload와 from 쿼리 제거. 카드 source로 새로고침·재전달 중복 방지. 내장 기본 샘플은 첫 브라우저 로드 후에만 생성해 hydration 일치.

함수 실패 코드 예: `invalidSelection`, `invalidPayload`, `invalidBoard`, `invalidTarget`, `conflict`, `popupBlocked`, `handoffFailed`. 변경이 필요하면 담당자끼리 메시지로 합의하고 root에 알린다.
