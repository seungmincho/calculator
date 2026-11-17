# 20차 완료 — 음력 기념일·말하기 기록

2026-11-17 KST, 미배포. 기존 두 도구의 구현·공용 통합·독립 28그룹·브라우저 14/14·전체 타입 검사를 완료했다. native IDB 중단 안내와 대기 중 음력 불러오기/ICS 편집 경합을 수정·재검증했고, 최종 타입 검사에서 드러난 요청 객체의 union 좁히기 오류도 영향 검사 후 해결했다. 빌드·배포·커밋·푸시는 하지 않았다.

## 달라진 동작

- 음력 변환기는 원 음력 연도·월·일·윤달을 이름 40자·최대 12개로 저장한다. 목록에서 다음 양력 기념일과 대체 여부를 확인하고, 명시 불러오기 확인 후에만 현재 입력과 ICS 제목을 적용한다. 캘린더 연도는 다시 선택하며 이름 변경·삭제는 현재 입력을 유지한다. 결과/연도표 복사 실패에는 수동 선택과 재시도를 제공한다.
- 최초 공유 URL이 저장본보다 우선이다. 잠금 대기 중 날짜·ICS 제목·연도 편집은 오래된 불러오기를 무효화한다. 손상/미지원/접근 차단/용량·다른 탭 충돌을 조용히 덮지 않으며, 쓰기 뒤 readback 실패는 실제 저장 가능성을 구분해 확인 불가로 안내한다. 기존 날짜 변환과 17차 ICS 규칙을 유지했다.
- 말하기 연습실은 선택적 이름 40자와 이름/모든 take 전사문 검색, 전체/자기소개/업무 보고 필터를 제공한다. 기존 이름 없는 v1 기록·Blob·모든 take·feedback을 유지하며 읽기만으로 마이그레이션하지 않는다.
- 말하기 저장/삭제는 같은 IndexedDB readwrite transaction 안에서 캡처한 기준을 비교한다. 새 revision은 commit 결과에서 반영하고 저장 완료와 목록 재조회 실패를 구분한다. 늦은 저장 완료는 최신 편집을 덮지 않으며, 목록 재조회만으로 현재 편집 기준을 바꾸지 않는다. 이름은 TXT에 포함하고 기존 요약 URL에는 넣지 않는다.
- ko/en 조각·showcase를 병합하고 두 page metadata/OG/Twitter/JSON-LD를 같은 description 상수로 맞췄다. 음력 FAQ·featureList와 말하기 featureList를 보완했다. 메뉴 updatedDate는 모두 2026-11-17이며 RSS·redirects·llms를 재생성했다. 기존 경로/OG 이미지/모델 동의 흐름은 유지한다.

## 검증 근거

| 범위 | 결과 |
| --- | --- |
| 음력 자체 | 도메인 9·실제 UI 이벤트 7·기존 ICS 15그룹 PASS. 마지막 타입 보완 후 기존 load 및 rename/delete 영향 2그룹만 재확인 |
| 말하기 자체 | 신규 도메인 11·기존 말하기 18그룹 PASS |
| 독립 검토 | writing 20그룹(초기 19 + native abort 순서 1), gpa 음력 교차검토 8그룹(초기 7 + ICS 편집 경합 1), 합계 28그룹 PASS. 기존 영향 재실행은 중복 집계하지 않음 |
| 실제 브라우저 | 14/14 PASS(음력 7·말하기 7), JS pageerror·hydration·unhandled rejection 0. checkedAt 2026-11-16T16:59:26.070Z, Chrome 종료 |
| 번역 | patch leaf 77개/언어, 정적 사용 325개, 오류 0. 동적 키는 prefix 검사와 실제 렌더로 보완. 생성본 1,578개 일치 |
| namespace | apply 추가 0, audit own 522·via child 6·미해결 0, 기존 동적 안내 60개 |
| lint | 음력 제품/검사 6파일, 말하기 5파일, 수정 영향 파일, 공용 두 page/menu 모두 오류·경고 0 |
| 전체 타입 | node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit 최종 exit 0. 02:02:19 KST 메모리 확인 6.23GiB, Chrome 종료·TS 작성 정지 후 실행 |
| diff | 제품·공용·생성물·보고서/인계 범위 git diff --check 통과 |

[음력 구현](lunar-implementation.md) · [말하기 설계/준비](speaking-records-design.md) · [독립 20그룹](independent-review.md) · [음력 교차 독립 8그룹](independent-lunar.md) · [브라우저 검토](review-browser.md) · [정적 번역](i18n-static.json) · [통합 결과 JSON](integration-checks.json).

