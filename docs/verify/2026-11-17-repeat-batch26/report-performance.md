# CSV 성능 후속 통합 보고서

2026-11-17 KST. **완료: 자체22·독립11그룹, 실제 브라우저8/8, 공통 전체 타입·번역·범위 lint/diff·문서 검사 통과**다. 마지막 완료 체크포인트는 [27차](../2026-11-17-repeat-batch27/report.md)다. [26차 원래 기능 보고서](report.md)와 당시 14/14·성능 한계를 보존한다. 이번 후속은 [29차 팀 편성](../2026-11-17-repeat-batch29/report.md)과 단일 Chrome/전체 타입 체크포인트를 공유하며 기능·검사 수는 따로 기록한다.

## 구현과 기존 동작 보존

같은 parser/serializer와 파일 decoder를 module Worker에서 실행한다. 사용자 변환과 파일 디코딩은 명시 취소/새 입력/옵션/파일/이탈에서 무효화하며, 실패한 큰 작업을 main에 다시 동기 실행하지 않는다. 초기 2행 예제만 기존 core로 동기 생성한다. 입력 2MiB·출력/중간 데이터 8MiB·10,000행·200열·200,000셀 한도는 유지한다.

결과 텍스트는 약 50,000 UTF-16 단위 페이지, 표 body는 최대 1,000셀씩 표시하고 동일 결과 영역을 memo한다. 이모지/CRLF 경계를 보존한다. 모든 페이지를 연결하면 전체 결과이며, 복사·다운로드·실패 시 수동 복구는 같은 확정 결과 전체를 사용한다. 전체 원문 입력과 수동 선택에는 기기 성능에 따른 지연이 남을 수 있다. 화면의 Worker 처리 시간과 전체 왕복/렌더 시간은 구분한다.

자세한 구현·선택자·검사 명령은 [구현 보고서](performance/csv-performance-implementation.md), 측정 계약은 [성능 계획](csv-performance-plan.md)을 따른다.

## 현재 증거

- 자체 Worker/client/preview **9그룹**, 실제 부모 제어 포트 **13그룹 PASS**. 기존 부모 9흐름이 새 13에 포함되므로 중복 합산하지 않는다. 7파일 범위 lint와 마지막 예제 표시 영향 parent lint는 오류·경고 0이다.
- [독립 검토](performance/independent-review.md): Worker8 + 실제 부모3 = 11그룹 PASS, 추가 제품 결함0. 실제 module Worker 브라우저 측정과 제어 포트 검사를 구분한다.
- ko/en 후속 조각 **16leaf**, 정적 사용 **95개·오류 0**, 생성물 **1578개**를 반영했다. 원래 26차 조각·정적 검사 결과는 덮어쓰지 않았다.
- page description/OG/Twitter/JSON-LD와 기능·FAQ, 메뉴 설명을 Worker/취소/미리보기와 전체 반출 범위에 맞췄다. route·OG 이미지·패키지는 추가하지 않았다. menu updatedDate는 2026-11-17이다.
- 공용 4파일 ESLint **exit0**. 발견 파일 생성: redirects472/RSS382/llms315도구·45,587bytes.
- messages:check1578·apply0·audit534 own+6 child/미해결0(기존 동적 알림60)을 통과했다. 실제 Worker 브라우저8/8과 현재 코드 범위 diff는 통과했다. 공통 전체 타입 첫 실행과 최종 보고서/인계 검사도 통과했다. [통합 상태](integration-performance-checks.json).

## 실제 브라우저와 분리 측정

[브라우저 보고서](performance/review-browser.md)와 [최종 결과](performance/browser/final-results.json): **8/8 PASS**, checkedAt2026-11-16T20:21:11.362Z(05:21:11 KST), pageerror/hydration/unhandled/원시 키0, CSV Chrome 종료. 뒤따른 Team29도7/7·Chrome 종료를 확인한 뒤 공통 전체 타입을 통과했다.

