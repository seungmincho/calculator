# 20A 음력 기념일 저장·복사 복구

2026-11-17 KST. 담당 `/root/taxi_repeat`. 19차 체크포인트 뒤 부모를 연결했다. 원 음력 변환 엔진과 대체 규칙은 변경하지 않았다. 독립 검토를 통과했고 실제 브라우저 검증은 담당자가 진행 중이며 빌드·배포는 하지 않았다.

## 적용 범위

- `LunarSavedAnniversaries.tsx`: 현재 변환 쌍의 원 음력 날짜와 이름만 명시 저장한다. 이름 40자·12개 제한, 원 연도·윤달 보존, 다음 양력 날짜와 대체 여부 별도 표시, 명시 불러오기 확인, 이름 변경·삭제 확인, 다시 읽기, 대기 작업 취소를 제공한다. 같은 이름은 별도 항목이며 id로 변경한다.
- root가 준비한 `lunarSavedAnniversaries.ts`와 `check-lunar-saved-anniversaries.ts`는 수정 없이 사용한다. 저장 key는 `toolhub:lunar-anniversaries:v1`, exact v1 envelope와 revision, strict 날짜 검증, raw CAS/readback, Web Locks 및 AbortSignal을 사용한다.
- 손상·미지원·접근 차단·quota에서는 낙관적 성공/목록 변경을 하지 않는다. post-write 확인 불가는 `unverified` 문구로 구분하며 기존 데이터가 전혀 바뀌지 않았다고 주장하지 않는다. Web Locks에 참여하지 않는 다른 코드까지 localStorage 원자성을 보장하지 않는다.
- `LunarConverter.tsx`: 초기 URL 복원은 기존 today guard를 유지한다. 저장본은 자동 적용하지 않는다. 명시 불러오기는 원 날짜와 `lunarToSolar` 모드를 적용하고 ICS child key를 증가시킨다. 동일 저장본을 다시 불러와도 새 key를 쓴다. 이름 변경·삭제는 부모 입력을 변경하지 않는다.
- `LunarAnniversaryCalendar.tsx`: 선택적 `initialTitle`과 사용자 편집 통지 `onEdit`을 추가했다. 부모 key 재생성으로 새 이름을 처음 제목으로 쓰고 연도는 미선택이다. 제목/연도 선택을 사용자가 바꾸면 부모 입력 세대도 갱신해 대기 중인 불러오기를 취소한다. 초기 제목 적용과 remount는 편집 통지를 하지 않는다. 기존 11개년 계산·ICS/UID/escape/fold·파일명·늦은 SHA 방지는 유지한다.
- `LunarCopyRecovery.tsx`: 결과/표 복사 실패에 해당 텍스트의 읽기 전용 선택, 재시도, 닫기를 제공한다. 부모는 두 대상을 하나의 request 세대로 처리하고 입력/복원/번역 문구 변경 및 언마운트 후 늦은 완료를 무효화한다. Clipboard 거부/API 없음 후 legacy가 실제 true일 때만 성공이다. OS에 넘긴 Clipboard write 자체를 취소할 수 있다는 뜻은 아니다.
- 새 패널은 기존 결과와 연도표 뒤에 배치했고 입력 카드에 바로가기 링크를 제공한다. 제어는 44px, 입력은 16px, 기존 모바일 연도 선택 폭을 유지한다.
- 번역 조각은 `translations-lunar.json`의 ko/en `lunarConverter.savedAnniversaries`와 `copyRecovery`다. 원본 messages·메타·메뉴·생성물은 통합 담당이 반영한다.

## 자체 검증

