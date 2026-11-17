# 17차 목표 조건·음력 기념일 독립 검토

담당: writing_versions. 2026-11-17 KST. [실행 계약](plan.md)을 기준으로 제품 파일을 수정하지 않고 API·순수 로직·상태 경계를 독립 검토한다. Chrome·전체 타입 검사·빌드·배포는 실행하지 않는다.

## 상태

최종 독립 **26그룹 통과**: A 수능 목표 15그룹, B 음력 캘린더 11그룹. 부모 연결 완료본과 마지막 탐구 allowlist 보완을 확인했다. 재현 가능한 추가 제품 결함이나 변경 요청은 없다. 제품 작성자의 자체 검사 및 별도 담당자의 브라우저 11/11 결과와 이 독립 결과를 구분한다.

## A. 목표 조건 계약

- `evaluateCsatGoal(snapshot, { areas, maxSum })`를 목표 패널·기존 일회성 최저·hero의 3합에 공통 적용한다. areas는 2/3/4, 상한은 areas~areas×9다.
- 국어·수학·영어·탐구의 4개 영역만 센다. 빈칸/유효하지 않은 점수는 0점이나 9등급으로 채우지 않는다. 필요한 영역 수가 모자라면 입력 필요 상태다.
- 탐구 두 슬롯은 한 영역이다. 같은 과목의 서로 다른 유효 점수는 conflict로 제외·안내하며 같은 점수 또는 한 슬롯만 유효하면 한 과목으로 계산한다.
- 결과에 현재 입력된 영역 기준과 실제 사용 영역을 표시한다. 목표 최대 6개·이름 40자·별도 저장 키 `toolhub-csat-goals-v1`; 점수 기록과 URL 목록을 변경하지 않는다.

## B. 음력 캘린더 계약/API 대조

- `selectLunarCalendarOccurrences(spec, lunarYears)`는 음력 월/일/윤달 여부와 선택 연도 1~11개를 검증하고 기존 `lunarAnniversary`를 호출한다. 미지원 날짜 하나라도 있으면 전체 선택을 거부한다.
- `createLunarAnniversaryCalendar(input, describe, now)`는 연도별 개별 종일 VEVENT와 배타적 다음날 DTEND를 만든다. RRULE을 만들지 않으며 한국어/영어 description callback에 원 음력 조건·대체 flags를 제공한다.
- 제목 100자, 선택 연도 중복/범위/정수 검사, 제어문자·잘못된 surrogate 거부, 텍스트 escaping과 UTF-8 줄 접기를 사용한다. UID는 제목·원 음력 조건·선택 음력 연도·계산 양력 날짜를 기반으로 생성한다.
- 자식 props는 `spec`, `startLunarYear`, `today`다. 제목·연도 선택은 자동 저장/URL 반영하지 않으며 기본 미선택, 명시적 다운로드만 제공한다. 시작 연도로부터 11개 후보 중 변환 불가 연도는 비활성화한다.
- 자식 generation 가드는 source/title/selection/locale 변경과 unmount 후 오래된 digest 완료가 파일을 내려받지 않도록 한다. 화면의 today는 지난 날짜 표시용이며 선택한 과거 날짜를 미래로 이동시키지 않는다.

## 독립 실행 결과

