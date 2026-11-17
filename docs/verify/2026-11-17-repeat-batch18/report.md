# 18차 완료 기록 — 선택 언어와 도구 본문 일치

2026-11-17 KST. 기존 번역 경로의 영어 선택·한국어 fallback·명시 재시도 복원을 완료했다. 실제 브라우저 **12/12**, JS pageerror·hydration·unhandled rejection 0, 독립 **29그룹**과 전체 타입 검사·생성기 검사를 통과한 미배포 체크포인트다. [실행 계약](plan.md).

한국어 서버 화면과 첫 렌더를 유지하고 저장 언어는 초기화 뒤 적용한다. 현재 필요한 영어 namespace/scope만 지연 로딩하며 언어 왕복으로 입력·원고·타이머·공유 URL을 초기화하지 않는다. 로딩 실패 시 한국어를 표시하고 명시 재시도를 제공한다. 잘못된 저장 언어·저장소 차단을 처리하며 `/energy-voucher/` 등 en 접두사를 영어 경로로 오인하지 않는다.

## 생성기와 원본 메시지

- 일반 namespace마다 ko/en JSON을 생성하고 KO 등록 모듈은 자기 EN 파일의 literal dynamic import thunk만 등록한다. `registerMessages(koNamespaces, loadEn?)`의 loader는 namespace wrapper를 resolve한다. 등록 자체는 영어 요청을 시작하지 않는다.
- 초기 EN namespace 390개를 추가한 뒤 실제 번들 실패 재시도 보완까지 반영해 생성물은 최종 1,578개다. public EN hash JSON 391개(shared 1·namespace 390)와 기존 shared/direct 8개만 담은 경량 manifest를 생성한다. direct scope 7개는 동일 namespace 자산을 재사용하며 전체 EN 카탈로그나 모든 URL 목록을 초기 번들에 넣지 않는다.
- `common.translationLoadFailed`·`common.retryTranslations`를 ko/en에 추가했다. 이모지 팁과 음력 사용법 EN 배열을 KO 원문의 4항목과 맞췄고 기존 뜻을 보존했다. [번역 조각](translations-runtime.json).
- `npm run messages:generate` 및 `messages:check` 1,578개 일치. 생성기·새 격리 검사 스크립트 범위 lint 오류/경고 0.

`node scripts/check-message-generation.mjs` 최종 6그룹을 통과했다. 실제 생성기를 격리 fixture에서 실행해 ko/en 완전 재구성·직접 scope·자기 EN literal/hash loader, EN 및 public 파일의 내용 불일치/누락/잔존 check 실패와 generate 복구, 원본 변경 후 hash 교체·이전 hash 정리, check의 파일 불변과 원본 보존을 확인했다. 생성 디렉터리의 실제 절대 경로가 workspace 내부인지 확인하고 stale 파일만 정리한다. 격리 fixture의 재귀 정리도 절대 경로를 확인한 뒤 실행했다.

독립 scoped 검사는 최종 1,578개 생성물·KO/EN 재구성, 28,287개 순수 legacy parity, 390개 자기 EN literal thunk와 hash 자산, 8개 scope manifest, 기존 6개 정적 graph의 전체 ko/en·registry·정적 EN 유입 차단을 통과했다. 기존 hook VM 호출은 순수 lookup 검사와 실제 React registry fixture로 분리했고 기존 보장을 축소하지 않았다.

## 발견한 경계와 수정 확인

실제 브라우저의 EN JSON 본문 chunk 차단에서 번들 실패 캐시 때문에 명시 retry가 같은 페이지의 영어를 복구하지 못하는 문제와, 320px retry 안내가 왼쪽 화면 밖으로 나가는 문제를 확인했다. root 승인으로 초기 literal import는 유지하고 이미 failed 상태의 명시 retry에만 hash JSON fetch를 사용하도록 보완했다. HTTP/JSON/object/잘못된 namespace 응답은 성공으로 처리하지 않는다. 실제 namespace chunk 실패→첫 JSON 503→두 번째 명시 retry 성공, shared 실패 뒤 새 소비자 자동 재시도 없음→shared/direct scope 복구를 통과했다. 모바일 안내는 x=21·right=299로 화면 안에 들어온 것을 확인했다.