| 명령 | 결과 |
|---|---|
| `node scripts/check-lunar-saved-anniversaries.ts` | 9개 그룹 PASS: 원 윤달/30일 대체/지원 범위/strict schema/revision/12개/40자/CAS/quota/blocked/readback/취소 |
| `node docs/verify/2026-11-17-repeat-batch20/check-lunar-saved-ui.mjs` | 실제 부모·child event harness 7개 그룹 PASS |
| `node scripts/check-lunar-anniversary-calendar.ts` | 기존 ICS 15개 그룹 PASS |
| `npx eslint src/components/LunarConverter.tsx src/components/LunarSavedAnniversaries.tsx src/components/LunarCopyRecovery.tsx src/components/LunarAnniversaryCalendar.tsx src/utils/lunarSavedAnniversaries.ts scripts/check-lunar-saved-anniversaries.ts` | exit 0, 오류·경고 0 |

UI 7그룹은 원 날짜와 대체 표시/명시 load, rename·delete 부모 불변, quota·손상 시 이름/원문 유지, lock 대기 중 입력 변경·취소·unmount, 공유 URL 우선과 원년·윤달/ICS 제목·미선택, 두 복사 대상의 API 없음/거부×legacy false/throw/true, 다른 대상 복사 뒤 늦은 거부와 입력 변경 뒤 늦은 성공을 검사했다. 테스트는 19차 event harness를 재사용하며 실제 브라우저 동작을 모두 대체한다는 의미는 아니다.

기존 부모의 17차 lint 4개 baseline 기록은 알고 있으며 해당 effect 본문을 확대 수정하지 않았다. 이번 scoped 명령의 최종 출력은 오류·경고 0이었다. 전체 타입 검사는 검증 종료 후 통합 담당이 수행한다.

독립 검토에서 lock 대기 중 ICS 제목/연도 편집이 부모 입력 세대에 빠진 P2를 재현했다. 위 `onEdit` 통지로 최소 보완했고 기존 actual UI 7그룹과 영향 부모/ICS lint를 재실행해 통과했다. 독립 담당의 `check-lunar-independent.mjs Editing` 영향 1그룹에서 두 편집의 AbortSignal 취소·원 입력/편집 보존·늦은 완료 무효화·이후 새 확인 정상 load까지 PASS했다. 앞서 통과한 7그룹을 다시 집계하지 않아 해당 독립 검사는 총 8그룹이다.

별도 독립 4그룹은 actual child unverified/refresh, 두 actual 패널 WebLock/CAS·재시도, storage event 없이 load 대기 중 raw 변경, 동일 기록 재load key·ICS 제목/미선택·이전 SHA 무효화를 확인했다. 상세는 독립 보고서에 기록한다.

최종 실제 브라우저 음력 7개 사례를 통과했다. 추가 영향 사례는 native WebLock 대기 중 제목 변경·연도 선택·전체 해제 뒤 원 입력/달력 편집 보존과 새 명시 load 정상 적용을 확인했다. 전체 타입 검사에서 Selection의 kind union을 action union으로 넘기는 TS2345 1건이 발견되어 load/rename/delete 객체를 명시 분기했다. 강제 단언 없이 호출 형태만 보완했으며 기존 load 1그룹·rename/delete 1그룹만 재실행해 PASS했다. 최종 타입 재검사는 통합 담당이 담당한다.

## 브라우저 식별자

- `#lunar-saved-anniversaries`, `[data-lunar-anniversary-name]`, `li[data-lunar-anniversary]`
- `현재 음력 날짜 저장`, `불러오기` → `현재 입력 바꾸고 불러오기`, `이름 변경` → `이름 변경 저장`, `삭제` → `기념일 삭제`
- `저장 목록 다시 읽기`, `대기 작업 취소`
- `[data-lunar-copy="result|table"]`, `[data-lunar-copy-recovery="result|table"] textarea[readonly]`

지원 범위 밖 다음 기념일은 계산 불가로 표시한다. 목록은 화면에서 사용하는 기존 local browser 오늘 날짜를 전달받으며 새로운 자정 갱신 정책을 도입하지 않았다. 원 날짜의 의미를 생년·나이·제사 방식으로 추정하지 않는다.