| 검사 파일 | 통과 그룹 | 주요 근거 |
| --- | ---: | --- |
| `check-goals-independent.ts` | 4 + 후속 1 | 독립 산술 oracle로 6,561개 4영역 등급 조합 × 2/3/4영역의 합·정확 상한/1 초과를 대조. 잘못된 점수와 실제 0·빈칸, 같은 탐구 상충/동일값, strict 저장 형태 및 readback 불확실 처리. 후속 1그룹은 `english`/`korLm`을 탐구로 주입했을 때 제외하는 allowlist 변경만 실행. |
| `check-goals-component.cjs` | 6 | 실제 자식의 URL readiness, 명시 저장/수정/삭제, 현재 점수 보존, lock 대기 중 입력 변경과 이전 완료, 취소·unmount·storage event, quota·readback·재조회, 두 reader의 stale CAS, 손상/미지원 형식과 조건 범위. |
| `check-goals-integration.cjs` | 4 | 실제 부모에서 빈 URL 입력 필요, 부분 점수/점수기록 복원에 따른 최소합·hero·share 동기화, 동일 탐구 충돌의 저장목표/일회성 결과 일치, 실제 공통 평가뷰의 ko/en 영역·안내 문구. |
| `check-lunar-independent.ts` | 4 | 별도 ICS parser로 CRLF/75 UTF-8 octet folding/TEXT decoding/개별 종일 날짜/배타적 다음날 종료 확인. 원 계산 엔진의 윤달/30일 대체와 지원 끝 연도, 선택 전체 거부, 텍스트 주입 방지, async snapshot·UID 안정성. |
| `check-lunar-component.cjs` | 5 | 실제 자식의 기본 미선택→명시 2연도 다운로드, 지원 불가 행, digest 대기 중 source 변경·늦은 실패·unmount, 중복 클릭과 anchor 실패, object URL 해제 및 요청 메시지. |
| `check-lunar-integration.cjs` | 2 | 실제 부모의 선택 음력 조건·현재 음력 연도부터 11년 창·로컬 today 전달, 기존 표 복사/ShareResult/D-day, 모드 전환과 URL 재방문 보존. |

모두 `node docs/verify/2026-11-17-repeat-batch17/<파일명>`으로 실행했다. 마지막 allowlist 보완만 `node docs/verify/2026-11-17-repeat-batch17/check-goals-independent.ts allowlist`로 한정해 추가 실행했으며 앞선 4그룹 전체를 반복하지 않았다. Node의 기존 package module-type 추론 경고 외 오류는 없다. TypeScript 검사/Chrome/빌드/배포는 이 담당자가 실행하지 않았다.

## 경계와 해석

1. ICS를 별도 parser로 읽어 개별 DATE/다음날 종료·CRLF·75 UTF-8 octet 접기·한글/emoji/이스케이프 복원을 확인한다. [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545)의 content line·TEXT·VEVENT 날짜 규칙을 참고한다.
2. 기존 계산 엔진의 선택 결과가 날짜/대체 설명에 그대로 반영되는지, 마지막 지원 날짜의 다음날 종료와 미지원 선택 전체 거부를 확인한다. 기존 음력 변환 정확성 전체를 이번 변경으로 새 인증하지 않는다.
3. digest 대기 중 source 변경·unmount의 늦은 성공/실패, 다운로드 요청 후 메시지·object URL 해제를 실제 컴포넌트 하네스로 확인한다.
4. 부모의 today는 기존 브라우저 로컬 날짜, 시작 연도는 그 날짜의 음력 연도다. 선택한 생년의 음력 연도와 내보낼 연도 창을 혼동하지 않는다. 기존 D-day는 화면/공유 행의 값이며 별도 D-day 도구 링크를 새로 제공하는 기능은 아니다.
5. 수능 목표는 유효한 입력 영역만 비교하고 대학별 모집요강을 판단하지 않는다. 기존 평균 계산·원점수 컷 수치 전체를 이번 변경으로 새 검증한 것으로 확대하지 않는다. `hist`는 목표 영역 수에서 제외하며 불완전한 입력의 평균 표시는 기존 기능 범위다.
6. Web Locks가 지원되면 쓰기를 직렬화한다. 미지원 환경의 raw CAS/readback은 완전한 탭 간 원자성을 보장하지 않는다. quota/setItem 실패 시 원본·입력을 보존하며, 쓰기 이후 readback 실패는 이미 저장됐을 가능성을 유지하고 성공/rollback을 단정하지 않는다.

검사 준비 중 수정한 두 하네스 기대값은 제품 결함이 아니다. 네이티브 digest 완료를 단일 setImmediate로 기다린 가정을 명시 polling으로 보완했고, 부모 D-day 확인은 존재하지 않는 `/dday-calculator/` 링크가 아니라 실제 기존 공유 행의 D-day 값으로 바로잡았다. 브라우저 레이아웃·실제 파일 다운로드는 별도 검증 담당 결과를 참조한다.
