# 20A 음력 기념일 저장 — API·도메인 설계

2026-11-17 KST. root가 파일/API 방향과 revision 포함을 승인했다. 아래는 구현 전 합의한 설계다. 19차 체크포인트 뒤 부모 연결까지 완료했으며 실제 파일·검증 현황은 [구현 기록](./lunar-implementation.md)을 참고한다.

## 제안 소유 파일

- `src/utils/lunarSavedAnniversaries.ts`: strict parse/read, 원 날짜 검증, 순수 목록 변경, 다음 발생일 조회, CAS/readback, Web Locks wrapper.
- `src/components/LunarSavedAnniversaries.tsx`: 이름 입력/12개 목록/불러오기 확인/이름 변경/삭제/다시 읽기.
- `scripts/check-lunar-saved-anniversaries.ts`: 원 날짜 보존·범위·저장 실패·경합 검사.
- `LunarConverter.tsx`: 현재 변환 쌍 전달, 원 음력 입력 적용, ICS loadRevision 전달, 기존 복사 실패 복구의 최소 연결.
- `LunarAnniversaryCalendar.tsx`: 선택 연도 초기화와 명시 제목 적용을 위한 선택적 `initialTitle`만 추가한다. 나머지 ICS 계산·파일 생성은 유지한다.
- ko/en 조각: `translations-lunar.json`의 `lunarConverter.savedAnniversaries` 및 필요한 `copyRecovery`만 작성하며 공용 원본은 통합 담당이 반영한다.

## 저장 구조

키: `toolhub:lunar-anniversaries:v1`.

```json
{
  "version": 1,
  "revision": "새 저장마다 갱신하는 토큰",
  "anniversaries": [
    {
      "id": "고정 식별자",
      "name": "기념일 이름",
      "lunar": { "year": 2025, "month": 6, "day": 10, "isLeap": true }
    }
  ]
}
```

최대 12개, 이름은 trim 후 1~40자다. 이름은 표시 문자열이고 식별/변경/삭제는 id로 한다. 중복 id는 거부하며 이름으로 자동 덮어쓰지 않는다. 목록/필드별 정확한 키만 허용하고 id/revision의 길이·문자, 이름의 제어문자, 정수 날짜·boolean을 검증한다. raw 길이 상한은 20,000자로 둔다. 처음 저장 키가 없으면 빈 목록/`revision:null`로 읽고 첫 명시 저장 때 envelope를 만든다. 마지막 항목 삭제 후에도 새 revision을 가진 빈 envelope를 저장한다.

모든 add/rename/delete는 새 revision을 만든다. 이전 raw로 돌아가는 변경도 revision이 달라 오래된 snapshot이 같다고 오인하지 않게 한다. 새 revision은 쓰기 전에 생성해 순수 검사에서 주입 가능하게 하고 현재 revision과 같은 값은 거부한다.

저장 대상은 실제 현재 `pair.lunar`에서 명시적으로 복사한 원 연도·월·일·윤달 여부다. 변환된 양력 날짜, ‘올해’의 대체 날짜, 계산 결과, 다음 발생일, ICS 선택 연도는 저장하지 않는다. 나이·제사 방식·관계·생년의 의미를 추정하지 않는다.

## 작은 API

| API | 계약 |
|---|---|
| `isSavedLunarDate(value)` | exact keys와 year/month/day 정수·isLeap boolean을 먼저 검사한다. `isValidLunar` 및 `lunarToSolar(...) !== null`을 모두 만족해야 한다. 음력상 날짜가 존재해도 지원 양력 범위를 넘으면 저장하지 않는다. |
| `parseLunarAnniversaries(raw)` | null이면 ready 빈 snapshot. 정상 v1이면 raw/revision/records를 반환한다. 손상·미지원·과대 원문은 전체 거부하고 필터링/부분 복구/자동 쓰기를 하지 않는다. |
| `readLunarAnniversaries(storage?)` | 접근 차단을 분리하고 위 parser에 위임한다. 목록을 읽는 것만으로 수정하거나 현재 날짜를 불러오지 않는다. |
| `nextSavedLunarAnniversary(record, today)` | 검증된 원 날짜의 month/day/isLeap와 현재 화면 today를 기존 `nextLunarAnniversary`에 전달한다. 원 year는 기록 표시/유효한 윤달 기준을 보존하며 다음 발생일의 year로 바꾸지 않는다. 반환값에는 기존 대체 flags를 그대로 둔다. null이면 미지원으로 표시한다. |
| `writeLunarAnniversaryAction(snapshot, action, revision, storage?)` | action은 add/rename/delete. 현재 raw와 snapshot을 비교하고 최신 목록에서 변경 대상을 찾는다. 모든 입력/다음 목록 검증 후 새 envelope를 쓴다. readback을 확인한 경우에만 성공을 반환한다. |
| `readLunarAnniversaryForLoad(snapshot, id, storage?)` | 확인을 승인한 직후 최신 raw/revision을 다시 읽어 목록이 그대로인지 확인한다. 바뀌거나 사라졌으면 재조회 오류다. 최신 검증본을 복사해 반환하며 쓰기는 하지 않는다. |
| `withLunarAnniversariesLock(action)` | 지원 브라우저에서는 같은 저장 키의 exclusive Web Lock 안에서 최신 read/CAS/write/readback을 실행한다. 미지원에서는 같은 동기 CAS/readback을 사용한다. |

