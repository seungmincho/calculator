# 55차 QR 묶음 인쇄 — 독립 검토

2026-11-17. **독립8그룹 PASS, 재현 제품 결함/수정 요청 없음**. 제품 TypeScript·canonical·기존 단일 QR 인쇄·공유 host를 변경하지 않았다. 검사와 보고서만 docs55에 작성했다.

## 검증 경계

`check-qr-print-independent.mjs`는 제품 순수/controller를 독립 번들한다. 작성자 주입 `mount` 함수로만 확인하지 않고, 기본 `mountPrintDocument` 실제 코드를 실행해 iframe 생성·document open/write/close·이미지별 decode·frame window print·afterprint·remove의 제어 DOM을 제공했다. 실제 Chrome/브라우저 레이아웃/프린터 시험을 했다는 뜻은 아니다.

부모3그룹은 작성자의 `qr-batch-parent-harness.mjs`에서 제품 연결/기본 포트만 재사용하고 assertions/기대값은 별도로 작성했다. 실제 qrcode/JSZip를 사용하며 인쇄 문서 포트만 제어한다. 공유 component harness는 그대로이며 작성자의 dynamic import 변환 wrapper도 변경하지 않았다.

## 검사 결과

1. **1~30개 별도 페이지 oracle**: 각 `ceil(n/6)` 페이지, 마지막 `(n−1)%6+1`개, 번호1..n/중복 없이 원래 순서. raw payload 평문이 HTML에 없음, 외부 src/script/font/css 요청 없음. 코드포인트48 경계(47이모지+HTML문자), 이름 없는 행은 row 표시, HTML escape, frozen snapshot과 factory가 아닌 복제 plan 거부.
2. **원본/결과 일치**: line/label/payload/bytes/filename/error 각각 불일치, 재정렬·누락, 원격/SVG/삽입문자/길이초과 data URL에서 plan 거부.
3. **실제 기본 iframe mount**: offscreen/aria-hidden/tabIndex 확인, 이미지3개 역순 decode의 마지막까지 print0, 512 검증 뒤 focus/print1. afterprint는 자기 listener와 frame만 제거하며 외부 DOM 노드를 보존. 반복 cancel에서도 remove1, timers0.
4. **실제 DOM/이미지 실패**: contentWindow 없음, open/write/close 실패, 빈 이미지, 잘못된512치수, decode reject, print throw 모두 failed/print0/자기 frame 제거/timer0. 부분 QR 문서 성공 없음.
5. **취소/시간/소유권**: mount 전 cancel은 iframe0, 15초 타이머 이후 늦은 decode는 print0. current owner 상실, 이전 afterprint가 새 문서에 영향0, 120초 cleanup, print 내부 동기 afterprint까지 소유 문서만 제거.
6. **실제 부모 취소→ZIP/재인쇄**: 입력의 공백·추가 탭을 유지한 서로 다른 두 payload, print 준비 취소 후 preview PNG 문자열 동일. native JSZip 재파싱으로 두 filename·PNG base64 bytes 원본과 동일, 재인쇄는 새 frame만 두 코드 순서대로 호출.
7. **실제 부모 편집/locale ABA/unmount**: 준비 중 원문 교체·KO→EN→KO·unmount 뒤 old decode print0, dispose1. old print handler는 새 view에서 시작0. locale 전환은 기존 QR bytes를 유지. unmount 후 검사 host를 다시 render하지 않고 완료만 기다렸다.
8. **실제 부모 생성 원자성**: 첫 PNG 진행 중 print disabled/공개 이미지0, 입력 교체 후 old generation은 인쇄 가능 결과를 만들지 않는다. 새 생성은 새 이름/1셀만 인쇄하고 QR payload를 문서 text로 넣지 않는다.

```text
node docs/verify/2026-11-17-repeat-batch55/check-qr-print-independent.mjs
npx eslint docs/verify/2026-11-17-repeat-batch55/check-qr-print-independent.mjs
```

최종 결과는 `independent-print-results.json`의8개 PASS다. 부분 이름 인자를 주는 영향 검사는 별도 `independent-print-impact-results.json`을 사용해 전체 집계를 덮지 않는다. 첫 lint에서 검사 VM holder의 `module` 변수명이 Next lint 규칙1건에 걸려 `compiledModule`로 변경했고, 제품 변경 없이8그룹을 재확인했다. 최종 MJS ESLint exit0/경고0이다.

## 남은 검증의 한계

A4 mm 계산은 CSS 읽기에서 2×90mm+6mm=186mm, 3×86mm+6mm=264mm 및 footer6mm가 sheet272mm 안에 들어감만 대조했다. 실제 PDF 페이지 수/줄잘림·한글 폰트·원본1000바이트 QR의 인쇄 후 재인식·320px·기존 단일 QR 인쇄 회귀는 native 담당자가 확인한다. 이 독립 검사로 실물 인식률/특정 프린터의 배율/이미 열린 OS 인쇄 창 취소를 보장하지 않는다.