교차 검토는 1900~2050년의 원 날짜 357개와 기존 엔진을 대조해 원 연도·윤달·월말 보존을 확인했다. 천문학적 원자료 전체의 새 인증을 주장하지 않는다. 브라우저에서는 실제 두 탭 Web Locks·IndexedDB transaction과 기존 v1 Blob/feedback을 확인했다. 원 윤달 2025년 6월10일의 2026년 대체 날짜 ICS를 실제 내려받아 DTSTART 20260723·DTEND 20260724, 제목·대체 설명·CRLF·UTF-8 75바이트 접기·UID를 독립 파싱했다.

말하기 TXT에는 이름과 두 take·기존 feedback이 있었고 WAV 다운로드는 합성 fixture의 1,644바이트와 정확히 일치했다. 저장 대기 후 새로 편집한 원고·이름은 현재 화면과 dirty 상태에 남았으며 다음 저장은 commit된 새 기준을 사용했다. 정상 신규 ID 생성과 새 방문도 확인했다. 320px 다크 영어 화면에서 검사한 필드 16px·주요 조작 44px와 가로 넘침/원시 키 없음, 사용자 원고 보존을 확인했다.

## 발견과 후속 확인

1. **native IDB abort 안내:** request AbortError가 tx.onerror로 먼저 전달될 때 tx.error가 null이어서 일반 저장 실패로 먼저 종료했다. 원본/입력은 보존됐다. 요청 오류를 캡처하고 최종 onabort에서 판정하도록 수정해 독립 list/save/delete 순서 1그룹과 영향 브라우저 1개가 통과했다.
2. **대기 불러오기와 ICS 편집:** Web Lock 대기 중 바꾼 제목/연도가 늦은 load와 remount로 사라지는 P2를 추가 교차검토에서 발견했다. 명시 달력 편집의 onEdit을 부모 calendarEditRevision/inputKey에 포함했다. 초기값 적용/정상 remount는 편집 통지를 하지 않는다. 독립 영향 1그룹과 추가 브라우저에서 제목 수정·연도 선택·전체 해제 보존 및 이후 명시 불러오기 성공을 확인했다. 최초 13개 브라우저에서 이 사례가 추가돼 최종 14개다.
3. **타입 오류:** 최초 tsc(01:59:36 KST, 여유 6.08GiB)는 LunarSavedAnniversaries.tsx:147의 TS2345 1건으로 종료했다. rename/load/delete action을 각각 literal kind 객체로 만들어 강제 단언 없이 좁혔다. 실제 UI 영향 2그룹·수정 파일 lint 후 tsc 재검사는 exit 0이었다. 추가 전체 브라우저 반복은 하지 않았다.

초기 검증 스크립트의 닫힌 공유 details와 route-announcer를 포함한 alert selector 오류는 제품 결함과 구분하고 영향 사례만 다시 실행했다.

## 범위와 다음 작업

Quota/접근 차단/Clipboard 거부/readback 실패는 주입 경계이며 native IDB transaction·Blob·Web Locks·실제 다운로드와 구분한다. 이미 commit된 저장을 목록 오류 때문에 되돌렸다고 주장하지 않는다. Web Locks에 참여하지 않는 음력 탭의 CAS/readback은 원자적 동시쓰기를 보장하지 않으며 revision을 모르는 옛 말하기 탭의 비보호 쓰기도 완전히 차단하지 못한다.

이전 LunarConverter 부모 effect lint 4개는 현재 범위 명령에서는 출력되지 않았고 담당자는 기존 effect 본문을 보존했다. 다른 도구의 전체 lint baseline까지 통과했다고 주장하지 않는다. 실제 마이크 녹음·Whisper/생성 코칭 모델 재다운로드·외부 캘린더 등록·다른 OS 앱 붙여넣기·실제 휴대폰·운영 정적 export는 이번 저장 개선의 검증 범위 밖이다.

최종 타입에는 안정 상태의 21차 텍스트 history 유틸·미연결 자식도 포함됐다. 해당 기능의 부모 연결 완료나 브라우저 통과를 뜻하지 않는다. 다음 [21차 텍스트·QR 계약](../2026-11-17-repeat-batch21/plan.md)에 따라 연결하고, [현재 실행 큐](../../handoff/CONTINUOUS-IMPROVEMENT-2026-11-17.md)의 21→22→23 순서를 따른다.
