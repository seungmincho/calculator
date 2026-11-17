# 35차 PWA 캐시 보존·오프라인 응답 보고서

2026-11-17 KST. **완료: 작성자 actual source VM10그룹, root 독립3그룹, 실제 격리 SW5/5와 JS 범위/문서 검사 PASS.** [CSV 성능 후속](../2026-11-17-repeat-batch26/report-performance.md)·[29차 팀 편성](../2026-11-17-repeat-batch29/report.md)과 별도 JS 체크포인트다. public/sw.js와 JS 검사만 바뀌었으므로 전체 tsc·번역 생성·메타/발견 파일 생성을 반복하지 않았다.

## 수정한 세 경계

1. activate가 현 버전 이름 외 모든 Cache Storage를 지워 transformers-cache·webllm/model/config/wasm과 미지 캐시를 삭제하던 경계를 수정했다. 이제 숫자 버전의 정확한 Toolhub 소유 이름만 정리하고 현재3개 캐시와 모델/미지 캐시는 유지한다. 끝 개행·유사 prefix/suffix도 소유 이름으로 오인하지 않는다.
2. offline cache 조회 Promise를 truthy로 취급해 미캐시 navigation에서 undefined를 반환하던 경계를 수정했다. 최초 lookup이나 fallback lookup이 거부돼도 유효한 기존 캐시 Response 또는 생성 HTML Response를 반환한다.
3. 실제 mode=navigate Request를 RequestInit로 넘겨 constructor TypeError로 respondWith 전에 중단되던 기존 경계를 수정했다. 이미 정규화된 URL은 원 Request를 재사용하고 변경된 navigation만 명시 same-origin init으로 재구성한다. query·method·headers·credentials·cache·redirect·referrer/referrerPolicy·integrity·keepalive·AbortSignal을 보존한다. 비문서의 기존 복제/asset fallback 정책은 유지한다.

[계약](plan.md) · [작성자 구현/VM 근거](sw-implementation.md) · [root 독립 검토](root-independent-review.md).

## 검증 경계와 최종 결과

초기 VM9와 root2는 일반 cors Request 포트였으므로 실제 navigation의 constructor 제한을 놓쳤다. 단일 Chrome의 실제 SW에서 TypeError를 수집했고 [원본 결함 증거](browser/navigation-mode-original-defect.json)를 보존했다. 작성자는 수정 전 같은 constructor 실패를 추가 재현하고 최종 VM10으로 검사했다. root의 추가1그룹도 원 Request 재사용과 요청 속성·signal 보존을 독립 확인했다. 초기 VM 성공을 native 성공으로 확대하지 않는다.

[최종 실제 브라우저](review-browser.md) · [실행 결과](browser/final-results.json): **5/5 PASS**, checkedAt2026-11-16T20:36:55.873Z(05:36:55 KST). 최초 activate1개 통과는 유지하고, 수정 영향을 받는4개만 다시 검사했다. 원래5개를 재실행 건수로 중복 집계하지 않는다.

- 실제 install/activate에서 구 소유 캐시만 삭제하고 현재/모델/미지 캐시의 합성 내용을 보존했다.
- 방문한 문서 cache와 /offline/ cache가 실제 Response로 제공됐다.
- offline fallback이 없거나 lookup이 실패한 첫 문서도 **2,777byte HTML·status200·fromServiceWorker**로 응답했다.
- normalize가 필요한 native navigation의 query·합성 header·cookie 전달을 확인했고, 정상 static/dynamic과 API·POST·놀이공원 bypass 회귀도 통과했다.
- JS pageerror·Worker error·unhandled rejection0. 기존3039·개인 브라우저·운영 cache에는 접근하지 않았다. 무작위 localhost 포트·격리 컨텍스트의 합성 자료만 사용했고 최종 Chrome과 임시 서버를 종료했다.

동적 경로 fixture의 /tips와 기존 /tips/ 판별 불일치, favicon 부수 lookup까지 전체 횟수2로 고정했던 기대값은 테스트 조건 수정2건으로 구분한다. 해당 제품 정책을 바꾼 것은 아니다. Node 속성 제어 포트와 actual browser 증거도 구분했다.

## 변경 범위와 한계

범위 ESLint exit0·오류0이며 수정하지 않은 기존 push handler catch(e)의 unused 경고1은 남아 있다. JS 제품/검사·문서 범위 git diff --check exit0이다. 최종4문서 상대 링크135개·누락0과 문서 diff를 확인했다. 현재 public/sw.js SHA-256은 실제 브라우저가 검증한 소스와 일치한다.

캐시 버전은 **v4.35.16** 그대로다. 등록/업데이트 UI·모델 제거 버튼·IDB 연습 기록·패키지·canonical·빌드/배포를 바꾸지 않았다. 실제 모델을 다운로드하거나 개인/운영 cache를 삭제하지 않았고 운영 피해 빈도·실기기 전체 SW 구현을 인증하지 않는다. 다음 실제 배포의 버전 절차와 기존 승인을 이 로컬 검사로 대신하지 않는다. 빌드·배포·dev 재시작·커밋·푸시는 실행하지 않았다. [통합 상태](integration-checks.json).