실제 Worker의 200,000셀 전체 JSON 3,480,002bytes와 wide 결과3,788,002bytes는 이전 fixture와 동일하다. 미리보기 구간을 합친 원문·이모지/CRLF·마지막 표 행, 취소/옛 응답/파일 decode/transfer, 실패 뒤 동기 fallback 없음과 재시도, 전체 수동 선택/native Clipboard, 320px 다크 KO/EN·언어 전환 후 데이터/구간 보존을 확인했다. 개발 서버 Worker는 Blob/importScripts 부트스트랩을 쓰므로 options.type를 module로 단정했던 테스트1건만 고쳐 재확인했으며 제품 수정은 없었다.

| 측정 구간 | 이 Windows Chrome 개발 서버의 관찰값 |
|---|---|
| 10,000×20 같은 입력 변환+기본 preview의 16ms timer 최대 간격 | **36.2ms**, Long Task0. 원26 전체 textarea 결과는1,996ms였음 |
| 해당 Worker 계산 / 요청→응답 왕복 / 응답 callback | 210.8 / 240.4 / 3.2ms. callback은 검증+settlement 합계 |
| callback 완료→확정 프레임 | 26.3ms. React render 단독으로 해석하지 않음 |
| 1,000×200 변환+기본 preview 최대 간격 | 42.8ms. Worker196.2 / 왕복229.6 / callback1.8ms |
| 별도 1,000셀 표 표시 | elapsed221.7ms / 최대 간격132ms / 115ms Long Task1 |
| 표를 유지하며 원문 수정 | elapsed123ms / 최대 간격25.2ms / 표 mutation0 |
| 약2MiB 원문 native 붙여넣기 | elapsed740.6ms / 최대 간격412.8ms |
| 약2MiB 단일 셀 변환+preview | elapsed1,037.1ms / 최대 간격294.9ms. Worker 계산22.7ms와 구분 |
| 명시 실패 뒤 전체 수동 복구 표시 | elapsed684.6ms / 최대 간격480.4ms |
| 수동 전체 선택 / native 전체 복사 재시도 | 최대 간격41.7 / 40.6ms |

기본 변환의 약2초 main 정지는 해소됐지만 **큰 controlled 입력·단일 셀 preview·전체 수동 복구에는 수백 ms 지연이 남는다**. 전체 결과를 줄인 성능 개선이 아니다. 원래 wide932ms/gap713ms는 변환과 5,000셀 표가 합쳐진 값이므로 새 별도 표 수치와 같은 작업이라고 비교하지 않는다. elapsed에는 자동화 클릭·조건 대기·두 rAF가 포함되며 단일 관찰은 평균·실기기·배포 성능 보장이 아니다. 준비 Node VM 수치는 Chrome 개선 수치로 인용하지 않는다.

## 공통 전체 타입과 한계

29차·28/30차 미연결 준비를 포함한 모든 TS writer 고정과 Chrome 최종 종료 뒤 `node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit`을 실행해 첫 실행 exit0으로 통과했다. 시작2026-11-17 05:26:25 KST, os.freemem4.65GiB, heap2GB다. [29차 통합 상태](../2026-11-17-repeat-batch29/integration-checks.json)와 같은 실행이며 별도 테스트로 중복 집계하지 않는다. 현재 코드·최종 문서 범위 diff는 exit0이며 보고서/인계7문서의 상대 링크167개·누락0을 확인했다. 통과한 과거 검사는 다시 실행하지 않았다.

실패/지연/timeout은 제어 fixture이며 30초 timeout은100ms로 당겨 실행했다. 실제 OS Clipboard·파일은 독립 Chrome 컨텍스트에서 확인했고 외부 광고/폰트/통계 요청은 차단했다. 실제 모바일 기기 전체 성능을 인증하지 않는다. 빌드·정적 export·배포·dev 재시작·커밋·푸시는 실행하지 않았다.
