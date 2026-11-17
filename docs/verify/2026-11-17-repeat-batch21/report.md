# 21차 완료 — 텍스트 단계 이력·QR 이미지 순차 읽기

2026-11-17 KST, 미배포. 두 기존 도구의 구현·공용 통합·독립 검토·브라우저13/13·전체 타입 검사를 완료했다. 같은 query의 앵커 이동과 QR 취소/복사 세대 경계를 보완하고 영향 사례를 확인했다. 빌드·배포·커밋·푸시는 하지 않았다.

## 달라진 동작

- 텍스트 변환기는 기존 규칙을 유지하며 단계 위아래 이동·개별 삭제·추가·전체 초기화를 최대30개 메모리 이력으로 되돌리거나 다시 실행한다. 원문과 작성 중인 찾기/치환/앞뒤 문자열은 단계 이력으로 덮지 않는다. flags/options/affix/shuffle seed를 보존하고 no-op은 이력을 만들지 않는다.
- 같은 query의 hash 이동은 private 단계·seed·undo/redo를 유지하고 실제로 다른 공유 query를 불러올 때 새 이력 기준으로 복원한다. URL은 기존 simple/list 설정만 포함하며 원문·replace/affix 문자열·이력·섞기 결과까지 모두 재현한다고 설명하지 않는다. 원문 입력창의 기본 undo와 단계 영역 단축키를 구분한다.
- QR 이미지 탭에 한 장/여러 장을 제공한다. 최대10개·개당8MiB·합계40MiB·원본16,777,216픽셀, PNG/JPEG/WebP/GIF를 한 파일씩 명시 처리한다. signature/header와 디코딩 후 크기를 확인하고 처리 긴 변을2,048px까지 줄인다. 애니메이션은 한 프레임이며 모든/첫 프레임을 보장하지 않는다.
- native qr_code 지원/생성/실행/미검출을 확인해 필요할 때만 자체 jsQR Worker로 한 번 대체 처리한다. 파일 전체20초·native3초·Worker10초 한도, 취소·새 선택·탭 전환·언마운트의 세대/자원 정리를 적용한다. 파일당 처음 읽힌 QR 한 개를 표시하며 모든 QR·위치 순서·유일성을 보장하지 않는다.
- 파일별 상태와 실패 재시도, 성공 결과의 명시 선택 TXT, 복사 실패 수동 선택을 제공한다. 같은 이름/내용도 별도 행이며 payload의 공백·개행·탭을 보존한다. batch 원본/결과를 URL·최근 기록·서버에 자동 반영하지 않고 http/https 링크도 명시 클릭만 허용한다.
- 기존 카메라/단일 이미지/최근20개 정책을 유지하며 늦은 스트림·읽기 결과, 손상 이력과 저장 실패를 보완했다. 부모 기록과 batch 결과 복사는 하나의 세대로 연결한다.
- ko/en·showcase와 두 page metadata/OG/Twitter/JSON-LD를 맞췄다. QR FAQ/본문은 최종 한도·파일당 한 결과·선택 TXT 범위로 정리했다. 메뉴 updatedDate는2026-11-17, RSS/redirects/llms를 재생성했고 기존 경로/OG를 유지했다.

## 검증 근거

| 범위 | 결과 |
| --- | --- |
| 텍스트 자체 | 도메인14·자식8·부모actual-event/URL7그룹, 기존 text-convert 회귀 PASS. 같은 영향 재실행은 중복 집계하지 않음 |
| QR 자체 | 18그룹 PASS: 순수/실제 Node Worker 픽셀7, 실제 batch+제어 I/O6, 실제 client/image/copy+제어 포트5 |
| 독립 텍스트 | 실제 부모/자식 제어 fixture6그룹 PASS. 수정 뒤 최초 독립 실행이며 hash 결함의 수정 전 실행 증거로 주장하지 않음 |
| 독립 QR | 취소4경계·실제 부모↔batch 복사3그룹 PASS. 코드 읽기와 native 브라우저 성능을 구분 |
| 실제 브라우저 | 13/13 PASS(텍스트6·QR7), JS pageerror·hydration·unhandled rejection0. checkedAt2026-11-16T17:17:20.578Z, Chrome종료 |
| 번역 | patch leaf75개/언어·정적 사용132개·오류0, 생성본1,578개 일치. 동적 키는 prefix 검사와 실제 렌더를 결합 |
| namespace | apply추가0, audit own525·via child6·미해결0, 기존 동적 안내60개 |
| lint | 텍스트6파일, QR제품10+검사3파일, 공용 두 page/menu 오류·경고0. 별도 독립 검사 결과는 각 보고서에 기록 |
| 전체 타입 | node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit 첫 실행 exit0. 02:19:58 KST 메모리 확인5.98GiB, Chrome종료·TS편집정지 |
| diff | 제품·의존성·공용·생성물·문서/인계 범위 git diff --check 통과 |

