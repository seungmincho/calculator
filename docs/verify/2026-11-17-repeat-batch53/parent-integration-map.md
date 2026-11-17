# 53차 ColorConverter 부모 연결 지도

상태: **root 09:43:59 타입 체크포인트 뒤 부모 연결 완료·작성자8그룹/lint0·TS 재동결**. 실제 구현·검증 한계와 최종 선택자는 implementation.md를 따른다. `before-fix.json`/probe와 원래 부모 SHA는 보존한다. 미연결 pure 작성자 5그룹(4096 shorthand)·독립 6그룹의 범위와 실제 부모 완료를 구분한다.

## 소유·변경 지점

| 현재 부모 지점 | 연결할 동작 |
|---|---|
| 단일 `hex` state·내부 변환함수 6개 | `draft`, `lastValid=#3B82F6`, 초기 `ready=false`, URL 안내·edit revision 모델로 교체. 계산은 root `colorConversion.ts` 재사용 |
| `colorValues`가 invalid에서 null | `convertOpaqueColor(lastValid)`는 항상 유효. invalid raw draft는 지우거나 잘라내지 않으며 결과·슬라이더·picker는 마지막 유효 색 유지 |
| raw `backgroundColor`/color input | 검증된 canonical `#RRGGBB`만 전달. 원문은 text input에만 전달 |
| picker/preset/RGB/HSL/random | 단일 `commitColor(hex)`로 draft+lastValid+반출 세대+URL을 함께 갱신. 기존 integer 반올림 유지 |
| text input onChange | raw를 그대로 보존. 3/6 HEX가 유효하면 lastValid 갱신, 아니면 결과를 유지하고 오류+안내 표시. alpha/CSS 표현식은 추정·삭제하지 않음 |
| `handleCopy` 5개·copied string | 공용 `copyShareResultLink`와 `createShareResultRequests` 재사용. 정확한 표기 snapshot·현재 owner/token을 갖는 피드백·실패 복구 |
| 공유/URL 없음 | `?color=RRGGBB`만 소유하는 초기 복원/명시 링크와 실제 ShareResult. 전역 공용 컴포넌트는 수정하지 않음 |
| glass/pink/작은 preset10열 | 토큰 카드·브랜드 선택 상태·44px·16px·모바일5열·연결 label. 실제 색 swatch/색축만 콘텐츠 색 사용 |

제품 소유는 `ColorConverter.tsx`, 필요할 경우 작은 `ColorCopyRecovery.tsx`, 준비된 `colorConversion.ts`의 최소 연결 보완, 새 실제 부모 MJS/KOEN 조각이다. canonical/generated/menu/page는 integrate 담당이다. 새로운 계산 패키지·CSS 전체 파서·RGB 문자열 입력·알파·팔레트 저장·route는 추가하지 않는다.

## 입력·표기 계약

- text input은 # 생략/앞뒤 공백/대소문자/정확한 3·6자리 HEX를 허용한다. 유효 원문도 타이핑 즉시 대문자/6자리로 덮어쓰지 않아 커서와 원문을 보존한다. 결과와 URL만 canonical이다.
- **기존 `maxLength={7}`은 제거한다.** `#12345678` 붙여넣기를 `#123456`으로 잘라 유효 색으로 오인하면 안 된다. alpha 4/8자리와 긴 invalid 원문을 모두 보존한 뒤 parser가 거부하며, native paste 후 값이 잘리지 않는지 후속 브라우저에서도 확인한다.
- invalid/빈/4·8자리 alpha 입력은 인라인 오류와 마지막 색 안내를 보여 준다. `마지막 색으로 되돌리기`를 명시적으로 누르면 draft를 canonical로 바꾼다. 잘못된 원문을 color picker나 CSS background로 전달하지 않는다.
- picker/preset/slider/random은 명시 색 선택이므로 draft도 canonical로 바꾼다. 같은 색을 다시 선택해도 이전 반출 안내/요청은 무효화한다. RGB 세 축·HSL 세 축은 기존 range와 integer rounding을 그대로 사용한다.
- 기존 5표기 HEX/RGB/HSL/HSV·HSB/CMYK의 숫자·기호 형식을 보존한다. CMYK는 기존 계산상의 참고값이며 실제 인쇄 색을 보장한다고 말하지 않는다.
- random은 `floor(Math.random()*0x1000000)`으로 0..FFFFFF 전체 24-bit 범위를 사용한다. 0과 1에 가까운 고정 random 포트로 검증한다. 기존 관측 #FFFFFE와 새 기대 #FFFFFF는 별도 기록한다.

## SSR·URL·초기 입력

