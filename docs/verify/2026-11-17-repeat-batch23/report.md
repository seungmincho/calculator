# 23차 완료 — 내 글 타자·다시 녹화

2026-11-17 KST. 두 기존 도구의 구현·공용 통합·독립 검토·브라우저 검증을 완료했다. 브라우저 **11/11(타자 5·녹화 6)**, 독립 **16그룹(각 8)**, JavaScript/hydration/unhandled 오류 0이다. Chrome 종료와 23차 제품·24차 미연결 준비 TS의 편집 중지 뒤 전체 타입 검사도 첫 실행에 통과했다. 미배포 체크포인트다.

## 구현 결과

- `/typing-test/`: 10~1,000 코드포인트의 내 글 초안, 줄바꿈/탭/반복 공백을 정리한 미리보기, 명시 적용, 독립 연습 결과를 추가했다. 작성 중 초안·다음 KO/EN 단위와 현재 확정 지문·시도를 분리한다. 다른 모드/언어 방문은 초안을 유지하며 모드 이탈은 진행 중 타이머를 정리한다. 명시 적용/retry/Esc 뒤 새 타자칸으로 초점을 옮긴다.
- 내 글은 기존 최고/일일/연속일/최근 기록에 합산하지 않고 원고를 URL·저장소·결과 요약에 자동 포함하지 않는다. 기존 네 모드·계산 엔진·기록을 유지하며 한글 조합 중 조기 완료와 오래된 타이머/콜백을 차단했다. 기본/내 글 결과 복사 모두 실제 성공·실패·수동 선택·재시도를 구분한다.
- `/screen-recorder/`: 마지막 성공 결과 1개를 이번 방문 동안 유지한다. 준비 취소·실패·빈 Blob은 이전 파일을 교체하지 않고, 새 유효 결과의 Blob/MIME/URL 확보 뒤에만 교체한다. 이전 파일은 새 시도 중에도 미리보기·다운로드할 수 있으며 명시 삭제는 ID를 다시 확인한다.
- 녹화 시도별 recorder/chunk/stream/context/타이머를 소유하고 취소 뒤 늦은 허용·이전 이벤트를 정리한다. 마이크 연결 실패 뒤에는 녹화 시작 전 마이크 없이 진행할지 선택하며, 요청한 옵션과 실제 연결한 트랙을 구분한다. 시간은 일시정지를 제외한 활성 구간이며 실제 영상 재생 길이와 같다고 보장하지 않는다.
- 두 page metadata/OG/Twitter/JSON-LD description을 동일 상수로 정리했다. 기존 OG 이미지를 유지하고 menu updatedDate(2026-11-17)·showcase·RSS/redirects/llms를 갱신했다. 기존 guide도 기본 연습 저장/공유와 내 글 메모리를 구분하고, 고정 VP9·시스템 음성 포함·자동 다운로드 단정을 실제 형식/트랙/명시 다운로드로 보완했다.

## 검사 근거

| 범위 | 결과 |
| --- | --- |
| 타자 자체 | 순수 9·실제 자식 8·초점 영향 1·부모 6 = **24그룹 PASS**, 기존 typing 회귀 PASS, 제품/검사 8파일 lint 오류·경고 0. [구현 기록](typing-custom-implementation.md) |
| 녹화 자체 | 상태/소유권 10·session 10·실제 adapter/부모 6 = **26그룹 PASS**, 제품/검사 10파일 lint 오류·경고 0. 제어 포트 검사이며 개인 화면/마이크 캡처 0. [구현 기록](screen-recording-implementation.md) |
| 독립 | 타자 8·녹화 8 = **16그룹 PASS**, 각 검사 lint 오류·경고 0. 추가 제품 수정 요청 없음. [타자](typing-independent-review.md) · [녹화](screen-recording-independent-review.md) |
| 번역 | 두 조각 **90 leaf/언어·정적 사용 169개·오류 0**. 기존 guide 보완은 같은 키/배열을 유지했다. 생성본 및 최종 messages:check **1,578개 일치** |
| namespace | apply 추가 0, audit own 531·via child 6·미해결 0, 기존 동적 안내 60개. 다음 배치 준비 자식도 트리에 포함되므로 등록 수를 현재 기능 개수로 해석하지 않는다 |
| 공용 검사 | 두 page/menuConfig lint 오류·경고 0. discovery redirects 472규칙·RSS 382항목·llms 315도구/45,320byte |
| 전체 타입 | `node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit` **첫 실행 exit 0**. 시작 전 `2026-11-16T17:54:23.083Z`(11/17 02:54 KST), 여유 5.54GiB. 안정된 24차 미연결 준비 TS 포함 |

