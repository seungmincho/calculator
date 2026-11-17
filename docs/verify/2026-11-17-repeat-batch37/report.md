# 37차 완료 — 이미지 자르기 위치·늦은 읽기와 반출 보호

2026-11-17 KST. **실제 Chrome8/8·독립16그룹·제품 수정 후 전체2GB 타입 검사를 통과해 로컬 검증을 완료했다.** 운영 빌드·배포는 수행하지 않았다. [계약](plan.md) · [통합 기록](integration-checks.json).

이미지 자르기 위치·공통 geometry·실제 출력 한도·늦은 읽기/반출 보호를 연결했다. 준비16+실제부모9=25그룹, 기존 계산/Collage19layouts 회귀·제품/검사13파일 lint0이다. 독립14그룹(순수/adapter7+부모6+remount영향1)에서는 폐기한 adapter의 native encode와 새 adapter가 겹치는 경계를 발견했다. 같은 모듈의 공유 physicalWorkTail로 보완해 새 read/decode0·동시 encode1을 확인했다. 이후 root의 실제 자체↔ShareResult 교차 복사2그룹도 통과해 독립 합계는16이다. 이 추가 검사는 작성자 패치 후 실행했으므로 수정 전 재현을 주장하지 않는다. [구현](implementation.md) · [독립](independent-review.md).

최종 native는07:19:27 KST에8/8 통과했고 Chrome을 닫았다. 첫 실행의 clear→늦은 decode→재선택 React removeChild 오류는 빈 canvas 전용 host와 sibling placeholder로 분리해 해결했다. 극단1×8192의320px 화면이325px로 늘어나는 현상은 긴 표 행·복사 버튼 줄바꿈으로 보완했다. 모바일1흐름, 이후 입력 한도·clear/재진입·교차 복사3흐름만 재검사했으며 이전 통과 결과는 반복하지 않았다. 잘린 PNG가 반드시 decoder 오류라는 검증 가정은 실제 거부되는 PNG fixture로 바로잡아 제품 결함과 구분했다. [브라우저 결과](review-browser.md) · [원시 결과](browser/final-results.json).

실제9위치/37% crop·alpha/pad·4000² PNG319,513바이트·EXIF 방향 JPG830바이트·8MiB/16MP 경계·SPA remount 직렬화·Clipboard 양방향 지연 거부와320px KO/EN을 확인했다. JS/hydration/unhandled/React ErrorBoundary0이다. 합성 색 블록 사진과 실제 Canvas/Bitmap/toBlob/Clipboard를 사용했으며 지연 완료·null Blob은 제어 포트다. 모든 모바일 메모리·OS 코덱이나 교차탭 물리 작업 직렬화를 보장하지 않는다.

작성자47+공용9=56leaf·정적86사용0,36과 함께 생성/check1578·apply0·audit544+6/미해결0(기존동적60), 공용3파일 lint0, redirects472/RSS382/llms315도구45,771바이트·공용소스 diff0이다. description/OG/Twitter/JSON-LD·FAQ와 updatedDate17을 실제 한도·참고 오버레이/사진 위치 링크 제외에 맞췄다. native 보완의 추가 canonical 변경은 없다.

전체 타입은36 native 종료 뒤,37 native 시작 전에 실행했다.07:09:11 KST/free4.29GiB 첫 시도는 AspectRatio.tsx:79의 string→Zone TS2345 한 건으로 실패했다. readAspectQuery 반환형만 명시하고 URL/early-edit 영향1·파일 lint0 뒤07:13:07 KST/free4.45GiB에서2GB 전체 타입 재검사 exit0·진단0(9.02초)이다. **이후 DOM/스타일/복사 제품 TS를 수정했으므로 이 선행 결과를37 최종 타입 근거로 재사용하지 않는다.**

최종 전체 타입은37/39/40 native 종료와 모든 TS writer 동결 뒤08:08:20 KST/free3.79GiB에서2GB heap으로 실행했다. session26319 최종 exit0·진단0이며37 최신 제품과39/40 부모·미연결41/42/43 준비를 포함한다. 이 결과가 native 후 수정 코드의 최종 타입 근거다. 현재 범위 tracked diff도0이며 새 빌드·배포·dev 재시작·커밋·푸시는 하지 않았다.

계정은07:19 KST 사용99%/잔여1%/쿠폰1개였고, 사용자가 마지막 쿠폰을 직접 사용한 뒤 root가07:44 KST 사용0%/잔여100%/쿠폰0개·일반 사용 허용을 확인했다. 계정 전체 스냅샷이며 에이전트 초기화 실행은0이다.