1. 서버와 첫 클라이언트 렌더는 기본색 #3B82F6으로 동일하다. URL은 mount 후 취소 가능한 초기 복원에서만 읽는다. 초기 결과를 숨기거나 페이지 전체 Suspense를 넣지 않는다. `useSearchParams`가 필요하면 프로젝트 훅만 사용한다.
2. 첫 복원 전 직접 입력/명시 색 선택이 발생하면 **그 사용자 상태 전체가 우선**한다. 유효 편집은 그 lastValid, invalid 편집은 당시 보이던 lastValid와 raw를 그대로 둔다. 뒤늦은 공유 URL이 일부를 덮지 않는다. ready 전 URL 쓰기·공유/복사는 막는다.
3. valid URL은 raw 파라미터를 canonical 색으로 복원한다. absent URL은 기본색이다. invalid/중복 color는 기본/마지막 유효 색을 안전하게 표시하고 링크 안내를 남긴다. 손상 URL을 초기 자동 writer로 즉시 덮지 않고 사용자 명시 입력/선택까지 보존한다.
4. 정상 commit의 writer는 `colorQueryUrl(window.location.href, lastValid)`를 쓰며 `replaceState(window.history.state, '', href)`로 무관 query의 값/중복·hash·state를 유지한다. raw draft/입력 오류 문구는 URL에 싣지 않는다. invalid text 입력만으로 마지막 색 URL을 바꾸지 않는다.
5. back/forward는 owned color 목록이 달라졌을 때만 색을 복원한다. hash/무관 query만 바뀌면 현재 draft를 유지하고 공유 URL 문맥만 갱신한다. invalid 외부 color는 현재 보이는 색/원문을 보존하고 안내한다. absent color로 명시 탐색하면 기본색을 복원한다.
6. URL 쓰기 실패는 입력/결과를 버리지 않고 안내한다. 명시 ShareResult에는 builder가 만든 현재 유효 색 URL을 전달하므로 주소창 쓰기 성공을 공유 성공 조건으로 오인하지 않는다. 링크 생성 자체가 불가능하면 공유를 제공하지 않는다.

## 복사·공용 공유 소유권

반출 문맥에는 raw draft, lastValid, 편집 revision, locale와 실제 표시 번역, ready·명시 공유 URL을 넣는다. `createShareResultRequests`의 mount epoch/request와 token을 사용해 input/locale A→B→A에서도 옛 성공/실패/2초 timer가 부활하지 않게 한다.

- 형식 버튼은 클릭 당시 그 1개 표기 전체를 캡처한다. native 성공 또는 legacy true일 때만 copied. false/throw/API 없음은 읽기 전용 전체 표기·전체 선택·재시도·닫기로 복구한다.
- 직접 복사 시작은 ShareResult의 `resultKey` revision도 올려 pending PNG/link를 무효화한다. ShareResult wrapper capture는 직접 복사 owner만 무효화하고 새 share 자신의 key를 바꾸지 않는다. 결과/복구가 없어졌을 때 old handler는 최신 작업을 취소하지 않는다.
- 선택 focus가 입력 변경/이탈을 유발하면 뒤의 selection/안내를 진행하지 않도록 current token을 전후 확인한다. 이미 완료된 OS Clipboard 쓰기를 되돌린다는 표현은 하지 않는다.
- 입력이 invalid여도 5표기 복사는 마지막 유효 색을 사용하며 이를 화면에 명시한다. ShareResult 옆에도 `표시된 유효 색 {hex}을 공유하며 입력 원문은 포함하지 않음`을 안내한다. raw alpha/CSS는 공유하지 않는다.

## UI/번역 매핑

`translations-color-converter.json`은 신규 `input`, `channels`, `formats`, `copy`, `query`, `share`, `presets` 묶음을 준비한다. 기존 title/preview/values/actions.random은 재사용한다. canonical description/guide/howTo/FAQ의 ‘RGB/HSL 직접 문자열 입력’·‘정확한 인쇄’·‘알파 지원’처럼 오해할 수 있는 설명은 integrate가 실제 3/6 HEX+슬라이더 범위로 정리한다.

- 입력 카드 상단 MobileResultLink: `#color-converter-result`, 마지막 canonical 색.
- HEX text label/aria-describedby/aria-invalid, color picker 별도 label, 각 slider 연결 label.
- 명시 텍스트 random 버튼. preset은 모바일5열/큰 화면10열, 최소44px이며 이름은 해당 HEX를 포함한 aria-label. 선택은 border-primary와 시각적으로 식별 가능한 표시를 쓴다.
- 결과 각 행은 값과 44px copy 버튼. 긴 표기/복구 필드는 min-w-0와 줄바꿈, 16px 입력. 카드/모바일 그리드/색 토큰 사용. 제목 장식 Palette 아이콘·pink 배경·glass는 제거한다.
- 예정 selector: `data-color-draft/picker/preset/channel/copy`, `data-color-last-valid`, `data-color-output`, `data-color-share-boundary`, `data-color-recovery`, `data-color-query-error`.

## 후속 검사 순서

1. 실제 부모의 3/6 HEX·invalid raw·alpha4/8/긴 paste의 무잘림·마지막 색/되돌리기·색 picker canonical·기존 5표기/6slider·random 0/흰색 상한.
2. SSR 첫값·0ms 복원 전 유효/invalid 입력·valid/invalid/duplicate URL·hash-only 유지·unknown/state·writer 실패. 양 끝 기기의 query로 색 재현.
3. native/legacy true/false/throw·전체 실패 원문·선택 재진입·옛 retry/close·input/locale ABA·own copy↔실제 ShareResult link/PNG·timer/Strict/unmount.
4. KO/EN 정적 키와 실제 event fixture, scoped lint, final TS freeze. 이후 전담 native320/키보드/picker/Clipboard와 독립/whole type를 연결한다. 미연결 pure6 결과로 실제 부모를 대체하지 않는다.

