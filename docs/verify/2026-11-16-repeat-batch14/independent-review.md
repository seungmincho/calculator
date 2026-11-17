# 14차 글꼴 스타일 조합 저장 독립 검토

담당: writing_versions. 승인된 기존 도구 개선의 새 저장 경계만 검토한다. 제품 파일·공용 번역·메뉴·전체 tsc·Chrome·빌드·배포는 변경하거나 실행하지 않는다.

## 판정

최종 제품 ready 뒤 독립 코드·도메인·실제 컴포넌트 검토를 완료했다. 추가로 재현 가능한 high/medium 결함을 발견하지 않았다. 독립 검사는 도메인 10그룹(글꼴/요청 굵기 342조합 포함), 저장 패널 8그룹, 부모 통합 5그룹으로 총 23그룹 PASS다.

구현 전에 URL 복원 완료 가드와 이전 복사 작업의 세대 무효화를 담당자와 조율했고, 최종 구현에서 실제 동작을 확인했다. root가 요청한 쓰기 후 확인 실패의 과한 보장 문구 완화와 프로필 `details` 기본 열림도 반영된 상태로 검사했다. 제품 파일은 수정하지 않았다.

## 조율한 계약

- 키 `toolhub:font-pair:profiles`, version 1, profiles 최대 6개. ID/이름/스타일만 저장하며 이름은 40자 이하다.
- title/body에 알려진 fontId·정수 크기(title 16~96, body 12~40)·요청 굵기(100~900, 100 간격)만 저장한다. 카탈로그에서 실제 지원하는 굵기 보정은 기존 미리보기 로직을 따른다.
- 저장 시 허용한 스타일 필드만 투영하고, 저장본에 원고 본문·로컬 폰트·알 수 없는 필드가 있으면 전체 거부한다. 불러오기는 현재 제목/본문 문구를 보존한다.
- 공유 URL의 최초 복원이 완료되기 전 저장본 액션을 막는다. 저장 목록을 읽는 것만으로 스타일을 자동 적용하지 않는다.
- 기존 font loader generation을 유지한다. 명시적 저장본 load로 스타일이 바뀌면 과거 CSS/link copy의 늦은 완료나 fallback이 새 상태의 성공으로 표시되지 않아야 한다.

## 검토할 경계

1. 정상 저장 → 새 방문 → 명시적 불러오기에서 양쪽 스타일만 복원하며 원고와 URL query를 바꾸지 않는다.
2. 이름·개수·ID·크기·굵기·version 및 text/추가 필드를 엄격히 검증한다. 용량 초과에서 일부 항목만 남기지 않는다.
3. quota/setItem 실패·읽기 전 접근 차단·손상·미래 버전·stale raw에서는 원본 불변과 이름 입력 보존을 확인한다. 쓰기 뒤 readback 실패는 이미 저장됐을 수 있으므로 성공 미표시와 재조회 경로를 확인하고 rollback/원본 불변을 요구하지 않는다. 협력하는 다른 탭 저장/삭제는 같은 Web Lock으로 직렬화한다.
4. 잠금 대기 중 닫기/새 입력/외부 변경과 같은 순서에서도 오래된 작업이 최신 목록·선택·입력을 덮지 않는다.
5. saved style 적용 후 기존 폰트 CSS/FontFace Promise나 복사 Promise가 늦게 완료되어 새 표시 상태를 덮지 않는다.

## 독립 실행 증거

```text
node docs/verify/2026-11-16-repeat-batch14/check-independent-domain.ts
342 catalog/weight combinations
Independent font profiles: 10 domain groups passed

node docs/verify/2026-11-16-repeat-batch14/check-profiles-component.cjs
Independent profile panel: 8 component groups passed

node docs/verify/2026-11-16-repeat-batch14/check-profile-integration.cjs
Independent profile integration: 5 component groups passed
```

`component-harness.cjs`는 최종 제품 컴포넌트를 esbuild로 메모리 안에 불러오고 React hook/event·저장소·Web Locks·CSS/FontFace 완료 순서를 제어한다. 최초 quota mock이 다른 VM realm의 Error였던 검사 환경 차이를 동일 Error realm으로 맞춘 뒤 검사했다. 이는 제품 결함으로 세지 않았다.

### 도메인 10그룹

