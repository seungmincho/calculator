# 33차 할인 비교 native 검증

최종 **6/6 PASS**, 2026-11-17 **06:44:02 KST** Chrome 종료. 첫6개는06:41:16에 통과했지만 별도 독립 검토에서 기본 금액 A→B→A 변경 후 과거 복사 feedback이 부활하는 P2가 발견됐다. 작성자의 최신 token 검증 보완 뒤 **기존 copy1흐름만** 영향 재검사했다. 기본·비교 각각의 성공 안내/실패 복구, 총4관찰에서 부활0을 확인했고 나머지5개 증거는 보존했다. 미해결 제품 결함은 없다.

실행기 `scripts/check-repeat-batch33-browser.mjs`, [현재 결과](browser/final-results.json). 기존 localhost:3039·단일 Chrome·격리 context·serviceWorkers:block·외부 요청 차단, 합성 조건만 사용했다.

| 흐름 | 최종 native 확인 |
| --- | --- |
| 기존3모드·가져오기 | 실제 URL 세 모드와0원/잘못된 최종가.101원의15% 할인은86원, 기존20%→10% 연속 할인은73원으로 가져오며 이후 원가 편집과 분리. 최대4조건과 잘못된 최종가 가져오기 차단 |
| 독립 정수 계산 | BigInt 기대값으로 상품합계/적용·초과 쿠폰/상품결제/배송/총액·평균 대조. 총액 Coupon/Tie, 개당 Coupon/Quantity의 별도 공동 최저. 최대값·0·빈칸/소수/음수/초과 원문·40/41 Unicode 이름 경계와 미완 전체 반출 보류 |
| URL·이름 제외 | v1 numeric compare 초기 복원, 기본 편집에서 compare 보존, 비교 편집에서만 제거. 최신 명시 링크/새 방문 숫자 복원·이름 제외. 기본 링크 범위 분리, unrelated query/hash/history.state 보존, v99 전체 거부+예제 유지 |
| TXT·Clipboard·PNG | 실제 TXT1,927바이트와 native Clipboard 전체 내역 일치.1080×1350 PNG113,895바이트에4조건 총액/개당 평균 확인. 이름은 전체 내역에만 있고 이미지 라벨은 조건1~4. 이름만 A→B→A로 편집한 동안 실제 toBlob 완료를 지연하면 resultKey가 과거 다운로드 차단 |
| 복구·교차 요청 | 선택 실패 안내→전체 선택/native 재시도. 전체 복사→공유 링크, 공유 링크→전체 복사, 기본 링크→전체 복사에서 과거 거부 fallback0. 원가100000→100001→100000 후 기본/비교 성공·실패복구 부활 모두0. 이전 성공 timer·실제 SPA unmount 보호 |
| 320px KO/EN | 긴 이름·실제 복구·언어 전환 조건 보존. viewport/body/document320px, 대상 입력 최소16px/버튼 최소44px |

실제 [TXT](browser/discount-comparison-native.txt)·[PNG](browser/discount-comparison-native.png)·[Canvas 원호출 문구](browser/discount-comparison-native-canvas.json), [한국어 모바일](browser/discount-320-ko-panel.png)·[영어 모바일](browser/discount-320-en-panel.png)를 보존했다. PNG를 직접 검토했으며4행 총액/단가가 모두 보인다. 긴 모바일 element 캡처에는 현재 스크롤 위치의 고정 헤더/하단 내비게이션이 중간에 겹쳐 찍히는 artifact가 있다. 문서 가로 overflow는 없고 긴 이름·안내가 줄바꿈된다.

각 흐름 pageerror/hydration/unhandled 오류0, 검사 대상 raw key0. 외부 요청 차단에 따른 resource/tool click fetch console 오류는 별도 보존했다. native Clipboard의 Windows CRLF는 논리 LF 비교에서만 정규화했고 실제 TXT는 원 bytes/UTF-8로 확인했다. PNG는 실제 native Canvas/toBlob/다운로드이며 late callback만 제어했다. 실제 OS 공유창은 실행하지 않았다.

최종 두 브라우저 실행기 범위 ESLint exit0(오류/경고0), 로컬 증거 링크 존재 확인. Chrome 종료와 추가 제품 요청 없음을 root/통합 담당에게 통지했다. 작성자·독립의 제어 포트 검사는 별도 수치이며 여기6개에 합산하지 않는다. 전체 타입 검사는 통합 담당의 별도 최종 기록을 따른다.
