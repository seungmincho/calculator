# 13차 독립 코드·도메인 검토

담당: writing_versions. 제품 파일은 수정하지 않고 재현 가능한 결함만 구현 담당에게 전달한다. Chrome·전체 tsc·빌드·배포는 각 전담 범위이며 이 검토에서는 실행하지 않는다.

## 판정

GPA 변환기 복사 실패 복구와 TTS 오류 문장 재시도의 독립 코드·동작 검토를 완료했다. 준비 중 발견한 GPA 공유 클립보드 경합 P2 한 건은 담당자가 수정했고 최종 연결 후 실제 컴포넌트 재현으로 해결을 확인했다. 검토한 변경 경계에 남은 재현 가능한 high/medium 결함은 없다.

실제 제품 컴포넌트를 esbuild로 메모리 안에서 불러와 React hook/event 및 브라우저 API를 제어하는 하네스를 사용했다. 운영체제 클립보드나 음성 엔진의 실제 동작, 모바일 화면은 브라우저 전담자의 검증과 구분한다. 과거 완료 기능 전체를 다시 검사하지 않았다.

## 검토 경계

- GPA: Clipboard API resolve/reject/동기 throw/미지원, execCommand true/false/throw, 실패 문구와 수동 필드, 현재 입력에 대응하는 결과·공유 URL, 입력/만점 변경 및 unmount 뒤 늦은 Promise, 연속 복사의 이전 완료/타이머, URL hydration 후 초기값 보존. 계산식은 변경 범위를 확인하고 과거 전체 기능을 재검증하지 않는다.
- TTS: 중간 문장 실패 뒤 명시적 클릭으로 해당 문장부터 재시도, 반복 pass와 범위 보존, 정확한 본문/문장 snapshot, 본문·전달·정지·반복 설정 변경의 무효화, cancel/interrupted 구분, 이전 세션 및 같은 세션의 이전 utterance 콜백, 기기 음성 전용 정책과 음성 목록 변경, 동기 생성/재생 예외. 자동 재생/네트워크 음성 전환을 추가하지 않는다.

## 발견 및 수정 확인

| 심각도 | 재현 | 수정 | 재검증 |
|---|---|---|---|
| P2, 해결 | 결과 복사 API가 대기하는 동안 링크 복사가 성공한 뒤, 이전 결과 Promise가 늦게 reject하면 대상별 guard가 기존 결과 요청을 current로 간주했다. legacy fallback이 최신 링크 클립보드를 과거 결과로 덮었다. 준비 중 실제 helper로 `newestRequest:copied, olderResult:copied, clipboardAfterOldRejection:OLD RESULT`를 재현했다. | guard에 전역 복사 요청 번호를 추가하고 UI도 단일 최신 copyState를 사용한다. 다른 target의 새 요청도 이전 fallback 및 UI 완료를 무효화한다. | 최종 `GpaConverter.tsx`에서 결과 pending → 링크 success → 과거 결과 reject 순서를 재현했다. fallback 0회, 최신 링크 유지, 링크 성공 상태 유지 PASS. |

## 독립 실행 증거

```text
node docs/verify/2026-11-16-repeat-batch13/check-gpa-independent.cjs
Independent GPA copy: 8 component groups passed

node docs/verify/2026-11-16-repeat-batch13/check-tts-independent.cjs
Independent TTS recovery: 10 component groups passed
```

공통 하네스는 `component-harness.cjs`이며 제품 코드를 복제하지 않고 실제 변경 파일을 불러온다. 하네스의 URL 비교는 쿼리 순서와 무관하게 값을 비교하며, 제품의 실제 번역 키 `scales.s40`을 사용하도록 검사 자체를 조정했다. 이 두 검사 수정은 제품 결함으로 세지 않았다.

### GPA 8그룹

