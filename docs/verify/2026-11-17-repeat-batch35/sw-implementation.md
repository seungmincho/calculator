# 35 서비스 워커 캐시 보존·오프라인 응답 보완

2026-11-17 KST. **`public/sw.js` 최소 수정과 실제 소스 VM 검사 완료. SW 제품 파일은 안정 상태다.** 캐시 버전은 기존 `v4.35.16` 세 값 그대로이며 등록/업데이트 UI·모델 삭제·연습 기록·canonical·28 부모는 이 작업에서 바꾸지 않았다. 실제 사용자/운영 Cache Storage에 접근하지 않았고 브라우저·빌드·배포를 실행하지 않았다.

## 변경

activate는 `toolhub-v<숫자[.숫자…]>`, `toolhub-static-v<…>`, `toolhub-dynamic-v<…>` 전체 이름과 정확히 일치하는 캐시만 소유한 것으로 본다. 현재3개 이름은 보존한다. 정규식 끝은 마지막 개행 앞도 매칭하는 `$` 대신 strict end assertion을 사용해 `toolhub-dynamic-v1\n` 같은 미지 이름도 보존한다. transformers/webllm 및 prefix/suffix·모델·미지 캐시는 삭제하지 않는다.

navigation 네트워크 실패 뒤 `/offline/` 조회 결과를 실제로 기다려 캐시 Response 또는 기존 `generateOfflinePage()` HTML Response를 반환한다. lookup rejection도 캐시 부재로 처리한다. Cache Storage 전체 접근이 실패할 때 최초 요청 조회부터 reject될 수 있으므로 최초 lookup 역시 cache miss로 처리해 기존 network→offline 경로로 진행한다. 정상 캐시 hit/동적 갱신/200 응답 저장/408 asset fallback/API·외부·놀이공원 제외 정책은 유지했다.

설치된 `node_modules/@huggingface/transformers/src/utils/hub.js:452`의 `transformers-cache` 사용과 `src/lib/speaking/client.ts:112`의 webllm/model·config·wasm 명시 삭제 범위를 읽어 계약 근거와 대조했다. 라이브러리나 해당 제품 파일은 수정하지 않았다.

## 실제 소스 VM 증거

`node scripts/check-service-worker-cache-policy.mjs` — **10그룹 PASS**. 문서 fixture는 이제 기본 `mode=navigate` 속성을 가진 실제 Request를 사용한다.

1. 현재3개·구 버전4개·모델/미지15개를 섞어 activate 실행. 정확한 구 소유 이름만 삭제하며 모델/미지 캐시의 객체와 합성 바이트를 그대로 보존한다.
2. `/offline/` 없는 첫 경로 navigation은 undefined 대신 HTML Response.
3. `/offline/` 캐시가 있으면 기존 Response 내용/헤더 유지.
4. offline lookup만 reject 또는 Cache Storage 전체 reject 둘 다 생성 HTML Response.
5. trailing-slash 정규화 캐시 hit와 기존 정규 경로의 dynamic background refresh 유지.
6. 정상 network200 캐시 저장, non-200 미저장.
7. POST·외부·API·세 놀이공원 경로는 intercept하지 않음.
8. install 중 offline 파일 하나 다운로드 실패 후 첫 offline navigation도 유효 Response.
9. 비문서 offline asset miss는 기존 빈408 Response 유지.
10. native navigation의 주소가 바뀌면 same-origin 요청으로 정규화하면서 GET·headers·credentials·cache·redirect·referrer/referrerPolicy·integrity·keepalive·signal 전파를 유지한다. query는 보존하고, 주소가 그대로면 원 Request 객체를 재사용하며 비문서 요청은 기존 복제 방식을 유지한다.

수정 전 동일 actual SW VM 검사에서 모델/unknown 삭제와 offline undefined를 재현했다. 초기 dynamic 검사 한 건은 기존 동적 패턴이 trailing slash를 포함하는데 fixture가 슬래시 없는 경로를 사용해 실패했다. fixture를 기존 정상 경로로 고쳐 **이 영역의 제품 동작은 변경하지 않았다**. 합성 재현을 운영 장애 빈도나 사용자 다운로드 손실 건수로 확대하지 않는다.

`npx eslint public/sw.js scripts/check-service-worker-cache-policy.mjs` — exit0·오류0, **기존 push handler의 미사용 `catch (e)` 경고1**. 수정 전 읽은 SW에도 같은 catch가 있었으며 이 두 수정과 관계없는 handler를 변경하지 않았다. 신규 검사 파일 단독 lint도 별도 확인한다. Cache version 자동 증가/등록/production/cache 삭제 실행은 없다.

## 실제 Chrome에서 드러난 navigation 경계와 보완

최초 VM의 문서 요청은 destination만 document이고 mode는 cors였다. 전담 verifier의 임시 localhost 실제 SW 실행은 `new Request(url, event.request)`에 mode=navigate가 전달되면서 TypeError가 나는 기존 결함을 재현했다. `browser/navigation-mode-original-defect.json`에 실제 worker error와 fetch 속성이 보존돼 있다. 이 때문에 처음9그룹 PASS를 native navigation 성공의 증거로 취급하지 않는다.

실제 Request에 navigate 속성을 부여한 추가 VM 검사는 수정 전 같은 TypeError로 실패했다. 수정 후 주소가 같으면 원 Request를 재사용하고, 변경된 navigate 주소에만 명시적인 same-origin RequestInit을 사용한다. 요청 속성과 원 `event.request.destination` 기반 offline 판정은 보존한다. 전체10그룹과 범위 lint를 재확인했고 오류0·기존 push catch 경고1만 남았다. 캐시 정책/동적 무슬래시 판정/API 제외/버전은 추가 변경하지 않았다.

전담 verifier의 영향4흐름 재검증은 모두 통과했고, 최초 activate 보존을 합쳐 실제 Chrome **5/5 PASS**다. 실제 navigation의 동일/정규화 주소·query/header/cookie, cached/missing/rejected offline HTML, cache lookup 거부 뒤 network 복구, 기존 static/dynamic/API/POST/놀이공원 정책을 확인했다. 합성 favicon 요청 때문에 lookup 총횟수를 잘못 가정한 fixture는 대상 경로별 검사로 고쳤으며 추가 제품 변경은 없었다. Chrome과 임시 서버는 종료됐다. 현재 Next 개발 서버와 사용자 캐시는 대상이 아니며 SW 파일은 안정 상태다.
