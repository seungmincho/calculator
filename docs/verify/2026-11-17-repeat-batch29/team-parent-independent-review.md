# 팀 나누기 실제 부모 독립 검토

- 담당: `taxi_repeat`, 2026-11-17.
- 범위: 최종 `TeamDivider.tsx`의 실제 이벤트와 렌더 상태. 제품 TS 수정 없음.
- 결과: 독립 8그룹 PASS, 검사 JS scoped lint exit 0. 추가 재현 결함이나 수정 요청 없음.
- root가 완료한 `check-team-history-independent.mjs` 순수 6그룹은 재실행하지 않았다. 이 보고서는 그 검사와 별도이며, 작성자 부모 9그룹도 집계에 더하지 않는다.

## 재현 방법

```powershell
node docs/verify/2026-11-17-repeat-batch29/check-team-parent-independent.mjs
npx eslint docs/verify/2026-11-17-repeat-batch29/check-team-parent-independent.mjs
```

세 번째 인자로 그룹 이름 일부를 넘겨 영향 검사만 실행할 수 있다. 작성자의 `check-team-history-parent.mjs`에서 **호스트 fixture 선언까지만** 읽어 가져오며 작성자 assertion은 실행하지 않는다. 실제 제품 코드를 번들하고 저장소·Clipboard·Blob URL·타이머·DOM ref만 제어한다. 기대 팀 배열, 이력 진행 순서, 반출 문자열은 이 검사에서 별도로 구성했다.

## 확인한 경계

| 그룹 | 독립 확인 |
|---|---|
| 1 | 초기/공유 보드에서 effect setup–cleanup–setup을 3회 재생한 뒤 잠금·undo/redo 정상. 실제 cleanup 이후 캡처한 보드/복사/TXT 핸들러는 상태·저장·클립보드·다운로드를 바꾸지 않음. |
| 2 | 이동→잠금→교환→이동의 별도 기대 배열과 실제 부모 일치. undo/redo 중 선택 해제, 오래된 자식 핸들러 거부, no-op의 redo 보존, 새 잠금으로 분기. |
| 3 | 조합 변경의 비교 메타데이터와 결과 모드 복원. 현재 실력 및 다음 모드 선택은 이력 밖에서 유지. 공유 데이터도 결과 모드·현재 실력 사용. |
| 4 | 주장 뽑기에서 같은 선택 핸들러를 렌더 전후 중복 호출해도 재배정/중복 인원 없음. 최종 완료가 새 단일 seed이며 cleanup 뒤 이전 pick 무효. |
| 5 | 공개 중 옛 tick/skip을 undo 이후와 새 공개 중 실행해도 복원 결과와 새 타이머 유지. undo/redo 공개는 즉시 완료 상태이며 cleanup 뒤 tick 무효. |
| 6 | 다음 뽑기 모드만 변경하면 기존 결과 복사가 유효함. 현재 실력 변경 뒤 새 복사 성공에 이전 요청의 늦은 거부가 도착해도 legacy fallback/성공 표시를 덮지 않음. |
| 7 | 실제 부모의 이동·undo·실력·언어 변경 후 Clipboard 및 UTF-8 TXT가 독립 구성 문자열과 일치. 이전 Blob은 이후 undo에도 고정, URL 정리 중복 없음, 기존 URL·저장소 쓰기 없음. |
| 8 | undo/redo 경계에서 초점 대상은 활성 네이티브 버튼이며 44px 클래스 유지. 이전 멤버 선택 해제, 참석자 변경으로 이력 초기화 및 새 참석자 보드 생성. |

StrictMode 원인 수정은 작성자가 먼저 재현/처리했다. 초기 cleanup의 `epochRef` 증가를 제거한 최종 제품을 대조했다. `mounted=false` 및 공개/복사 세대 무효화가 실제 unmount 이후의 작업 차단을 맡고, 보드 epoch는 실제 편집 시에만 바뀐다. 이 독립 검사는 수정 전 실패를 다시 만들지 않았다.

첫 실행에서 앞 5그룹이 통과한 후 검사 자체가 다음 모드를 captain으로 둔 채 숨겨진 실력 select를 찾았다. 테스트 동선을 balanced로 되돌린 뒤 복사 그룹과 아직 실행되지 않은 마지막 2그룹만 실행해 통과했다. 제품 결함으로 집계하지 않았다. 최종 8개 고유 그룹이 모두 통과했으며 반복 실행을 별도 건수로 세지 않는다.

## 범위와 한계

- 이 fixture는 실제 제품 함수/효과를 사용하는 제어된 hook 실행기다. effect 재생은 StrictMode의 해당 setup/cleanup 경계 검사이며 React DOM 전체 스케줄러를 인증하는 것은 아니다.
- 초점은 부모가 지정하는 실제 ref/disabled 상태와 호출을 확인했다. 실제 Tab/Enter/Space, 브라우저 focus 이동, 화면 크기, native Clipboard 및 파일 다운로드 UX는 브라우저 담당 증거와 구분한다.
- 공용 순수 이력 한도/무작위 oracle, 기존 명단/백업 전체 회귀, 실제 난수 분포 검사는 이 부모 검사에서 중복하지 않는다.
- 이 작업에서 Chrome·전체 타입 검사·빌드·배포·git 명령을 실행하지 않았다. CSV 성능 후속 제품 TS도 고정 상태로 유지했다.