[텍스트 구현](text-history-implementation.md) · [텍스트 독립](text-history-independent-review.md) · [QR 구현](qr-implementation-report.md) · [QR 독립](qr-independent-review.md) · [브라우저 검토](review-browser.md) · [정적 번역](i18n-static.json) · [통합 JSON](integration-checks.json).

실제 텍스트에서는 trim/dedupe 순서에 따른 결과 차이,35회 편집 후30회 undo/redo 한도, no-op·redo 분기, private 옵션/seed/원문 보존,100,001자 REGEX_MAX, 키보드/focus/IME를 확인했다. 실제 앵커 뒤로/앞으로와 다른 query 복원도 구분했다.

QR은 native 미지원 환경에서 자체 번들 Worker와 실제 PNG 픽셀로 원문을 복원했다. 명시 시작 전 Worker0, RGBA transfer 후 main buffer0, 파일별 종료를 확인했다. 선택 TXT550바이트가 독립 기대값과 일치했고 파일명 헤더의 개행만 정리하며 payload는 보존했다. 320px 다크 영어 화면에서 검사한 필드16px·신규 제어44px·가로 넘침/원시 키 없음이 확인됐다.

## 의존성·발견·영향 재검증

- jsqr는 npm 정확버전1.4.0, Apache-2.0, 자체 TS 선언과 runtime dependencies 없음으로 확인했다. 설치 전후 비교에서 package.json의 jsqr 추가와 lock 루트/jsqr 엔트리만 바뀌었다. 기존 dirty 변경은 보존했다. [설치 비교](install/install-diff.json), [라이선스](../../../public/licenses/jsqr-1.4.0.txt). 설치는 QR 담당이 수행했고 새로운 lockfile/패키지 관리 도구를 만들지 않았다.
- Worker 격리 esbuild 측정은 minify131,756바이트/gzip47,807바이트였다. 실제 Next production chunk나 초기 전송 크기로 해석하지 않는다. 초기 React 도구 코드에 jsQR을 직접 import하지 않고 Worker에만 둔다.
- 같은 query의 hash-only popstate가 private 단계와 이력을 초기화할 수 있는 경계를 실제 query 변경 때만 복원하도록 보완했다. URL 브라우저1개 영향만 재확인했으며 최종13개에 별도 중복 가산하지 않았다.
- 이미 취소된 exported 유틸에 시작된 Promise를 주면 늦은 reject를 회수하지 못하고 파일 읽기를 불필요하게 시작하는 경계를 독립 재현했다. pre-aborted handler 회수와 arrayBuffer 전 취소 검사를 추가해4경계/unhandled0을 확인했다. 일반 사용자 클릭에서 같은 순서를 재현했다고 주장하지 않는다.
- 부모 기록↔batch의 늦은 Clipboard 거부가 최신 복사에 영향을 주지 않게 공유 세대를 연결했다. 독립3그룹과 실제 브라우저 양방향 실패에서 추가 legacy fallback0·오래된 복구 안내0을 확인했다. 이미 OS에 제출한 쓰기 자체를 취소한다는 뜻은 아니다.
- 복사 성공 뒤 버튼 이름이 바뀌는 선택자 timeout은 테스트를 고쳐 해당1개만 재실행했다. 제품 결함과 구분했다.

## 확인한 한계와 다음 작업

같은 크기의 QR 두 개를 가까이 놓은 fixture는 로컬 Node jsQR에서 미검출이었다. 비대칭512/128px fixture는 Node와 Chrome에서 유효한 한 결과를 반환했다. 복수 QR의 성공을 일반화하지 않고 잘라 다시 선택하도록 안내한다. 큰 이미지 축소로 작은 QR이 미검출될 수 있다.

Native BarcodeDetector 성공/실패와 단일 결과는 제어 구현이며 Worker fallback은 실제 픽셀이다. 카메라는 합성 canvas MediaStream으로 tracks 종료를 확인했고 실제 하드웨어 권한/촬영 품질을 검사하지 않았다. Worker의 postMessage 지연·가상 timeout·늦은 응답 주입은 실제 생성/종료와 구분한다. CPU 내부 특정 명령 시점 중단이나 native decoder 내부 계산의 강제 취소, 모든 기기 성능을 보장하지 않는다. 이전 history의 Web Locks 미지원 CAS/readback도 완전한 다중 탭 원자성은 아니다.

실제 휴대폰·OS 앱 붙여넣기·운영 정적 export는 수행하지 않았다. 최종 타입에는 안정 상태의22차 직접 등급·이미지 queue/names/ZIP 미연결 준비 파일도 포함됐으며 해당 기능의 부모/브라우저 완료 증거는 아니다. 다음은 [22차 계약](../2026-11-17-repeat-batch22/plan.md)의 부모 연결이며 [현재 실행 큐](../../handoff/CONTINUOUS-IMPROVEMENT-2026-11-17.md)의22→23→24순서를 따른다.
