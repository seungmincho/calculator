# 18차 실행 계약 — 언어 선택과 도구 본문 일치

2026-11-17 KST. [설계 조사](../../handoff/2026-11-17-i18n-restoration-design.md)에 근거한다. 17차의 전체 타입 검사 체크포인트 후 기존 공용 번역 경로를 수정한다. 새 영어 경로/SEO·전체 카탈로그 초기 로딩·페이지 전체 Suspense를 추가하지 않는다.

## 사용자 동작

English를 선택하면 현재 도구와 공용 UI가 기존 영어 원본을 사용한다. 처음의 정적 HTML과 첫 클라이언트 렌더는 한국어를 유지하며 저장 언어는 초기화 후 적용한다. 영어를 선택하지 않으면 영어 번역 파일을 요청하지 않는다. 필요한 네임스페이스만 지연 로딩하고, 앞서 한국어로 방문했던 모든 도구의 영어를 한꺼번에 가져오지 않는다.

번역 로딩 실패/키·타입 누락에는 한국어로 복구한다. 실패한 영어 내용을 명시적으로 다시 불러오는 안내를 언어 선택 가까이에 제공한다. 실패 Promise를 영구 캐시하거나 재렌더마다 자동 재시도하지 않는다. KO→EN 또는 EN 재선택도 재시도의 계기가 될 수 있다. 다른 언어를 선택한 뒤 늦게 도착한 응답이 현재 언어를 바꾸지 않는다.

점수·원고·타이머·저장 기록·공유 URL을 언어 전환으로 초기화하지 않는다. 실제 로케일/해당 카탈로그 변경 때만 번역 함수 참조를 바꾸며, 관계없는 도구의 번역 로딩으로 폼 effect를 다시 실행시키지 않는다. 저장소 차단/이상한 저장 언어에서도 기본 화면과 메모리 내 언어 전환은 동작한다. `/energy-voucher/` 등 단순 en 접두사 경로를 영어 페이지로 오인하지 않는다.

## 구현 소유와 순서

- **team_rotation:** 공용 runtime 단독 소유. `src/lib/i18n.ts`, `translationLookup.ts`, 신규 lazy/resource 모듈, `navigation.ts`, `shared.ts`, 기존 직접 scope wrapper, `LanguageContext.tsx`, `LanguageToggle.tsx`, 필요한 `InstallPrompt.tsx`의 명시 namespace 보완. 기존 API를 유지하고 `registerMessages(koNamespaces, loadEn?)`의 loader는 namespace를 감싼 `Record<string, unknown>`을 resolve하도록 통합 담당과 먼저 합의한다.
- **batch5_integrate:** `generate-scoped-messages.mjs`·원본 ko/en 메시지·생성물 단독 소유. 각 KO 등록 모듈이 자기 EN namespace의 리터럴 dynamic import만 등록하도록 생성한다. shared/직접 scope의 기존 경량 의존성을 유지한다. 로딩/재시도 안내 번역과 확인된 raw 배열 길이 차이 두 곳은 원문 내용을 보존해 ko/en을 맞추고, generator의 stale/check/reconstruction 계약을 유지한다.
- **writing_versions:** runtime과 분리해 순수 lookup/기존 scoped graph 검사·React fixture 검증을 소유한다. 기존 `check-scoped-translations.mjs`의 순수 VM oracle을 그대로 React hook처럼 호출할 수 없으므로 순수 조회와 registry React fixture를 분리하되 기존 중첩/raw/보간/누락/KO parity 보장을 축소하지 않는다. `[t]` effect에 의한 원고 재설정 위험을 실제 호출부에서 검토한다.
- **batch5_verify:** 실제 브라우저·네트워크·모바일·입력 보존 검증 담당. 17차 Chrome 종료 후 한 인스턴스만 사용한다. 수정 중인 runtime에 대해 먼저 실패를 최종 결함으로 기록하지 않으며 author ready 이후 실행한다.
- **root:** API/충돌 조율·기본 KO 요청량과 결과 검토·19차 순수 도메인 준비. 17차 도구 담당은 해당 검증 발견을 우선 수정한다.

