# 38차 공용 후속 — 공유 버튼의 현재 결과·실패 복구

> 실행 완료(2026-11-17): 실제 Chrome5/5·독립7그룹·06:24:34 KST 공통 전체 타입 재검사 PASS. 최종 [보고서](report.md)와 [통합 기록](integration-checks.json)을 따른다. 아래 최초 후보/계약 문장은 이력으로 보존한다.

2026-11-17 KST. 33차 구매 조건 비교의 공유 설계를 읽다가 발견한 기존 `ShareResult.tsx` 경계다. 기존 도구 개선 범위이며 새 경로가 아니다. 제품 미착수. 현재28/30 native/type 체크포인트를 먼저 끝내고 root가 공용 컴포넌트를 단독 소유한다. 31/32 부모 작업과 다른 파일에서 진행하고33 부모의 공유 연결 전 검증한다.

## 실제 코드 근거

- `save`는 `await renderShareCard` 뒤 입력 변경/언마운트 확인 없이 Blob URL·anchor click을 실행한다. reject는 처리하지 않는다.
- `share`는 카드 렌더 전에 정한 문구와 렌더 뒤 읽은 현재 `window.location.href`를 섞는다. 입력 변경/언마운트 뒤에도 네이티브 공유 또는 복사 fallback을 실행할 수 있다.
- `copy`는 native 실패 뒤 현재 요청 확인 없이 selection fallback을 실행하고, 오래된 성공 타이머가 새 안내를 지울 수 있다. 실패 안내만 있고 선택 가능한 원문/재시도는 없다.
- 기존 카드·CTA·파일명·링크 공유 구성과 native file→native text→링크 복사 순서는 유지할 대상이다. 공용 컴포넌트를 사용하지 않는 개별 도구의 복사 엔진을 이 작업에서 교체하지 않는다.

## 구현 계약

1. 사용자 클릭 때 카드의 문자열/행 배열, CTA·문구·파일명·실제 공유 URL을 복제해 하나의 요청에 둔다. 렌더·네이티브 공유·fallback·수동 복구가 같은 snapshot을 사용한다. 이미지 렌더가 실패하면 저장 실패를 표시하고 공유 버튼은 같은 링크의 복구로 이동할 수 있다.
2. 마운트/요청 세대와 props 의미값을 검증한다. 객체 identity만으로 매 렌더 무효화하지 않으며 카드/행 내용·명시 URL·공유 문구·파일명·언어가 바뀌면 이전 요청을 무효화한다. 선택한 조건 등 부모만 아는 상태에는 optional `resultKey`를 제공한다. 신규 prop이 없는 기존 소비자는 그대로 동작한다.
3. input 변경·새 요청·언마운트 뒤 늦은 결과는 네이티브 공유 호출, 자동 fallback, 다운로드 URL 생성/click, 안내를 실행하지 않는다. 이미 열린 OS 공유창·이미 click한 다운로드를 취소할 수 있다고 주장하지 않는다. 취소된 native AbortError는 오류나 복사 fallback으로 바꾸지 않는다.
4. 모든 실패를 잡고 저장 실패와 복사 실패를 구분한다. 복사는 native 성공 또는 legacy true만 성공, 수동 전체 링크 선택·현재 snapshot 재시도·닫기를 제공한다. textarea16px/조작44px, 키보드 초점·선택 실패 안내를 확인한다. 공유 URL을 원래부터 복사하던 계약이며 새 저장/서버 전송은 없다.
5. pending 작업/성공 타이머/생성 URL은 요청 소유권을 갖는다. cleanup은 자신의 타이머/URL만 정리하며 StrictMode effect replay 뒤 첫 사용자 행동이 무효화되지 않아야 한다. Blob URL은 다운로드가 시작된 후 충분한 기간 또는 언마운트에 해제한다.
6. 번역은 root가 KO/EN 조각을 함께 쓰고 통합 담당이 shared canonical/생성물을 병합한다. 다른 공용 도구/컴포넌트의 이벤트·내보내기를 함께 리팩터링하지 않는다. 빌드·배포·커밋은 하지 않는다.

## 연결 설계

`resultKey?: string | number`이며 카드 내용·rows·명시 URL·문구·파일명·CTA/언어·resultKey의 의미값으로 context를 만든다. 같은 내용의 새 props 객체는 요청을 취소하지 않는다. context별 요청 scope를 `useMemo`로 만들고 layout effect에서 활성화/정리한다. 다른 context로 갔다가 원래 값으로 돌아와도 이전 scope는 다시 살아나지 않는다. StrictMode setup/cleanup/setup 때는 활성화 세대가 달라져 과거 요청만 무효화하며 첫 사용자 동작은 정상 실행한다. UI state에 소유 scope를 함께 넣어 오래된 상태를 렌더하지 않는다.

다운로드 URL 소유권은 props context와 분리한 마운트 수명에 둔다. 이미 클릭한 정상 파일의 URL은 단순한 입력 변경으로 즉시 해제하지 않고30초 또는 실제 언마운트에 정리한다. 아직 renderer를 기다리는 요청은 최신 검사 뒤에만 URL을 만든다. 원래 renderer의 픽셀/카드5행 상한과 폰트 대기 로직은 바꾸지 않으며, 취소한 렌더 자체의 CPU 작업까지 중지했다고 주장하지 않는다.

기본 URL은 클릭 때 확정하고 뒤늦게 다시 읽어 문구와 섞지 않는다. 최신 여부 검사에서는 기본 URL이 아직 같은지도 확인한다. 부모가 effect보다 앞선 현재 입력을 정확히 공유하려면 명시 url과 resultKey를 전달해야 하며33은 이 경로를 사용한다. native 공유 UI가 이미 열리거나 download가 이미 요청된 시점 이후의 OS 행동은 취소 범위 밖이다.

제품은 root 소유 `ShareResult.tsx`와 필요하면 작은 `shareResultActions.ts`로 한정한다. KO/EN 새12키·기존 실패 안내1키 조각은 `translations-share-result.json`에 준비했고 공용 담당 통합 전에는 제품 준비와 구분한다. 실제 공용 부모4결함은 [수정 전 재현](before-fix.md)과 같은 이벤트의 `--after`로 확인한다.

## 검증

실제 공용 컴포넌트와 지연 renderer/clipboard/native share 포트로 현재 결과 변경·locale·명시key·동일 의미 새객체·URL snapshot·Strict replay·새요청·unmount를 검사한다. render reject/native throw/AbortError·canShare없음·clipboard거부·legacyfalse/throw·수동선택실패·재시도·옛 타이머가 새 상태를 지우지 않음을 확인한다. 실제 브라우저 대표 소비자에서 PNG decode/카드문구·다운로드/모바일320px KOEN·복사 원문을 검증한다. 실제 OS 공유창/다른 앱 전송은 가짜 포트 범위와 분리한다. 관련 범위 lint·번역감사·전체 타입 체크포인트 후 완료한다.
