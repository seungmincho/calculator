# 20차 미연결 저장 유틸 독립 읽기 검토

담당: writing_versions. 2026-11-17 KST. 19차의 전체 타입 검사 대기 중 [20차 계약](plan.md), [말하기 기록 설계](speaking-records-design.md), `records.ts`/`recordStorage.ts`와 기존 `core.ts`/`storage.ts`를 읽기 전용으로 대조했다. 제품·신규 TS·기존 검사 파일을 작성/수정하지 않았으며 Chrome·전체 tsc·새 실행 검사를 하지 않았다. 작성자 자체 11그룹 통과 결과와 이 읽기 검토를 구분한다.

## B. 말하기 기록 판정

현재 미연결 코드에서 **수정 요청이 필요한 실질 결함은 발견하지 않았다**. 이는 실제 IndexedDB의 두 탭/abort/quota나 부모 상태 연결이 통과했다는 뜻이 아니다. API 연결 이후 독립 실행 검증이 필요하다.

| 경계 | 코드에서 확인한 동작 | 판단 |
| --- | --- | --- |
| 저장 기준 캡처 | `captureSpeakingBasis`가 legacy의 updatedAt 또는 revision+updatedAt을 별도 객체에 담는다. 현재 draft의 후속 updatedAt을 비교 기준으로 다시 읽지 않는다. | 설계와 일치 |
| 신규 생성/갱신 | save는 expected를 필수 검증하고 snapshot과 basis를 DB open 전에 분리한다. absent는 현재 ID에 값이 있으면 거부하고, legacy는 revision 없음+시각 일치, revision은 token+시각 일치를 모두 요구한다. | 오래된 문서 덮어쓰기 방지 경계가 있음 |
| 동일 트랜잭션 | `readwrite` 하나 안에서 get→기준 비교→필요 시 count→put을 이어 간다. 요청 handler 사이에 외부 Promise/타이머를 await하지 않는다. delete도 같은 트랜잭션에서 get→기준 비교→delete한다. | 두 협력 탭의 쓰기 직렬화에 필요한 구조 |
| 완료 판정 | put/delete의 request success는 flag만 기록하고 `tx.oncomplete`에서만 성공한다. 목록도 getAll success 뒤 transaction complete를 기다린다. error/abort에는 실패하며 연결은 finally에서 닫는다. | 요청 성공을 commit 성공으로 오인하지 않음 |
| 손상/미래 기록 | 목록은 valid/unreadable/unsupported를 나누고 physical total을 유지한다. 읽기만으로 title/revision을 추가하거나 put/delete하지 않는다. 기존 손상/미지원 대상을 변경하려는 non-absent 작업은 별도 오류로 거부한다. | 원본 유지 정책과 일치 |
| 한도 | 신규 ID만 전체 store.count를 확인해 최대 20개를 적용한다. 손상/미지원 항목도 포함한다. 기존 ID 갱신은 20개여도 가능하다. take 한도 5는 기존 validator를 그대로 사용한다. | 물리 한도를 우회하거나 정상 갱신을 불필요하게 막지 않음 |
| Blob·기존 필드 | prepare는 기존 validator를 재사용한 뒤 structuredClone한다. title trim/빈 이름 제거·새 revision·updatedAt 외에 takes/audio/feedback/추가 legacy 필드를 새 형식으로 투영해 버리지 않는다. | 기존 음성 및 기록 내용 보존을 의도한 구조 |
| DB 열기 실패 | open throw/error/blocked를 구분하고, 이미 실패한 요청의 늦은 success는 DB를 닫는다. versionchange도 close를 등록한다. | 실패 후 열린 연결을 남기지 않도록 처리 |

`isSpeakingRecord`는 기존 `isSpeakingSession`에 optional title/revision만 추가한다. 따라서 기존 validator가 허용한 부가 필드와 기록 표현을 이번 변경만으로 더 엄격하게 거부하지 않는다. 이 호환성 선택을 새로운 스키마 오류로 보고하지 않았다.

## 연결 뒤 우선 확인할 경계

1. **legacy basis와 현재 편집 분리:** 목록에서 받은 legacy updatedAt을 별도로 유지하고, 첫 저장 후 반환된 새 revision을 기준으로 삼아야 한다. 현재 편집의 updatedAt이나 단순 목록 재조회 결과를 기준으로 덮어쓰면 안 된다.
2. **commit 성공/목록 실패 분리:** 저장이 commit됐는데 목록 재조회만 실패할 때 committed basis는 채택해야 한다. 같은 연습에서 저장 중 추가 편집이 있었다면 최신 원문·title·takes와 dirty는 유지해야 한다. 다른 연습을 열었다면 이전 완료가 현재 상태를 바꾸면 안 된다.
3. **실제 IDB 경쟁과 rollback:** 동일 ID를 두 탭에서 갱신하거나 갱신과 삭제가 경쟁할 때 한쪽의 stale basis가 거부되는지, put 성공 뒤 transaction abort/quota에 성공 안내가 나오지 않는지 검증한다. 유틸의 읽기 구조 확인으로 실제 브라우저 결과를 대신하지 않는다.
4. **손상/미지원 항목의 physical 한도:** 정상 목록에 숨겨진 항목 수를 알리고 새 ID 추가 한도에 포함해야 한다. 사용자에게 알리지 않고 삭제·초기화하거나 정상 목록 길이만 보고 저장 가능하다고 판단하지 않아야 한다.
5. **삭제 및 이전 작업:** 선택한 항목의 basis로 삭제하고, 현재 연습의 저장본을 실제 삭제한 경우에만 입력을 유지한 채 기준을 absent로 전환해야 한다. 늦은 삭제/목록 완료가 다른 현재 연습의 기준을 바꾸지 않아야 한다.
6. **기존 작업 보존:** 검색은 이름과 모든 take의 전사문을 대상으로 하되 음성 Blob/피드백을 변경하지 않는다. 필터·언어 전환·목록 재조회는 현재 연습이나 ASR/코칭 job을 초기화하지 않아야 한다. title은 명시 텍스트 반출에만 추가하고 기존 요약 URL에는 넣지 않는다.

revision을 모르는 옛 탭이 예전 guarded API 없이 값을 덮어쓰는 경쟁까지 막는다는 보장은 하지 않는다. updatedAt 비교는 일부 변경을 감지하는 추가 조건이며 모든 옛 탭의 동작을 직렬화하는 수단은 아니다.

## A. 음력 저장 선행 읽기 메모

앞선 준비 요청으로 `lunarSavedAnniversaries.ts`, [도메인 준비](lunar-domain-preparation.md), [API 설계](lunar-saved-api.md)도 읽었다. 현재 계약 불일치를 찾지 않았다. 실제 유효한 원 음력 연도·윤달/30일을 저장하고 다음 발생일을 별도로 계산하며, raw 재파싱→CAS→쓰기→readback, 명시 load 직전 raw 재확인/복제, 대기 취소 가능한 lock을 제공한다. UI 세대 가드·공유 URL 우선·명시 복원 후 ICS 제목 적용/연도 재선택은 연결 이후 검증 대상이다. 이 단계에서는 신규 실행 검사를 하지 않았다.
