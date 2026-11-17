# 39차 순수 엔진 독립 대조 — 준비 단계

Root가 작성자 검사와 별도로 `check-regex-independent-core.mjs`를 작성해 현재 `executeRegexJob` API를 확인했다. 제품 수정은 하지 않았다. 아직 기존 화면 연결/전체 독립/브라우저 완료가 아니다.

- 고정22패턴·짧은11입력·9플래그와21치환 표현의 **45,738회**를 JS 내장 `String.replace`와 대조했다.
- 추출 **2,178회**는 `String.match().join('\n')`, 행 필터 **2,178회**는 동일 RegExp의 `line.match`와 대조했다. 출력과 전체 일치/행 개수가 일치한다.
- `g/y/gy/gu/gmu/gsy/u/v`, 비전역 캡처 출력, 빈 일치, Unicode·고립 surrogate, CRLF, `__proto__`/`toString` named group, `$0/$01/$09/$10/$12/$99`, named·앞뒤문맥·달러 이스케이프를 포함한다.
- `😀a`의 빈 전역 일치 인덱스는 Unicode `[0,2,3]`, UTF-16 `[0,1,2,3]`로 정확히 진행한다.

의미별 **4그룹 PASS**, 독립 JS lint 오류0·경고0. 모든 패턴은 고정이고 입력은 짧아 이 검사는 메인 Node 프로세스에서 제한 없이 큰/역추적 패턴을 실행하지 않는다. 엔진의 시간 초과·Worker 종료·큰 출력 한도·실제 UI는 작성자/후속 독립 단계의 별도 근거다. 기존 package module-type 경고 때문에 패키지 설정을 바꾸지 않았다.
