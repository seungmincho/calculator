# 45차 글꼴 조합 백업 — 독립 순수 검토

2026-11-17 KST. 작성자의9그룹 assertion을 재실행하거나 합산하지 않고 별도 fixture와 기대값으로 신규 백업 API를 검사했다. 제품·canonical·공용 파일은 수정하지 않았다. 부모/백업 UI는 아직 연결 검토 범위가 아니며 실제 Chrome/전체 타입/네이티브 Web Locks를 검증했다고 주장하지 않는다.

최종 판정: **독립8그룹 통과, 확인 후 콜백 예외 경계1개 수정 확인 완료**. 미해결 제품 변경 요청은 없다.

## 재현된 경계

`importFontPairBackup`는 setItem과 readback이 모두 성공한 뒤 잠금 안에서 `onConfirmed`를 호출한다. 이 콜백이 throw하면 함수 외부 catch가 `unavailable`로 반환한다. 콜백이 `QuotaExceededError`를 던지면 저장이 성공했는데도 quota로 재분류될 수 있다.

다음 실제 API 재현에서 정상 새 항목이 한 번 저장되고 readback 일치까지 확인됐지만 결과가 `{ok:false,error:'unavailable'}`였다.

```text
node docs/verify/2026-11-17-repeat-batch45/independent-core-check.mjs --reproduce-callback
```

증거: [callback-before-fix.json](./callback-before-fix.json). 입력은 합성 프로필이고 콜백의 예외는 제어 포트다. 아직 UI의 실제 callback에서 예외가 발생했다고 주장하지 않는다. root 작성자가 readback 이후 observer만 국소 catch하여 확정 `{ok:true,snapshot,added}` 결과를 유지하도록 수정했다. 영향 `--only=confirmed`1그룹을 재실행해 잠금 안 확인 순서·저장1회·성공 결과를 확인했다. rollback은 하지 않는다.

## 독립 검사

`independent-core-check.mjs`에8그룹을 정의했고 모두 통과했다.

1. 검증된 raw만 반출하고 별도 snapshot view에 넣은 원고/런타임 필드는 반출하지 않는다. wrapper·프로필·title/body의 키를 별도 allowlist로 검증하고, 요청한 굵기500을 임의 지원 굵기로 바꾸지 않는다.6개/한글·이모지·quote·backslash 왕복.
2. catalog ID·양쪽 role의 size/weight/type·여분 필드·미래 version·비정규 ISO 등33가지 파일 변형 전체 거부. BOM을 포함한 정확65,536 UTF-8 bytes 허용/1byte 초과 거부, UTF-16 길이는 작아도 실제 bytes가 큰 파일 거부.
3. 기존 fullwidth 이름과 선택의 호환문자/대소문자 중복을 별도 기대값으로 비교한다. 모든 선택 충돌을 행별 반환하고6slots를 넘으면 부분 저장0. 여섯째 항목만 선택하여 앞뒤 공백을 정리한 이름으로 추가.
4. 잠금 대기 중 선택 이름·source styles·source name·basis.raw/profiles를 바꿔도 클릭 당시 기준을 사용한다. 기존 `a-2`, 수입 `a/a-1`에서 ID 공급기가 계속 `a`를 주면 새 ID는 `a-3/a-4`이며 원본 ID와 모두 다르다.
5. 잠금 대기 중 외부 raw 변경/손상/미래 버전은 쓰기0·확정 콜백0·외부 bytes 유지. ID 생성 중 current가 false가 되면 직전 최종 가드에서 취소하고 쓰지 않는다.
6. readback throw와 다른 raw는 unknownWrite이며 성공 콜백/rollback0. quota/setItem throw는 이전 bytes를 보존한다. 실제로 저장됐을 수도 있는 확인 불가와 미쓰기 실패를 구분한다.
7. 확정 콜백은 잠금 반환보다 먼저 실행되며 콜백 예외가 확인된 commit을 실패로 바꾸지 않는다. 최초 재현 실패 후 작성자의 최소 수정으로 PASS.
8. 늦은 이전 File.text 거부, 새 파일, 취소, dispose→activate 뒤 오래된 완료를 세대로 구분한다.64KiB 초과 파일은 text() 호출0.

전체 최초 실행에서 앞6그룹 PASS 뒤7번의 실제 재현 assertion이 실패했다. 이어 `--only=reader`로8번을 독립 실행해 PASS했고, 수정 뒤 `--only=confirmed`로7번 영향만 재검사해 통과했다. 통과한 나머지7개는 불필요하게 반복하지 않았다. 독립 스크립트 최종 scoped ESLint **exit0·오류0·경고0**.

## 범위 제한

네이티브 저장소를 사용하지 않고 같은 getItem/setItem 계약의 메모리 포트와 대기 잠금 포트를 사용했다. `onConfirmed`의 확인된 쓰기 결과를 재분류하는 경계는 실제 함수를 실행해 증명했지만, 물리적 브라우저 탭 원자성·기기 장애 내구성·실제 UI 다운로드/파일 업로드는 이 결과에 포함하지 않는다. 현재 입력 원고·폰트 미리보기·기존 프로필 parent와의 통합은 후속 연결 검토 대상이다.
