# 20차 독립 브라우저 검증

2026-11-17 KST 최종. **14/14 PASS — 음력 7개, 말하기 7개. JS pageerror·hydration 오류·unhandled rejection 0.** 기존 localhost:3039에서 격리 Chrome 한 인스턴스씩 순차 실행했고 최종 종료 뒤 통합 담당에게 전체 타입 검사 가능 신호를 보냈다. 제품 파일·기존 dev 서버·빌드·배포·전체 타입 검사는 이 담당이 변경하거나 실행하지 않았다.

[실행 스크립트](../../../scripts/check-repeat-batch20-browser.mjs), [시나리오](browser-scenarios.md), [최신 결과 JSON](browser/final-results.json)에 근거를 남겼다. 외부 요청과 service worker를 차단했으며 실제 사용자 저장소·녹음은 사용하지 않았다.

| 실제 브라우저 사례 | 결과 |
| --- | --- |
| 원 윤달 저장·새 방문·공유 URL 우선·명시 불러오기 | PASS |
| ICS 제목 적용·연도 재선택·실제 파일·이전 SHA 완료 폐기 | PASS |
| 이름 변경/삭제의 현재 입력 보존·40자/12개·원 30일/지원 경계 | PASS |
| 음력 손상/미래 버전/접근 차단/quota/readback 실패와 복구 | PASS |
| 음력 실제 두 탭 충돌·Web Lock 대기 취소·새 날짜 보존 | PASS |
| 결과/연도표 복사 실패·수동 선택·늦은 거부·320px 다크 영어 | PASS |
| 대기 불러오기 중 ICS 제목/연도/전체 해제 보존·이후 명시 재시도 | PASS |
| native IndexedDB v1 무이름 기록 읽기·Blob/feedback 무변경·revision 전환 | PASS |
| 이름/모든 take 검색·모드/언어·빈 이름·신규 ID 생성·재방문 | PASS |
| 현재 연습·첫 take 비교·수동 take 추가·실제 TXT/WAV·요약 URL | PASS |
| 실제 두 탭 저장/삭제 CAS 충돌·재조회와 편집 기준 분리 | PASS |
| native transaction abort·주입 quota·목록 실패·입력 보존·재시도 | PASS |
| commit 성공 후 목록만 실패·새 기준 유지·저장 대기 중 최신 입력 보존 | PASS |
| 손상/미지원 원본·20개 물리 한도·5 take·320px 다크 영어 | PASS |

## 실제 산출물과 저장 검증

- 저장한 원 음력 `{year:2025, month:6, day:10, isLeap:true}`는 올해 대체 날짜로 바뀌지 않았다. 새 방문의 공유 날짜가 먼저 표시됐고 명시 불러오기에서만 원 윤달·연도·모드와 저장 이름이 적용됐다. 이름 변경/삭제는 현재 날짜와 ICS 설정을 유지했다.
- [실제 ICS](browser/saved-original-leap-2026.ics)를 독립 파싱했다. 선택한 2026년의 `DTSTART=20260723`, `DTEND=20260724`, 저장 이름, 윤6월이 없는 해의 평달 대체 설명을 확인했다. CRLF·UTF-8 접기 75바이트·UID·하루 종료 날짜도 검사했다. [파싱 결과](browser/saved-original-leap-2026-parsed.json)를 남겼다. 외부 캘린더에 등록하지 않았다.
- 실제 IndexedDB v1 `sessions`에 이름/revision 없는 두 take 기록과 작은 합성 WAV·기존 feedback을 넣었다. 목록 조회와 불러오기만으로 쓰기/마이그레이션이 일어나지 않았고 명시 저장 때 revision을 부여했다. 이름 저장 뒤 모든 take·feedback·Blob의 타입/크기/바이트가 같았다. 정상 신규 ID 생성 및 새 방문 후 명시 불러오기도 통과했다.
- [말하기 TXT](browser/speaking-two-takes.txt)는 UTF-8 BOM과 연습 이름·두 take 전사문·기존 feedback을 포함했다. [WAV 다운로드](browser/speaking-take-2.wav)는 합성 fixture의 **1,644바이트와 정확히 일치**했다. native Clipboard로 읽은 공유 URL에는 mode/seconds/summary/words만 있었고 이름·전사문은 없었다.
- native readwrite transaction을 유지해 저장을 실제로 기다리게 했다. 대기 시작 snapshot은 DB에 저장됐지만 이후 편집한 이름/원고는 화면과 dirty 상태에 남았다. 다음 저장은 commit 결과의 새 basis를 사용했다. write commit 뒤 목록 `getAll`만 실패시킨 경우에도 “저장은 완료했지만 목록을 다시 읽지 못했어요” 안내와 새 revision이 유지됐다.
- 같은 context의 실제 두 탭에서 최신 저장본을 만든 뒤 이전 basis의 저장/삭제를 시도했다. 충돌 안내와 입력 보존을 확인했고 목록 재조회만으로 현재 편집 basis가 바뀌어 충돌을 우회하지 않았다.

