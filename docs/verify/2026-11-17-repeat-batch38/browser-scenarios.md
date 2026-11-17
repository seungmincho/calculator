# 38차 공용 ShareResult 실제 브라우저 검증 계획

실행 완료: 최종 5/5 PASS. copyFailed 최종 문구 병합 후 복구·320px KO/EN 두 영향 흐름만 재검사했고 2026-11-17 06:21:40 KST Chrome 종료. 상세 결과와 native/mock 구분은 review-browser.md를 따른다.

대표 소비자는 `/csat-grade/`의 기존 원점수 결과 ShareResult를 사용한다. 외부 사이트/OS 공유창/다른 앱 전송은 실행하지 않는다. 사용자 민감 데이터 대신 합성 숫자만 넣는다. 실제 renderer의 `fillText`를 원함수와 함께 관찰해 카드 문구와 실제 PNG를 함께 기록한다.

1. **현재 결과 native 반출**: 입력→URL sync 확인 후 native Clipboard의 정확한 URL, 실제1080×1350 PNG Blob decode·파일명·현재 headline/행/CTA를 확인한다. 새로운 원점수 기록이나 개인정보 저장은 하지 않는다.
2. **늦은 renderer**: 실제 native toBlob이 만든 Blob의 callback 전달만 보류하고 입력/현재 URL 변경 또는 실제 SPA unmount 후 전달한다. 과거 자동 download click·URL 생성·공유 호출0을 확인한다. 이미 성공해 클릭한 PNG의 URL을 단순 입력 변경에서 즉시 해제하지 않는지 기록한다.
3. **native share 포트**: mock canShare/file-share·text-share의 요청 payload·실제 PNG File bytes/현재 URL을 확인. AbortError는 fallback0, render 실패는 같은 snapshot의 링크 복구로 가며 오류를 회수한다. mock 상태 전이를 실제 OS 공유 성공으로 보고하지 않는다.
4. **복사 복구·세대**: API reject/없음+legacy false·throw→readOnly 전체 링크·명시 선택/실패/재시도/닫기. 입력·새 요청 뒤 이전 rejection은 legacy0, 이전 성공 타이머는 새 안내를 지우지 않는다. native 성공과 제어 포트의 true/false는 구분한다.
5. **320px KO/EN**: 실패 복구 field16px/버튼44px·focus·overflow0. locale 변경 후 이전 요청/안내가 무효화되며 새 명시 반출의 카드 문구가 현재 언어와 맞는다. 실제 PNG/native Clipboard를 대표 소비자에서 검증하고 optional resultKey의 별도 부모 fixture 근거와 분리한다.

같은 의미의 새 객체 props·resultKey·StrictMode setup/cleanup의 세부 포트 조합은 root actual-component 검사와 연결하며 브라우저에서 모두 재작성하지 않는다. 원래 renderer의5행 상한·폰트 대기는 변경 범위가 아니고 외부 폰트는 차단하므로 원격 폰트 로드를 주장하지 않는다. 기존3039·단일 Chrome·격리 context·외부 요청 및 service worker 차단, 종료 후 whole type barrier를 따른다.
