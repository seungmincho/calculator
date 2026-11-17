# 19차 완료 — 문서 비교·Markdown 복구

2026-11-17 KST, 미배포. 기존 두 도구의 구현·공용 통합·독립 25그룹·브라우저 14/14·전체 타입 검사를 완료했다. 타입 검사에서 발견한 Markdown 파일 취소 이벤트 연결 1건은 최소 수정과 영향 검사 후 해결했다. 빌드·배포·커밋·푸시는 실행하지 않았다.

## 달라진 동작

- /diff-viewer: 사용자가 비교를 실행하면 Worker에서 줄 단위 결과를 계산한다. 원문 줄 번호, 추가/삭제/유지 통계, 전체/변경 필터, 200줄 페이지, 전체 읽기용 TXT, 복사 실패 수동 선택을 제공한다. 편집 후 이전 결과임을 표시하며 취소·새 작업 뒤 늦은 응답을 무효화한다.
- 문서당 UTF-8 1MiB·10,000줄, 공통 앞뒤 줄을 제외한 sentinel 포함 DP 4,000,000셀까지 비교한다. 공백/들여쓰기와 마지막 개행은 구분하고 CRLF/CR/LF 형식은 정규화한다. TXT는 표준 patch가 아니며 원문 자동 저장이나 서버 전송을 추가하지 않았다.
- /markdown-editor: Markdown·HTML·서식 복사의 실제 실패 안내, 읽기 전용 수동 선택과 재시도를 제공한다. 1MiB까지 md/markdown/txt 파일 읽기의 실패·취소·역순 완료를 처리하고 이전 이미지/텍스트 읽기가 새 원고를 덮지 않게 했다. 기존 원고·미리보기·자동저장·다운로드·2MiB 이미지 제한과 18차 예제 기준을 유지했다.
- ko/en 조각과 showcase 설명을 병합했다. 두 페이지의 description/OG/Twitter/JSON-LD는 같은 상수를 사용한다. Diff의 단어 비교·Git 동일·붙여넣기 즉시 비교 주장을 실제 동작으로 정리했다. 메뉴 updatedDate는 2026-11-17이며 RSS·redirects·llms를 재생성했다. 기존 경로와 OG 이미지를 유지했다.

## 검증 근거

| 범위 | 결과 |
| --- | --- |
| Diff 자체 | 순수 비교 8그룹, Worker/client/copy 13그룹, 실제 UI 이벤트 harness 8그룹 PASS. 부모 연결 뒤 같은 영향 8그룹 재검사는 중복 집계하지 않음 |
| Markdown 자체 | actions 17그룹, 18차 locale effect 회귀 11그룹 PASS. 후속 native cancel 실제 effect DOM 이벤트 3그룹 PASS |
| 독립 검토 | 25그룹 PASS: Diff 12(순수 4·별도 Node Worker 3·복사 세대 수정 1·client/UI/부모 4), Markdown 13(순수 5·실제 부모/복구 8). native cancel 변경 뒤 기존 취소 1그룹 영향 재검사는 별도이며 26그룹으로 중복 집계하지 않음 |
| 실제 브라우저 | 14/14 PASS(Diff 7·Markdown 7), JS pageerror·hydration·unhandled rejection 0. 최종 checkedAt 2026-11-16T16:39:39.180Z, Chrome 종료 |
| 번역 | 77개 patch leaf/언어, 141개 정적 사용 대조 오류 0. 동적 키는 prefix 검사와 실제 렌더 검증을 결합. 생성본 1,578개 일치 |
| namespace | apply 추가 0, audit own 519·via child 6·미해결 0, 기존 동적 안내 60개 |
| lint | Diff 제품 범위, Markdown 4파일, 후속 cancel 부모/검사, 두 page/menu 공용 범위 오류·경고 0 |
| 전체 타입 | node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit exit 0. 01:44:40 KST 메모리 확인 6.47GiB, Chrome 종료·TS 편집 정지 후 실행 |
| diff | 제품·공용·생성물·보고서/인계 범위 git diff --check 통과 |

[Diff 구현](diff-implementation.md) · [Markdown 구현](markdown-actions-preparation.md) · [독립 검토](independent-review.md) · [브라우저 검토](review-browser.md) · [정적 번역 결과](i18n-static.json) · [통합 결과 JSON](integration-checks.json).

독립 비교는 14,400쌍 순수 수열 oracle과 별도 Node Worker를 사용했다. 브라우저에서는 native Worker가 실제 개발 번들을 통해 실행됐고 8,000줄 동일 문서·중간 한 줄 수정·200행 페이지·전체 TXT를 확인했다. Clipboard의 세 가지 native 형식, MD/HTML 다운로드, 실제 2×3 PNG 붙여넣기와 현재 원고 저장도 확인했다. 320px 다크 영어 화면에서 긴 표는 내부 스크롤하며 검사한 입력 16px·제어 44px와 원시 번역 키 없음이 확인됐다.

## 발견과 후속 확인

1. 독립 검토에서 새 비교 결과가 나온 뒤 이전 결과의 늦은 복사 성공 안내가 표시되는 P2를 발견했다. 결과 교체 시 복사 세대와 안내를 무효화하고 같은 실제 컴포넌트 재현이 통과했다.
2. 최초 전체 타입 검사(01:39:51 KST, 여유 6.4GiB)는 MarkdownEditor.tsx:356 input의 JSX onCancel이 React InputHTMLAttributes에 없다는 TS2322 1건으로 종료했다. ref effect의 native addEventListener('cancel')와 cleanup으로 연결했고 자체 DOM 이벤트 3그룹·독립 기존 취소 1그룹·범위 lint 후 전체 타입 재검사를 통과했다. 추가 Chrome을 열어 14개 전체 사례를 반복하지 않았다.
3. 초기 큰 입력 검사는 Playwright fill의 입력 단계에서 timeout과 renderer 메모리 증가를 관찰했다. Worker 생성 전 발생했으며 동일 8,000줄·UTF-8 한도 입력을 native Clipboard 붙여넣기로 확인하니 통과했다. 자동화 입력 조건의 실패와 실제 제품 동작을 구분했다. 브라우저 검증에서 추가 제품 결함은 확정되지 않았다.

## 범위와 다음 체크포인트

Clipboard/Worker/FileReader의 실패·역순 완료·timeout은 제어한 포트와 native 실행을 구분해 검증했다. 이미 OS에 전달한 Clipboard write 자체의 취소나 다른 앱 붙여넣기, 실제 휴대폰 선택 메뉴, 모든 기기의 Worker 성능을 보장하지 않는다. Worker 계산 중 특정 CPU 시점의 강제 중단 측정이나 운영 정적 export도 수행하지 않았다.

Markdown 부모의 기존 lint 오류 1개는 이번 안전한 상태 변경 래퍼 연결 후 해소됐다. 다른 도구의 이전 lint baseline까지 전체 통과했다고 주장하지 않는다. 이번 두 도구의 실제 영어 동작을 확인했지만 한국어 서버 metadata/FAQ와 모든 도구 전수 영어화는 범위 밖이다.

20차 음력 기념일·말하기 기록의 미연결 유틸과 21차 텍스트 history 준비 파일도 최종 타입 검사 시 안정 상태로 포함됐다. 이는 해당 기능의 부모 연결·브라우저 완료를 뜻하지 않는다. 다음은 [20차 계약](../2026-11-17-repeat-batch20/plan.md)에 따른 부모 연결과 독립/브라우저 검증이며 [현재 실행 큐](../../handoff/CONTINUOUS-IMPROVEMENT-2026-11-17.md)를 따른다.
