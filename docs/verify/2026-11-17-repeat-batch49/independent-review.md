# 49차 메뉴 룰렛 독립 검토

2026-11-17 KST. **독립 7그룹 PASS, 추가 재현 제품 결함/변경 요청 없음.** 제품 TS·canonical·원래 author 검사/근거는 변경하지 않았다. Chrome·전체 타입·빌드·배포·커밋을 실행하지 않았다. 신규 검사 MJS의 scoped ESLint는 exit0/오류0/경고0이다.

검토 대상은 실제 `/menu-roulette`에서 사용하는 `DecisionTools`의 `menuMode`와 `MenuRoundExclusions`, `menuRoundExclusions.ts`다. `MenuPicker`와 다른 경로를 혼동하지 않았다. author15 및 기존31회귀10은 참고만 했으며 새 통과 수에 더하지 않았다.

## 근거

실행: `node docs/verify/2026-11-17-repeat-batch49/independent-menu-parent.mjs`

작성자 `menu-round-parent-harness.mjs`의 제어 I/O 호스트만 재사용했다. 작성자 assertion·결과 기대값을 가져오지 않았고 별도 Set/원본 index 모델과 합성 후보/식사 기록을 사용했다. 실제 부모가 정한 결과 문자열을 관찰하므로 룰렛의 각도→index 공식을 검사 코드에 복제하지 않았다. 복구 동작은 별도 실제 `MenuRoundExclusions` 자식의 버튼을 통해 부모 callback으로 전달했다.

1. **순수 독립 모델 180전이.** 제외/개별 복구/전체 복구가 source의 원래 index·문자열·순서를 유지한다. trim 동등성만 사용하며 ASCII C와 전각 Ｃ, `__proto__`, emoji, `<&>`를 별개 원문으로 보존한다. 2칸 하한·옛 revision 거부·무관한 unavailable no-op·실효 후보 변경 초기화를 대조했다.
2. **실제 부모 연속14회 추첨·제외/복구.** 한글/중복/emoji/특수문자10칸을 별도 원본 배열+Set 기대값과 대조했다. 모든 같은 이름 칸이 함께 빠지고 실제 자식 복구 버튼이 원래 자리에 돌려놓는다. URL 전체·주간 계획 후보·storage writes0은 유지됐다.
3. **2칸은 이름 수가 아니라 실제 칸 수.** `[single,pair,pair]`에서 `pair` 제외는 disabled+handler 직접 실행도 차단한다. `single` 제외 뒤 같은 이름 두 칸은 허용되며 그 마지막 이름 제외는 막는다. 전체 복구는 세 칸의 원순서다.
4. **초기화 조건.** 관계없는 식사 추가/삭제와 실효 후보가 같은 1일→7일 옵션 변경은 임시 제외를 유지했다. 실효 후보가 달라지는 필터 해제는 초기화했다. 명시 같은 프리셋 재선택·후보 삭제·후보 추가는 초기화했다. 식사 필터 전용 후보를 받은 주간 계획은 임시 제외의 영향을 받지 않았다.
5. **revision·스핀 소유권.** 이전 패널의 restore, 같은 렌더의 restore→옛 restoreAll, 회전 중 옛 exclude/restore/preset/새 spin handler를 직접 호출해 새 상태가 바뀌지 않음을 확인했다. 이전 두 RAF를 새 회전에 호출해도 결과가 나오지 않고, 현재 완료 callback 재호출은 결과/history 전체 표시를 중복 갱신하지 않았다. cleanup 후 callback도 쓰기0이었다.
6. **반출 ABA.** 복사 pending→제외→복구→동일 결과 재추첨 뒤 옛 copy/PNG handler는 호출0, 옛 native 거부의 legacy fallback0이다. 현재 결과의 새 복사·PNG 요청만 정상 실행됐다. PNG는 기존 제품 handler의 파일명·그리기 포트이며 실제 픽셀/파일 저장 성공 검증으로 확대하지 않는다.
7. **로컬 날짜 경과.** 식사 제외 기간이 끝나 실효 후보가 바뀌면 임시 제외·결과를 초기화하지만, 원래 후보 URL/식사 raw/storage bytes는 쓰지 않고 주간 계획에 원래 후보를 전달했다.

첫 실행의 필터 그룹에서 12칸 프리셋에 13번째 후보를 추가하는 fixture 전제가 틀려 assertion이 실패했다. 기존 12칸 상한을 지키도록 하나를 먼저 삭제하고 추가한 뒤 통과했다. 제품 변경 없이 수정한 검증 전제이며 제품 결함으로 집계하지 않는다. Node의 기존 typeless-package 경고는 별도 제품 오류가 아니다.

## 범위와 한계

React 효과/부모·자식 이벤트/순수 helper는 실제 코드다. 시간·RAF·Clipboard·legacy DOM·canvas·다운로드·storage는 제어 포트이며 실제 브라우저 배치/픽셀/키보드/팝업을 검증한 결과가 아니다. native는 verifier의 별도 보고서를 따른다. 기존31전체 검사를 불필요하게 반복하지 않았고, 새 경계와 연결 보존에 집중했다. 전역 랜덤 분포의 통계적 공정성을 이 유한 검사로 재인증하지 않는다.

제품 변경 요청: 없음. 전체 타입/배포 완료 주장: 없음.