17차 동안 새로 준비할 수 있는 코드는 **기존 제품에 연결하지 않은 독립 자원 상태 유틸**뿐이다. 기존 runtime·generator·context·메시지 등록 모듈을 17차 체크포인트 전에 변경하지 않는다. 독립 유틸도 전체 타입 검사 직전에는 작성 단위 완료/편집 정지를 통합 담당에게 알린다.

## 검증 계약

1. ko/en 생성물 완전 재구성·stale/check·namespace audit. 기존 layout/home/loan/salary/fuel/running의 정적 그래프에 전체 ko/en.json이나 namespace registry가 새로 연결되지 않아야 한다. 생성된 EN import는 자기 namespace에 한정한다.
2. 순수 문자열/raw/보간(0·false·빈 문자열) 계약, 누락·오타입 EN fallback, 배열 전체 fallback과 객체 보완, Provider 없는 KO SSR을 확인한다.
3. KO에서 EN 요청0, 동시 mount1회, 실패→KO 유지→명시 retry 성공, unhandled rejection0·무한 retry0, 늦은 응답·unmount·HMR·t 안정성. 저장 EN의 KO 첫 hydration, 잘못된 저장값/get/set 차단 및 en 경로 접두사 판정.
4. registry 대표(Csat/Grade·Notepad 또는 JSON·Timer), 직접 scope 대표(Fuel/Salary/Loan·Running 또는 Subsidies), Header/Footer/ShareResult/MobileResultLink, 동적 GuideSection과 InstallPrompt. 입력·동작 상태를 바꾼 뒤 언어 왕복과 새 도구 이동/새 방문을 확인한다.
5. 실제 KO→여러 도구 이동→현재 화면 EN 전환의 네트워크를 기록한다. 영어 파일 실패를 주입하고 화면의 재시도 버튼으로 회복하는지 확인한다. 320px에서 언어 선택/안내가 잘리지 않아야 한다.
6. 브라우저 종료 뒤 전체 tsc2GB·범위 lint·생성 검사·diff 검사. 빌드·배포·커밋·푸시는 실행하지 않는다.

완료 표현은 기존 번역 경로의 영어 선택·fallback 복원이다. 한국어 서버 metadata/JSON-LD·직접 하드코딩 콘텐츠까지 모든 문구를 영어로 바꿨거나 영어 검색 색인을 완료했다고 표현하지 않는다.

## 실제 번들 실패 후 재시도 보완 계약

실제 브라우저에서 EN JSON 본문 chunk만 차단하면 번들 로더의 실패 import가 캐시에 남아 같은 loader를 다시 호출해도 네트워크 재요청이 발생하지 않았다. root는 초기 literal dynamic import를 유지하고, 이미 실패한 자원에 대한 사용자 명시 retry에만 정적 EN JSON fetch를 사용하는 보완을 승인했다. 일반 재렌더·새 소비자 mount·최초 실패 직후에 자동 fallback하지 않는다.

정적 JSON도 원본 ko/en에서 생성하며 내용 hash가 포함된 파일명으로 public 아래에 둔다. 현재 필요한 namespace/scope만 요청하고 전체 EN 카탈로그는 추가하지 않는다. generated namespace 모듈은 자기 hash URL만 알고, 기존 shared/direct scope용 경량 manifest만 별도로 생성한다. stale 정리와 --check는 workspace 안의 정해진 생성 디렉터리만 대상으로 한다. 응답 HTTP/JSON/object/허용 namespace 검증 실패는 KO fallback과 실패 상태를 유지하며 거짓 성공으로 처리하지 않는다. 브라우저의 실제 최초 chunk 차단→명시 retry fetch→영어 복원과 모바일 안내 위치를 재검증한 뒤 최종 판정한다.