독립 runtime 검사는 최초 19그룹(lookup 4·resource 5·실제 React 8·호출부 effect 2), registry KO 문자열/raw/보간 79,217경로 parity를 통과했다. 실패 자원의 늦은 소비자 마운트 자동 재시도는 최소 보완 뒤 추가 1그룹과 기존 영향 4그룹 재검증으로 해결했다. hash fallback의 helper/resource 6·registry/direct 연결 2·실제 생성 csatGrade 모듈/fuel wrapper 2를 추가해 총 **29그룹**이다. 반복 실행은 총 그룹 수에 중복 집계하지 않았다. 공용 정적 키 검사에서 발견한 InstallPrompt의 pwa namespace 전환 후 `common.close` 경로 누락도 별도 common 번역기로 수정해 조각 4키·정적 사용 17개 모두 오류 0을 확인했다. [독립 검토](independent-review.md).

호출부 감사에서는 Markdown 원고가 번역 예제와 같아질 때 저장본이 삭제되는 분류 경계와 Othello 마지막 수신 객체의 재처리를 최소 보완했다. 감사 11그룹·독립 실제 React 2그룹이 통과했다. 이는 전체 컴포넌트나 실제 WebRTC 검증을 대신하지 않는다. 제품 lint는 변경 전후 같은 Markdown 오류 1개·Othello 경고 8개를 유지하며 새 진단이 없다는 범위로 기록한다. [호출부 감사](locale-effect-audit.md).

## 실제 사용자 흐름과 최종 통합

브라우저에서 KO 메모→타이머→수능의 SPA 이동 동안 영어 본문 데이터 요청 0, 현재 수능 EN 선택 시 shared/csatGrade만 요청하고 이전 메모/타이머 영어 본문은 요청하지 않는 것을 확인했다. 이는 Turbopack async loader stub까지 0요청이라는 뜻은 아니다. 실제 본문과 loader/manifest를 구분하도록 검사 분류를 보완했다.

수능 점수·빈칸·기록·목표 초안·공유 URL, 메모 원고/제목/저장 JSON과 동일 textarea, 실행 타이머·pause/resume, Markdown의 영어 예제와 같은 사용자 원고가 언어 왕복 뒤 유지됐다. Header/Footer/ShareResult·동적 가이드·MobileResultLink와 직접 scope 연료/달리기의 영어 전환 및 입력/결과 보존을 확인했다. 저장 EN 새 방문의 KO 응답 HTML·초기화 후 EN, 늦은 EN 응답 뒤 KO 유지, 잘못된 언어/저장소 get/set 차단도 통과했다. [브라우저 보고서](review-browser.md) · [최종 12개 결과](browser/final-results.json).

- runtime 최종 16파일 및 생성기/격리 검사 범위 lint 오류·경고 0. 독립 수정 검사 파일 lint도 통과했다.
- messages:check 1,578개 일치. namespace apply 추가 0, audit 직접 등록 519·자식 경유 6·미해결 0, 기존 동적 안내 60개.
- Chrome 종료·19차 준비 파일 작성 단위 안정화 뒤 **2026-11-17 01:21:42 KST**, 가용 메모리 **5.31GiB**에서 `node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit` 실행 **exit 0**.
- 최종 범위 `git diff --check` 통과. [integration-checks.json](integration-checks.json) · [정적 키 검사](i18n-static.json).

InstallPrompt는 기존 layout에 mount되지 않아 실제 설치 팝업 표시는 이번 브라우저 검사에서 제외했다. namespace/닫기 키는 정적·독립 근거와 구분한다. 네트워크 실패 주입과 외부 광고/분석 차단의 예상 로그를 앱 예외로 오인하지 않는다. 실제 기기·실제 WebRTC·모든 도구 전수·운영 정적 export는 미검증이다. 기존 Markdown 오류 1개·Othello 경고 8개 외 LunarConverter effect 오류 4개·Notepad 오류 1개·TimerStopwatch 경고 1개도 남아 있어 전체 lint 성공을 주장하지 않는다.

완료 범위는 기존 번역 경로의 영어 선택·fallback이다. 서버 metadata/JSON-LD·직접 하드코딩 콘텐츠까지 모든 문구를 영어로 바꾸거나 영어 검색 색인을 완료한 것은 아니다. 빌드·배포·커밋·푸시는 하지 않았다. 다음 [19차 문서 도구](../2026-11-17-repeat-batch19/plan.md)는 이 타입 체크포인트 이후 부모를 연결해 별도 검증한다.

[설계](../../handoff/2026-11-17-i18n-restoration-design.md) · [현재 실행 큐](../../handoff/CONTINUOUS-IMPROVEMENT-2026-11-17.md)