쓰기 전 conflict와 쓰기 후 확인 불가(`unverified`)는 구분한다. 후자는 ‘덮어쓰지 않았다’고 보장하지 않고 ‘저장 결과를 확인할 수 없으니 목록을 다시 읽기’로 안내한다. Web Locks를 사용하지 않는 다른 탭/예전 코드까지 localStorage 원자성을 보장하지 않는다. quota/접근 차단/손상/미지원/확인 실패에서는 성공 안내나 목록의 낙관적 교체를 하지 않는다.

## 불러오기와 17차 ICS 경계

1. 공유 URL 초기 복원이 끝날 때까지 저장/불러오기 액션을 막고 저장본은 자동 적용하지 않는다.
2. ‘불러오기’는 이름과 원 음력 날짜를 보여 준 뒤 현재 입력을 교체한다는 확인을 받는다. 현재 입력 fingerprint와 선택 id/raw/revision을 캡처한다.
3. 확인 대기 중 입력/새 선택/목록/언마운트가 바뀌면 token을 무효화한다. 확인 후 최신 저장본과 token을 모두 재검사한다. 필요하다면 lock 대기 뒤에도 같은 검사를 한다.
4. 원 `year/month/day/isLeap`를 그대로 넣고 mode는 `lunarToSolar`로 바꾼다. 예를 들어 원 윤달 날짜가 2025년이면 2026년으로 바꾸지 않아 부모의 기존 윤달 보정이 원 기록의 윤달을 없애지 않는다.
5. 부모의 `calendarLoadRevision`을 증가시키고 `calendarInitialTitle = record.name`을 설정한다. ICS child는 이 revision을 key로 사용하고 `initialTitle`로 처음 제목만 받는다.
6. 같은 저장본을 다시 불러와도 key가 달라 제목이 적용되고 연도는 전부 미선택으로 시작한다. 이전 child의 pending SHA 작업은 기존 unmount guard로 무효화한다. 반출 연도를 자동 선택하지 않는다.
7. 이름 변경/삭제/다시 읽기는 현재 변환 입력·ICS 제목·선택을 바꾸지 않는다. 불러온 뒤에는 사용자가 ICS 제목을 편집할 수 있으며 부모의 일반 렌더가 이를 다시 덮지 않는다.

현재 local browser 날짜 기준과 원래 11개년표/D-day/공유 URL은 유지한다. 이 기능은 여러 사람을 한 ICS에 자동으로 합치지 않는다.

## 도메인 검사 초안

- 원 `{year:2025,month:6,day:10,isLeap:true}`를 저장·불러와 그대로 유지한다. today 2026-01-01에서 다음 날짜는 기존 엔진의 2026-07-23, `leapFallback:true`지만 원 날짜는 변하지 않는다.
- 원 `{year:2024,month:2,day:30,isLeap:false}`는 유효하며 today 2026-01-01에서 다음 날짜 2026-04-16, `dayFallback:true`다. 원 day는 30으로 남는다.
- 첫 지원 날짜 음력 1900-01-01/양력 1900-01-31, 마지막 지원 음력 2050-11-18/양력 2050-12-31을 허용한다. 2050-11-19와 2050-12월 등 실제 변환 null은 거부한다.
- 해당 원 연도에 없는 윤달, 소수/문자 숫자/잘못된 boolean, 존재하지 않는 30일, 추가 필드, 중복 id, 13개, 이름 빈칸/41자, 과대 raw, future version을 검증한다.
- add/rename/delete마다 revision이 바뀌고 저장 키가 없던 stale 탭도 마지막 삭제 후 빈 목록을 조용히 덮지 못한다.
- 손상/미지원에서 write 0회, quota/blocked와 readback mismatch 구분, stale raw·실제 동시 Web Lock 쓰기, 취소/언마운트 뒤 대기 작업을 확인한다.
- 명시 불러오기 뒤 원 윤달·ICS 이름·연도 미선택·이전 pending 다운로드 취소, 이름 변경/삭제 후 현재 입력 그대로를 실제 UI 검사에 포함한다.
- 복사 실패 복구는 기존 result/table 두 대상에 현재 텍스트의 읽기 전용 선택 영역을 제공하고 최신 요청/입력 세대를 검사한다. 변환/표 데이터 형식은 바꾸지 않는다.

위 fixture는 이후 root 도메인 9개 그룹 및 제품 UI 검사에 반영했다. 실제 검증 범위는 구현 기록에 구분했다.
