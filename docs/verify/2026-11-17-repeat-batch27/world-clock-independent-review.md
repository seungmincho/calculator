# 27A 세계시계 독립 검토

2026-11-17 KST. 담당 `/root/taxi_repeat`. 작성자의 최종 부모 안정 신호 뒤 현재 제품으로 독립9그룹을 확인했다. **재현한 제품 결함·추가 수정 요청 없음.** 제품 TS/canonical은 수정하지 않았으며, CSV Worker 준비5파일도 고정 상태를 유지했다.

## 결과

- `node docs/verify/2026-11-17-repeat-batch27/check-world-clock-independent.mjs` — **9그룹 PASS**.
- `npx eslint docs/verify/2026-11-17-repeat-batch27/check-world-clock-independent.mjs` — **exit0, 오류/경고0**. 최초 미사용 검사 변수 warning1개는 검사 파일에서 제거했다.
- 검토 파일: `WorldClock.tsx`, `worldClockMeeting.ts`, `worldClockCalendar.ts`, `worldClockActions.ts`, 기존 `worldClock.ts`와 shared calendar escaping/folding 연결.

## 독립 경계

1. **현지 날짜의 별도 기준**: 제품 offset/day/localParts를 부르지 않는 `Intl.DateTimeFormat` 날짜 membership으로6일 범위를15분씩 스캔하고 경계를 초 단위로 좁혔다. 뉴욕 봄/가을, Lord Howe 반시간, Chatham45분, Havana/São Paulo의 자정 변화, Apia 삭제 날짜, Kwajalein47시간, Monrovia1972년 부분 시작일, Paris1900년 초 offset,9999년 마지막 날의 실제 시작/끝·연속 슬롯과 대조했다.
2. **초 단위 시차**: 별도 `timeZoneName:'longOffset'` 문자열을 해석해 각 감지 구간 경계 전후65초를1초씩 비교했다. 역사적 초 부분을 분 단위로 반올림하지 않는다. 표의Containing slot은 선택 instant를 재생성하지 않는다.
3. **업무 교집합**: 각 도시의 직접 weekday/hour predicate를30초마다 스캔하고 전환 초를 좁힌 oracle와 실제 interval/합계/슬롯 합계를 대조했다. Paris561초 차이, Kathmandu45분,47시간 반복일과 주말 공집합을 포함했다.
4. **URL**: epoch0/음수/양끝/뉴욕 fold의 정확한 초를 query에서 복원하고 관계없는 query/hash를 유지했다. 유효 도시 순서/중복 정리와 모든 도시의 연도 경계를 확인했다.
5. **ICS 독립 파싱**: 제품 parser를 사용하지 않고 physical CRLF/75UTF-8 octet·unfolding·property·UTC stamp·TEXT unescape를 검사했다. 쉼표/세미콜론/역슬래시/실제개행/emoji를 포함한 제목이 단일 VEVENT에 들어가고 DTSTART/DTEND/DTSTAMP 초가 일치한다. 도시순서와 출력 시각만 달라지면 UID는 같고 제목/길이/시작이 달라지면 다르다. digest 대기 중 입력 객체를 바꿔도 클릭 snapshot이 유지된다.
6. **실제 부모 URL/draft**: hydration 전 도시 저장값을 덮지 않고 URL 순간을 우선 복원했다. 도시 순서 변경은 instant를 유지한다. 빈 날짜 초안은 동일 query의 hash 변경으로 지워지지 않고 반출을 막는다. 다른 실제 query popstate는 새 순간을 적용하면서 비공개 제목/길이를 유지한다. ShareResult payload·복사 text·query가 같은 순간이다.
7. **실제 부모 부분 마지막 슬롯/무효 날짜**: Lord Howe와 Monrovia 부분 마지막 슬롯에서17초 남은 선택이 그대로 표시된다. 존재하지 않는 날짜/Apia 건너뛴 날짜의 원문과 이전 선택이 남고 링크·달력·공유 카드의 잘못된 반출은 차단된다.
8. **복사 경합**: 이전 line 복사 pending→새 share 복사 성공→이전 거부에서 늦은 fallback이 실행되지 않는다. 제목 편집 후 원래 문자열로 돌려도 이전 복사 성공이 부활하지 않는다.
9. **ICS 경합/실패**: 도시 순서와 제목을 바꾼 뒤 원래 값으로 돌리는 동작, 다른 query popstate는 이전 SHA 완료의 자동 다운로드를 막는다. 같은 query hash만 변경하면 현재 snapshot을 유지해 진행 중 다운로드가 정상 완료된다. 실제 save port throw 시 URL 회수/제목 보존, 이후 명시 재시도 성공을 확인했다.

## 검사 방식과 한계

도메인 oracle는 제품의 offset→wall-date 구간 계산과 다른 방식으로 동일 실행 환경의 Intl 출력을 관찰한다. **IANA 데이터 자체나 모든 역사 시간대의 정확성을 독립 재인증한 검사는 아니다.** 제품이 명시한30분 검사 구간 내 전환 하나 이하 가정과 환경별 TZDB 차이는 유지한다. 선택된 실제 사례가 통과했다고 탐지 불가능한 out-and-back 전환까지 보장하지 않는다.

실제 부모 검사는 작성자 `scripts/check-world-clock-components.mjs`에서 fixture 선언 부분만 가져와 DOM/Clipboard/digest/locale 포트를 재사용했다. 작성자 assertions는 실행하지 않고 별도 시나리오·oracle를 실행했다. 실제 TSX/helper는 번들하고 hook/event harness로 처리했다. 실제 React scheduling·레이아웃·native Clipboard·브라우저 Worker·320px는 전담 Chrome 검증과 구분한다. 작은 원본 fixture의 이전8그룹을 이9그룹에 다시 더하지 않는다.

이 담당은 Chrome/전체tsc/빌드/배포/커밋을 실행하지 않았다. 브라우저/공용 타입 체크포인트는 해당 담당의 최종 증거를 사용한다.
