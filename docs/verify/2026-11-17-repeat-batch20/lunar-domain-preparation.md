# 음력 기념일 저장 도메인 준비

2026-11-17 KST. root가 `src/utils/lunarSavedAnniversaries.ts`와 `scripts/check-lunar-saved-anniversaries.ts`를 작성하고 다음 제품 담당 taxi_repeat에게 소유권을 전달했다. 부모 UI·ICS·번역에는 아직 연결하지 않았다.

구조는 [설계](lunar-saved-api.md)를 따른다. parse/read는 `{ok:true,snapshot:{raw,revision,anniversaries}}` 또는 `{ok:false,error}`를 반환한다. storage는 명시 인자로 받고, `withLunarAnniversariesLock(action, signal?)`는 대기 중 취소도 지원한다. UI는 별도로 입력/선택/언마운트의 세대를 확인해야 한다.

```text
node scripts/check-lunar-saved-anniversaries.ts
Saved lunar anniversaries: 9 groups passed
npx eslint src/utils/lunarSavedAnniversaries.ts scripts/check-lunar-saved-anniversaries.ts
exit 0
```

검사 범위: 원 윤달 연도와 원 30일 보존·기존 엔진의 다음 발생일 대체, 지원 첫/마지막 날짜 및 범위 밖, strict envelope/중복ID/미래버전/길이, add/rename/delete와 빈 목록 revision, 최대12·중복이름·대상누락, stale 쓰기/확인 뒤 불러오기, quota/접근차단/쓰기확인불가, 이미 취소한 lock에서 콜백 미실행. 실제 브라우저 두 탭 Web Locks·모바일·부모 복원·ICS 제목 연결은 아직 검사하지 않았다. 기존 달력 엔진의 출력과 저장 경계를 확인한 것이며 달력 기준을 새로 바꾸지 않았다.
