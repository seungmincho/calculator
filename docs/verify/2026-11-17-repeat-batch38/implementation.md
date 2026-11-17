# 38차 공용 공유 버튼 구현

2026-11-17 KST. root가 제품2파일을 단독 수정했다. **자체17그룹 PASS·제품/검사4파일 lint0**, 독립·실제 PNG/브라우저·전체 타입은 별도 대기다. 제품 TS는 발견 대응 외 고정했다. 빌드/배포/커밋은 하지 않았다.

- `src/components/ShareResult.tsx`: 기존 card/url/text/fileName/className API와 버튼을 유지하고 optional `resultKey?: string | number`를 추가했다. 카드 의미값/명시 URL/문구/파일명/CTA·언어/결과 revision마다 다른 요청 scope를 소유하며 같은 내용의 새 객체는 취소하지 않는다. 버튼의 기존 flex wrapper/className 의미를 유지했다.
- `src/utils/shareResultActions.ts`: 행까지 복제·freeze한 클릭 시점 snapshot, StrictMode 재활성화 epoch·요청 소유권, native/legacy 실제 성공 판정, 다운로드 URL의 마운트 수명을 관리한다. 입력 변경 후 같은 결과로 돌아와도 이전 scope는 재사용하지 않는다.
- 같은 snapshot으로 PNG·native file/text share·링크 fallback을 수행한다. 현재 의미값/기본 URL이 달라지거나 unmount되면 늦은 렌더/자동 fallback/URL 생성/click/안내를 차단한다. native AbortError는 취소로 끝내고, 다른 실패는 같은 링크 복사로 복구한다. 네이티브 공유가 없는 브라우저는 불필요한 카드 렌더 없이 링크 복사를 시도한다.
- 이미지 저장 실패와 복사 실패를 구분한다. 복사 실패는 전체 readOnly 링크/선택/재시도/닫기를 제공한다. 선택 실패를 성공으로 표시하지 않으며 닫기는 원래 링크 복사 버튼으로 초점을 돌린다. 새 결과/요청의 안내를 과거2초 타이머가 지우지 않는다.
- 기본 URL만 바뀌어 요청을 버리는 경우에도 pending을 풀어 버튼이 영구 비활성으로 남지 않게 했다. 이 경계는 구현 중 확인해 실제 부모 검사에 포함했다.
- 이미 클릭한 정상 다운로드 URL은 단순한 입력 변경으로 해제하지 않고30초 또는 unmount에 정리한다. 같은 URL을 두 번 해제하지 않고 실패/Strict effect replay도 정리한다. 성공 안내는 파일 저장 완료를 단정하지 않고 다운로드 시작으로 표현한다.

## 자체 근거

| 검사 | 결과 |
| --- | --- |
| `docs/verify/2026-11-17-repeat-batch38/check-share-result-baseline.mjs --after` | 기존 실제 부모4결함과 동일 입력·이벤트가 모두 해결됨. 입력변경/이탈 후 old PNG0·문구/URL 혼합공유0·late legacy0 |
| `scripts/check-share-result-actions.ts` | 순수/포트5그룹. owned rows·replay/새요청·Clipboard matrix·accepted URL 수명/실패/정리·URL 생성 중 무효화 |
| `scripts/check-share-result-components.mjs` | 실제 공용 컴포넌트8그룹. 같은 의미 새props·필드별변경/언어/revision/A-B-A·URL-only pending해제·old timer/replay·수동복구/초점·renderer/download실패·native payload/취소/거절·unmount |

테스트 카드 Blob은 합성 문자열이며 실제 PNG 픽셀/OS 공유창 검증이 아니다. actual component harness는 기존 host만 재사용하고 실제 ShareResult/actions를 번들한다. 마지막 제품/검사4파일 ESLint 오류·경고0이다. Node의 기존 module-type 안내1개는 package.json 변경 없이 기록한다.

KO/EN 새12키와 기존 실패 안내1키는 root 조각 `translations-share-result.json`으로 제공했고 통합 담당이 shared canonical·생성본에 반영했다. 부모 핵심 선택자는 `[data-share-result]`, `[data-share-action="share|save|copy|select|retry|close"]`, `[data-share-recovery]`, readOnly textarea다.

## 한계와 남은 검증

모바일 실제 캡처의 root 시각 검토에서 기존 `copyFailed`가 주소창 링크 복사를 안내하는 것을 확인했다. 명시 url은 주소창과 다를 수 있으므로 KO/EN을 ‘자동 복사 실패’로 바꾸고 화면에 제공한 전체 링크를 선택하도록 안내를 일치시켰다. 제품 TS 변경 없이 번역1키를 추가 갱신했으며 해당 모바일 복구 흐름만 영향 검증한다.

원래 `renderShareCard`의 폰트 대기/카드5행/픽셀/renderer CPU는 바꾸지 않았다. 취소한 렌더 자체가 중단되거나 이미 열린 OS 공유창·이미 요청한 다운로드·이미 시작한 Clipboard 쓰기가 되돌려진다고 주장하지 않는다. 부모가 effect보다 앞선 현재 입력을 정확히 공유하려면 명시 url과 resultKey를 제공해야 하며33은 이를 사용한다. 실제 native 공유창/다른 앱 전송 대신 제어된 포트로 payload와 호출 경계를 검증한다.

team_rotation의 별도 독립검토와 verifier의 대표 소비자 실제 PNG/Clipboard/모바일 검사 뒤 다음31/32/38 공통 전체 타입 체크포인트를 수행한다. 이 문서를 브라우저/타입 완료로 해석하지 않는다.
