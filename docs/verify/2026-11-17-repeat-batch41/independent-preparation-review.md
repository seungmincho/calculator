# 41차 메모장 — 미연결 준비 독립 검토

2026-11-17 KST. **독립13그룹 PASS, 재현 P2 1건 해결 확인, 추가 제품 변경 요청 없음.** 검토 대상은 신규 persistence/import/draft/controller와 Recovery child다. 기존 `Notepad.tsx`는 아직 연결하지 않았으므로 메모장 실제 부모 동작 개선 완료나 native 두 탭 검증으로 해석하지 않는다.

작성자26그룹을 재실행·합산하지 않았다. 별도의 원고·저장소·잠금·타이머·파일 포트를 만들고 예상 내용 집합/ID 개수/직접 raw bytes를 대조했다. 실제 child 실행에는 범용29 hook host만 사용했다. 제품·기존 검사·canonical·43 준비 TS를 수정하지 않았다.

## 독립 실행 근거

| 파일 | 결과 | 범위 |
|---|---|---|
| `check-notepad-independent.mjs` | 11그룹 PASS | 아래 저장·편집·파일 상태기계 |
| `check-notepad-merge-independent.mjs` | 수정 후 영향1그룹 PASS | incoming 고유ID 사전 예약 |
| `check-notepad-recovery-independent.mjs` | 1그룹 PASS | KO/EN actual child→real draft의 명시 적용/원문 백업 |

11그룹은 다음 경계를 별도 기대값으로 확인한다.

1. `__proto__`/`constructor`/제어문자/CRLF/한글·emoji 및 동일 본문·다른 ID가 있는 병합의 입력 불변·고유ID·모든 본문 보존·재수입 중복 처리.
2. 손상 JSON·미지원 wrapper·알 수 없는 note 필드의 초기0write, 메모리 편집과 retry 중 원본raw 불변.120,000자본문·기존큰finite시간은 임의 새 한도로 손상 처리하지 않음.
3. commit 전 요청 복제, 잠금 안 raw CAS, 취소한 잠금이 실행돼도 write0.
4. 첫 write의 `onConfirmed`가 잠금 안에서 basis를 갱신한 직후 새 edit/request가 발생해도 두 번째 write가 첫 raw를 기준으로 저장. 늦은 첫 Promise continuation은 최신 메모를 바꾸지 않음.
5. setItem 성공 뒤 readback throw는 `unconfirmed`, rollback0. 이후 새 편집을 유지하며 실제 쓰인 raw를 명시 재조회한 뒤 최신 draft 저장.
6. 외부 수정·clear는 dirty memory를 교체하지 않음. 명시 keep-both는 같은ID 양쪽내용과 별도ID를 모두 남기고, 외부 빈 배열/null 기준에서도 현재 원고를 사용자가 확인한 뒤 저장.
7. preview scope 이후 편집은 old apply 취소. keep-both의 quota 실패는 외부저장 raw를 유지하고 현재 메모리에는 양쪽 원고를 보존.
8. undo는 적용 직후 revision에만 유효. 이후 새 edit/Strict dispose→activate는 이전 undo/timer/lock을 무효화하며 최신 내용 저장은 재개 가능.
9. pagehide가 새로운 비동기 lock을 시작하지 않음. pageshow는 실제 외부값부터 확인하며 dirty 원고를 자동 교체/저장하지 않음.
10. 순차 import의 취소/late reject/새 요청/Strict 재활성화, 개별 corrupt/unreadable 실패와 나머지 정상 파일 보존.
11. settings와 notes의 key/lock 분리. 손상 settings 저장 실패가 정상 notes 저장을 막거나 settings 원문을 덮지 않음.

Recovery child 검사는 이전 preview의 버튼 callback을 저장해 둔 뒤 실제 draft를 편집하고 호출해도 scope 검증으로 취소됨을 확인한다. 새 preview의 명시 버튼만 양쪽 원고를 저장한다. HTML 모양의 제목은 literal로 렌더되고 손상 raw는 제어문자까지 그대로 백업 callback으로 전달된다. child의44px 클래스는 확인했지만 실제 DOM 폭·focus·스크린리더 동작은 아니다.

## F1: 충돌 사본의 생성 ID가 뒤 incoming ID를 선점

**P2, 해결 확인.** 수정 전 아래 입력에서 서로 다른 정당한 incoming ID 두 개가 한 항목으로 합쳐졌다.

```text
current:  id=original,    body=current draft
incoming: id=original,    body=incoming draft
          id=reserved-id, body=incoming draft
generated conflict ID: reserved-id
expected notes: 3; actual notes: 2 (added1 / duplicates1)
```

앞의 original 충돌 사본에 reserved-id를 먼저 배정한 뒤 뒤의 원래 reserved-id 항목을 중복으로 판단했다. 원래부터 다른 ID인 메모를 합치지 않는다는 명시 계약의 위반이다. 일반 UUID 생성에서 이 충돌의 확률이 낮다는 점과 저장/가져오기 임의ID 경계의 재현을 구분한다. 본문 문자열 자체는 남아도 별도 정당한 메모 한 개와 원래ID 의미가 사라졌다.

`check-notepad-merge-independent.mjs --reproduce`의 원본은 `merge-before-fix.json`에 보존했다. 작성자가 current+incoming 전체 ID를 미리 예약하고 생성 사본이 해당 ID/이미 생성한 ID를 피하도록 수정했다. 독립 영향 실행에서3개 고유ID와 두 incoming 항목, current 원본을 모두 확인했다. 다른 통과 검사를 무조건 전체 반복하지 않았다.

## 제한·다음 단계

- 독립 JS3파일 범위 lint: 모두 exit0·오류0·경고0.
- Web Locks 자체의 브라우저 스케줄링이나 localStorage crash 내구성을 검증한 것은 아니다. 이 검사는 키별 제어 lock 안 CAS·readback·basis 순서와 미지원 fallback 정책 범위다.
- 실제 `Notepad.tsx` 연결 뒤 IME/검색/선택/저장debounce·다중탭 storage event·파일선택/취소·실제 TXT/JSON Blob·undo toast 세대·settings 효과·기존 읽어주기 전달을 후속 actual/native에서 확인해야 한다.
- Chrome·전체 tsc·빌드·배포·공개 RPC·실사용 메모/저장소는 사용하지 않았다. 43 준비 TS freeze를 유지했다.
