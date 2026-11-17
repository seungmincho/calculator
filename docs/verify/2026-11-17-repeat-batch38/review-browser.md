# 38차 공용 공유 결과 독립 브라우저 검증

최종 **5/5 PASS**. 최초 전체 5개는 2026-11-17 06:18:08 KST에 종료했다. 이후 root가 `shared.copyFailed`의 주소창 복사 지시를 실제 복구 UI에 맞게 바꿨고, **복구·320px KO/EN 두 영향 흐름만** 재검사하여 06:21:40 KST에 Chrome을 종료했다. 기존 세 흐름의 통과 증거는 유지했고 별도 새 사례로 합산하지 않았다.

실행기 `scripts/check-repeat-batch38-browser.mjs`, [최종 결과](browser/final-results.json). 대표 실제 소비자는 `/csat-grade/`, 데이터는 합성 원점수다. 기존 localhost:3039·단일 Chrome·격리 context·외부 요청/service worker 차단을 사용했다.

| 실제 흐름 | 확인 결과 |
| --- | --- |
| 현재 결과 반출 | 국어93점 입력 후 URL sync를 기다려 native Clipboard의 정확한 현재 URL 확인. 실제 `csat-grade.png` 1080×1350·143,039바이트. native Canvas 문구와 PNG에서 93점·2026 참고/2027 실제 아님·현재 CTA 확인. 이미 클릭한 download URL은 이후 입력 변경에도 즉시 폐기하지 않음 |
| 늦은 PNG 완료 | native toBlob 인코딩은 실제 실행하고 callback 전달만 보류. 입력 변경·default URL만 변경·실제 SPA unmount 뒤 전달해 다운로드/공유/fallback/늦은 URL 생성 0, pending 해제 확인 |
| 공유 API 경계 | 제어한 file-share 요청의 실제 PNG File 1080×1350·145,920바이트 및 현재 text/URL 확인. text-share의 URL, AbortError fallback0, renderer 실패의 저장 오류와 같은 링크 복구 확인. 실제 OS 공유창 호출 0 |
| 복사 복구·세대 | API reject/없음+legacy false/throw→전체 readOnly 링크. select 예외 안내 후 실제 전체 선택·focus, native 재시도, 닫기. 이전 요청 거부 fallback0, 과거 성공 타이머가 새 복사 안내를 지우지 않음 |
| 320px 다크 KO/EN | viewport/body/document 320px, 대상 입력 최소16px·버튼 최소44px. locale 변경 뒤 과거 fallback0·이전 복구 제거, 새 영어 PNG 1080×1350·178,894바이트와 영어 CTA 확인 |

최종 오류 문구는 KO **“링크를 자동으로 복사하지 못했어요.”**, EN **“Could not copy the link automatically.”**다. 실제 role=alert의 문구와 canonical 값을 대조했고 주소창 복사 지시가 없음을 확인했다. [한국어 모바일](browser/share-320-ko-panel.png)·[영어 모바일](browser/share-320-en-panel.png)를 새로 캡처하고 직접 확인했다. 영어 버튼은 자연스럽게 다음 줄로 배치된다.

실제 이미지: [한국어 현재 결과](browser/current-result-native.png), [영어 현재 결과](browser/current-result-english.png). [native Canvas 텍스트 관찰](browser/current-result-native-canvas.json)은 원래 fillText 호출을 그대로 수행하면서 수집했다. 실제 PNG를 독립 decode하고 시각 검토했으며, mock 문자열만으로 이미지 성공을 판정하지 않았다.

각 흐름 JS pageerror/hydration 오류 0, 검사 대상 원시 키 0. 차단한 외부 폰트/광고/통계의 resource·tool click fetch 오류는 console 증거로 보존하며 제품 런타임 결함으로 합산하지 않았다. 이번 브라우저에서는 추가 TS 수정 요청이 없었고 문구 수정만 두 영향 흐름으로 확인했다.

실제 native Clipboard·Canvas·PNG와 제어한 share/실패/late callback 포트를 구분한다. OS 공유창 및 다른 앱 전송은 실행하지 않았다. snapshot identity·resultKey·StrictMode 세부 조합은 root/독립 컴포넌트 fixture의 별도 증거다. 기존 renderer의 5행 상한과 외부 폰트 로드는 변경/검증 범위가 아니다. 이미 전달된 OS 쓰기·다운로드의 취소를 보장하지 않는다. 최종 Chrome 종료를 통합 담당에게 통지했으며 전체 타입 검사는 별도 통합 기록을 따른다.

검증기 정리: 세 브라우저 실행기와 32차 browser-oracles.mjs를 대상으로 실행한 범위 ESLint는 exit0(오류·경고0)이다. 보고서의 로컬 증거 링크도 모두 존재함을 확인했다.
