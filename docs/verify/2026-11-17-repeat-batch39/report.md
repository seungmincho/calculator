# 39차 완료 — 정규식 Worker·취소와 전체 결과 반출

2026-11-17. 정규식 추출·행 필터·치환을 취소 가능한 Worker로 옮기고, 마지막 성공 결과·미리보기·전체 복사/TXT·파일/URL 상태를 구분했다. **자체37그룹·독립13그룹·실제 Chrome8/8·최종 전체2GB 타입0**으로 로컬 검증을 완료했다. [계약](plan.md) · [구현](implementation.md) · [통합 기록](integration-checks.json).

입력 변경 뒤300ms 자동 실행은 유지하며 취소/숨김/이탈 뒤 같은 입력을 자동 재실행하지 않는다. 빈 일치는 Unicode 코드포인트 규칙에 맞춰 진행한다. 비전역 추출의 첫 전체 일치+캡처, 기존 grep과 JS 치환 토큰 의미를 보존했다. 출력 한도를 먼저 확인하며 일부 결과를 성공으로 취급하지 않는다. Worker 실패 시 메인 스레드 동기 실행으로 후퇴하지 않는다.

파일4MiB·입력1,000,000·패턴10,000·치환100,000·출력4,000,000 UTF-16단위와 탐색 일치100,000개 한도를 안내한다. 미리보기는50,000단위지만 복사/TXT는 성공한 전체 결과다. 현재 실패 입력과 이전 결과를 섞어 저장/공유하지 않는다. 기존 URL 원문 포함 정책과 구형 이중 인코딩은 유지하며16,384자 초과 주소를 일부 잘라 공유하지 않는다.

자체 준비23+리터럴 공백 oracle1+실제부모13은37그룹이다. 최종 영향8파일 lint0이며 native import 수정 뒤 locale/copy ABA 영향1·2파일 lint0을 별도로 확인했다. 독립은 root 순수4(치환45,738·추출/행 필터 각2,178회 및 Unicode 빈 일치)와 실제부모9로13그룹이다. 초기 URL 복원 전 편집, 공백 패턴 무실행, 취소 뒤 pending FileReader 적용3건을 실제 재현하고 수정 후 해결했다. stale debounce guard는 독립 실행 전에 보완했으므로 수정 전 재현 건수에는 넣지 않았다. [순수 독립](independent-core-preparation.md) · [부모 독립](independent-parent-review.md).

Native는08:07:42 KST에8/8 통과했다. 첫 실제 진입의 미수출 useLocale import는 HTTP500/compile overlay를 일으켰고, 가상 모듈 export를 둔 제어 fixture가 놓친 통합 결함이었다. 실제 LanguageContext.useOptionalLanguage와 KO fallback으로 교체한 뒤 새 context에서 검증했다. 같은 진입 오류로 막힌8흐름을8개 제품 결함으로 세지 않는다. 이후5/8에서 남은3흐름은 textarea/Windows Clipboard 줄바꿈, URL 경고 DOM, 중복 버튼 이름 등 검증 조건을 바로잡고 해당 흐름만 재실행했다. [최종 브라우저 보고서](review-browser.md) · [원시 결과](browser/final-results.json).

정상 module Worker7개 생성/7개 종료, 별도 역추적 흐름 Worker5개 종료, 취소/timeout·지연 응답·숨김·native 복구를 확인했다.63,000단위 결과의 실제 TXT105,000바이트를 독립 Buffer와 동일성 대조했다. TXT 바이트는 정규화하지 않았고 Windows Clipboard의 LF→CRLF 반환만 내용 비교에서 구분했다. 실제 FileReader/Clipboard/URL·이력·320px KO/EN과 제어 전달지연/실패/visibility를 구분한다. JS/hydration/unhandled/원시 키0이다.

성능 한계: 위험 정규식 실행의300ms 관측 동안 main heartbeat19회/max16.8ms였고 명시 취소로 실제 Worker가 종료됐다. 별도63k native paste→Worker→50k preview 전체는1330ms/main 최대간격930.6ms였다. 입력·DOM 갱신을 포함하므로 Worker 계산 시간이나 UI 무지연을 의미하지 않는다. foreground timeout 관측5449ms 역시 모든 background/모바일의 엄격한5초 벽시계 보장이 아니다.

공용 통합은 작성자59+guide6=KO/EN65leaf·정적133사용0, 생성/check1578·apply0·audit548 own/6 child/미해결0(기존동적60)이다. 메타/OG/Twitter/JSON-LD·FAQ/updatedDate17을 같은 정책으로 맞췄고 공용3파일 lint0, 발견 파일472redirects/382RSS/315도구45,839바이트다. 현재 범위 tracked diff0이며 전체 저장소 lint/clean 상태로 확대하지 않는다.

최종 타입은37/39/40 native 종료·모든 TS writer 동결 뒤08:08:20 KST/free3.79GiB에서 node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit으로 실행했다. session26319 최종 exit0·진단0이며 미연결41/42/43 준비도 포함한다. 이후 다음 작업 코드까지 검증한 것으로 보지 않는다. 빌드·배포·dev 재시작·커밋·푸시는 실행하지 않았다.