## 발견한 경계와 영향 재검증

1. **native IDB abort 안내 오분류.** request의 `AbortError`가 `tx.onerror`로 먼저 전달되고 `tx.error`가 아직 null인 경우 일반 저장 실패로 먼저 reject됐다. 원본과 입력은 유지됐다. [수정 전 증거](browser/native-idb-abort-before-fix.json)를 남겼다. 담당자가 request 오류를 캡처하고 최종 `onabort`에서 판정하도록 보완한 뒤 해당 사례 1개만 재실행했다. 전용 중단 안내·quota 구분·Blob/입력 보존·재시도까지 통과했다.
2. **ICS 편집 중 늦은 불러오기.** 독립 부모 fixture에서 불러오기가 Web Lock을 기다리는 동안 바꾼 ICS 제목/연도를 뒤늦게 덮는 문제가 확인됐다. 사용자 달력 편집을 부모 세대 무효화에 연결한 뒤 추가 브라우저 사례로 제목 수정·2027년 선택·전체 선택 해제 각각을 확인했다. 원 날짜와 새 편집이 유지됐으며 이후 새 명시 불러오기는 정상 적용됐다.

초기 브라우저의 일부 실패는 닫힌 공유 details를 열지 않은 검사와 Next route-announcer까지 포함한 alert selector였다. 검증 스크립트를 고치고 영향 사례만 재실행했으며 제품 결함으로 집계하지 않았다. 기존 통과 전체를 반복하지 않았다.

## 화면 확인과 한계

[음력 저장 목록](browser/lunar-records-english-320-dark-panel.png), [음력 수동 복사 복구](browser/lunar-copy-recovery-english-320-dark.png), [말하기 검색/필터](browser/speaking-records-english-320-dark-panel.png), [말하기 상단](browser/speaking-records-english-320-dark-top.png)을 직접 확인했다. 두 페이지 body/document 폭은 320px였고 검사한 필드는 16px 이상, 주요 조작은 44px 이상이었다. 영어 번역 후 원시 키가 없었고 사용자 이름/원고는 유지됐다. 개발 배지·고정 공유 버튼은 기존 공용 UI다.

Quota/접근 차단/Clipboard 거부·없음/readback 실패는 격리 컨텍스트에 주입했다. 실제 IDB transaction·Blob·Web Locks·파일 다운로드와 구분한다. 이미 commit된 저장을 목록 오류 때문에 실패로 되돌렸다고 주장하지 않는다. CAS를 거치지 않는 옛 탭까지 완전한 동시쓰기 방지를 보장하지 않는다. 음성 인식/생성 코칭 모델 다운로드·실제 마이크 녹음·OS 앱 붙여넣기는 이번 저장 개선 범위에서 실행하지 않았다. 외부 폰트·광고·방문 분석 차단에 따른 console 메시지는 JS/hydration 오류와 분리했다.