## 실제 브라우저

[브라우저 보고서](review-browser.md) · [원본 결과](browser/final-results.json). 최종 `checkedAt=2026-11-16T17:51:29.051Z`, **11/11 PASS**, 오류 0, Chrome 종료. 관련 경계를 한 흐름에 묶었으며 모바일 재확인과 root 시각 검토는 별도 그룹으로 더하지 않았다.

- 타자는 9/10/1,000/1,001 코드포인트·emoji·공백 정규화·원문 무잘림과 명시 적용을 확인했다. 실제 영어 입력 및 합성 한글 composition에서 마지막 글자 확정 후 완료 1회·기존 기록 문자열 불변을 확인했다. 기본 daily 정상 완료는 기존 기록/일일 횟수 각각 1 증가한다.
- 기본→내 글 이탈 뒤 숨은 완료/기록 0, 초안/단위 편집과 확정 지문의 분리, 언어 전환 중 타이머 1개·retry/Esc/이탈 뒤 0을 확인했다. native Clipboard 요약에서 원고/URL 제외, 실패→수동 선택→재시도와 늦은 거부 무효화도 통과했다.
- 검증 캔버스의 `captureStream`→native MediaRecorder VP9→실제 **WebM 38,759byte/320×180**을 생성했다. EBML header·MIME·파일명·video readyState 4·재생 시간 증가, 다운로드와 미리보기 Blob 바이트 일치를 확인했다. [실제 검증 영상](browser/synthetic-canvas-recording.webm).
- display 거부·constructor/start 실패·빈 chunk·URL 생성 실패 뒤 이전 ID/URL/메타데이터와 실제 다운로드를 보존했다. 준비 취소의 늦은 display, mic 대기 중 display ended와 늦은 mic, 이탈 뒤 허용도 정리됐다.
- 마이크 실패의 명시 선택과 시스템 트랙 미제공 안내, 검증용 무음 트랙의 실제 AudioContext 합성·context close·tracks 종료를 확인했다. 오류 뒤 늦은 data/stop, 이전 recorder 이벤트가 새 시도/성공 파일을 바꾸지 않았고 현재 track ended는 정상 결과로 종료했다.
- 두 도구 320px 다크·실제 EN, 입력 16px·주요 버튼 44px·넘침 없음과 타자 apply/retry/Esc 실제 DOM focus, 현재 녹화와 이전 결과 구분을 확인했다. root도 모바일 캡처를 검토해 추가 시각 결함이 없음을 확인했다.

초기 타이머 검사는 Playwright clock이 interval 관찰 함수를 덮은 테스트 코드 문제였다. 기존 timer API를 유지하고 읽는 시각만 이동하도록 해당 검사만 보완했다. 마지막 모바일 2개는 초점/재생 후 캡처 증거를 보강했고 11개에 중복 집계하지 않았다. 독립·브라우저 검증에서 새 제품 수정 요청은 없었다.

## 범위와 다음 단계

OS 선택창·개인 화면·실제 마이크 요청은 0회다. 화면/마이크 반환은 검증 캔버스와 무음 트랙으로 대체했고 MediaRecorder·AudioContext·Blob·다운로드·영상 재생은 네이티브 구현을 사용했다. 권한/오류/늦은 콜백/시계 이동은 제어 주입이다. 실제 모바일 한글 IME·물리 마이크 음질·OS 캡처 지원·영상 재생 길이와 표시 시계의 완전 일치·정적 export를 검증했다고 확대하지 않는다.

범위 diff와 완료 인계는 [통합 검사 기록](integration-checks.json)에 남긴다. 저장소 전체 lint 통과를 주장하지 않는다. 새 경로·패키지·서버·빌드·배포·커밋·푸시는 추가하거나 실행하지 않았다. 다음은 [24차 PDF 이력·비밀번호 복구](../2026-11-17-repeat-batch24/plan.md)이며 새 부모 연결의 완료에는 별도 검사 증거가 필요하다.