1. hydration 전 공유 URL을 지우지 않고 이후 만점·원본 숫자 문자열을 한 번 복원한다. 입력 변경을 초기 공유 값으로 되돌리지 않는다.
2. Clipboard 거부/미지원/동기 throw × fallback false/throw 6조합에서 성공 표시를 하지 않고 현재 결과 수동 복구를 제공한다. 비례 환산·참고 등급의 구분과 줄바꿈이 보존된다.
3. fallback true만 성공으로 처리하고 임시 필드를 제거한다.
4. 링크 수동 필드는 현재 입력을 사용하며 다른 쿼리와 hash를 보존한다. 입력 변경 후 과거 필드는 사라지고 다시 복사하면 현재 링크를 제공한다.
5. 명시적 재시도는 실패한 대상을 복사하고 성공 뒤 수동 복구 표시를 해제한다.
6. 입력 변경/만점 변경/unmount × 늦은 resolve/reject 6조합에서 오래된 UI 성공과 fallback을 막는다.
7. 결과 pending → 링크 success → 이전 결과 reject 경합을 막는다.
8. 같은 대상의 최신 실패 뒤 오래된 요청이 resolve해도 최신 복구 표시를 지우거나 성공으로 바꾸지 않는다.

코드 확인: 수동 필드는 읽기 전용·16px이며 라벨/설명과 연결되고, 선택/재시도 버튼은 44px이다. `copyGpaText`는 stale 확인을 API 실행 전·await 후·fallback 전후에 수행한다. 기존 `convert`, 등급 표, 결과 문구 구성, 이미지 로직은 변경 경계 밖으로 유지됐다. 변환 자체 검사는 구현 담당의 18그룹 증거에 포함되며 여기서 불필요하게 반복하지 않았다.

### TTS 10그룹

1. 두 번째 문장 오류 후 자동 재시작 없이 해당 문장부터 명시적으로 다시 시작한다.
2. 같은 session의 첫 문장이 이미 끝난 뒤 늦은 error/end/boundary가 와도 현재 문장을 실패시키거나 건너뛰지 않는다.
3. 재시도한 뒤 이전 실패 utterance의 error/end/boundary가 새 재생을 덮지 않는다.
4. 세 번 반복의 두 번째 회차에서 실패한 뒤, 완료한 첫 회차를 반복하지 않고 정확한 남은 순서·횟수로 마친다.
5. 정지/Escape/본문 변경/반복 설정 변경 후 저장된 옛 retry closure를 직접 호출해도 재생되지 않는다.
6. 재시도 후 pause/resume이 현재 문장과 반복 회차를 보존한다.
7. canceled/interrupted는 복구 가능한 음성 오류로 표시하지 않는다.
8. constructor/speak의 동기 예외도 정확한 문장의 복구를 제공한다.
9. 실패 뒤 음성·속도 변경은 자동 재생을 하지 않으며 재시도에서 현재 설정과 실패 위치를 사용한다.
10. 메모 전달로 켜진 기기 음성 전용 상태에서 로컬 음성이 사라지고 원격 음성만 남으면 retry가 비활성화되고 직접 콜백 호출도 원격 발화를 만들지 않는다.

코드 확인: recovery는 정확한 본문·문장 index/offset/text·generation·반복 범위/횟수/gap/pass를 복사한다. 유효성 확인에서 다른 문장으로 clamp하지 않는다. 각 utterance의 settled와 active ref, session 가드가 함께 이전 callback을 차단한다. 기기 음성 전용 선택 변경은 기존 stop 정책을 따라 오류 위치도 비운다. 새 음성 요청이나 서버 API를 추가하지 않았다.

## 범위와 한계

- 이 하네스는 실제 Chrome, 운영체제의 클립보드 권한 UI/선택 메뉴, 소리 출력, 플랫폼별 speechSynthesis 동작을 검증하지 않는다. 실제 사용자 흐름·320px·다크 모드는 브라우저 전담 결과를 따른다.
- 이미 운영체제에 제출한 Clipboard Promise의 쓰기를 웹 코드에서 취소할 수 있다고 주장하지 않는다. 수정은 그 Promise의 늦은 UI 반영과 추가 fallback 쓰기를 차단한다.
- 전체 tsc·빌드·배포·커밋은 실행하지 않았고 새 제품 의존성이나 제품 파일 수정은 없다.