- 전체 38개 글꼴 × 9개 요청 굵기의 저장 형식 수용과 적용을 확인했다. 요청 굵기는 보존하고 실제 굵기는 기존 지원 굵기로 보정된다. 현재 원고의 공백·줄바꿈·Unicode를 바꾸지 않는다.
- 원고·폰트 파일·추가 런타임 필드는 저장 projection에서 제외된다. 잘못된 fontId/크기/굵기, local ID, 추가 text 필드, 알 수 없는 root/profile/styles 필드, 중복 ID, 미래 버전은 저장본 전체를 거부한다.
- 6개·이름 40자의 정확한 한도와 7개·41자 초과, NFKC/대소문자 중복 이름을 검사했다. 실패에서 일부 목록만 저장하지 않는다.
- stale add/delete, 새로 손상된 저장소, quota 및 쓰기 전 접근 실패는 쓰지 않는다. 쓰기 뒤 readback 불일치/실패는 성공으로 판정하지 않으며 알 수 없는 결과를 rollback하지 않는다. 삭제는 선택한 ID만 제거한다.

### 실제 저장 패널 8그룹

- 읽기만으로 자동 적용하지 않는다. URL 복원 대기 중 load는 비활성화되고 프로필 영역은 기본으로 열려 있다.
- 명시적 저장에서 스타일 키만 기록하고 저장 확인 뒤 이름을 지운다. quota에서는 원래 목록·이름이 남고 동일 입력으로 재시도할 수 있다.
- 같은 key의 잠금을 기다리는 두 탭을 모형화했다. 첫 탭 저장 후 두 번째 탭의 오래된 raw는 거부되고 이름은 남는다. 다시 읽은 뒤 재시도하면 두 목록을 모두 보존한다.
- load 직전 외부 변경을 감지하면 적용하지 않는다. 다시 읽기도 현재 미리보기를 적용하지 않으며 그 뒤 명시적 load만 호출한다.
- 삭제 확인 전에는 쓰지 않고 quota 시 재확인할 수 있다. 성공한 삭제도 미리보기 적용 콜백을 호출하지 않는다.
- 손상/미래 버전/본문을 포함한 저장본은 액션을 차단하고 원본을 남긴다.
- setItem 성공 뒤 readback이 차단된 경우 실제 저장은 남아 있을 수 있으나 성공을 표시하지 않고 이름을 남긴다. 재조회로 실제 목록을 확인하며 임의 rollback이나 두 번째 쓰기를 하지 않는다.

### 부모 통합 5그룹

- 초기 공유 URL 복원 전에 profile action이 실행되지 않고, 복원 뒤 스타일을 명시적으로 적용할 수 있다. URL의 원고와 주소는 유지된다.
- 편집한 제목·본문은 저장본 load 뒤 그대로다. 잘못된 스타일은 현재 pair를 변경하지 않는다.
- 조합 패널을 닫았다가 다시 열면 부모 메모리 draft를 유지하며 최초 URL을 다시 적용하지 않는다.
- saved style 적용으로 새 CSS/FontFace 요청이 시작된 뒤 오래된 stylesheet error와 FontFace resolve/reject를 늦게 완료시켰다. 새 성공·실패 상태가 각각 유지되고 옛 결과가 덮지 않는다.
- CSS 복사 대기 중 저장본 load 후 이전 Promise가 resolve/reject해도 새 스타일의 복사 성공/실패로 표시하지 않는다. 오래된 reject에서 fallback은 실행되지 않으며 현재 스타일은 다시 명시적으로 복사할 수 있다.

## 범위와 한계

- Chrome·운영체제 폰트 렌더링·실제 localStorage 할당량·320px/다크 모드는 브라우저 전담 결과를 따른다. 검사에서는 실제 브라우저나 외부 폰트 네트워크를 실행하지 않았다.
- Web Locks는 협력하는 탭의 쓰기를 직렬화한다. 미지원 환경의 raw 비교/readback이 모든 탭 사이의 원자적 트랜잭션을 보장한다고 주장하지 않는다.
- quota/setItem 실패의 원본 불변과, 쓰기가 끝난 뒤 확인할 수 없는 결과를 구분한다. 후자의 원본 불변·미쓰기·rollback을 보장하지 않는다.
- 이미 제출한 Clipboard 요청 자체의 OS 쓰기를 취소할 수 있다고 주장하지 않는다. 새 스타일 적용 뒤 과거 UI 완료와 추가 fallback만 차단한다.
- 기존 전체 글꼴 탐색/계산 기능을 다시 검증하지 않았고 전체 tsc·빌드·배포·커밋은 실행하지 않았다. 새 제품 의존성·공용 파일 수정도 없다.
