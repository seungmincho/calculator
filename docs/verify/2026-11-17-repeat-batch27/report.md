# 27차 완료 — 같은 미팅 순간·종료 기준이 있는 소리

2026-11-17 KST. [계약](plan.md)에 따른 세계시계와 백색소음의 부모 연결·번역·독립 검토·실제 브라우저·전체 타입 검사를 완료했다. 새 경로·패키지·계정 연동은 추가하지 않았다.

## 달라진 동작

세계시계는 선택값을 시간 칸 번호가 아닌 정확한 UTC 순간으로 유지한다. 유효한 URL과 시간 변환기에서 가져온 분·초, 도시 순서·업무시간·언어 변경 후 같은 순간을 보존한다. 기준 도시의 실제 날짜 구간을 계산해 DST 23/25시간·반시간 전환·부분 마지막 칸을 표시한다. 업무 겹침의 총 길이와 각 칸의 부분 길이를 실제 구간으로 계산하며, 가까운 표 칸 표시로 선택 순간을 반올림하지 않는다.

제목1~100자와 길이30·60·90·120분(기본60)을 받아 시작·종료를 도시별로 보여주고 단일 UTC VEVENT의 ICS 파일을 만든다. 제목은 URL/도시 저장에 넣지 않는다. 텍스트·링크 복사는 실제 성공만 표시하고 실패 시 수동 선택·재시도를 제공한다. 늦은 digest/복사 완료는 현재 입력이나 locale가 바뀐 뒤 이전 파일/성공 안내를 만들지 않는다.

백색소음은 기존6종 합성 함수 본문을 유지하고 재생 시도별 context/source/gain/타이머/리스너를 소유한다. 첫 재생과 다른 타이머 값은 지금부터 기한을 정하며, 같은 값·종류·음량·페이드는 기존 기한을 유지한다. 타이머0은 무기한, 음량0은 재생 중 음소거다. 선택적 마지막30초 페이드는 기본으로 꺼져 있다.

재생 클릭 전 AudioContext를 만들지 않는다. root 읽기 검토에서 확인한 resume 전 gain 경계는 부모 연결 전에 보완했다. 이미 시작한 suspended source는 native resume 전에 예약을 취소하고 gain0으로 두며 준비 중에도 음량을 올리지 않는다. 현재 시도·기한·running을 확인한 뒤 최신 gain만 복구한다. 거부·10초 준비 timeout·기한 경과·늦은 callback은 해당 소유 자원을 정리한다.

이름40자·설정6개를 저장/불러오기/이름 변경/삭제한다. 종류·음량·타이머·페이드만 저장하며 재생 상태·남은 시간·버퍼는 제외한다. 명시 load 성공은 현재 소리를 멈추고 설정만 적용한다. 새 방문·불러오기에서 자동 재생하지 않으며, lock 대기 중 편집/취소/외부 변경/이탈은 이전 적용을 막는다. 손상·미래 버전·쿼터·readback 불명확을 구분해 원문과 입력을 보존한다.

구현 상세: [세계시계](world-clock-meeting-implementation.md), [백색소음](white-noise-implementation.md).

## 검사 결과

| 범위 | 근거 |
| --- | --- |
| 세계시계 자체 | 준비18 + 실제 부모8 =26그룹 PASS, 기존 시간/시장 helper 회귀, 범위 lint0/0 |
| 백색소음 자체 | 순수/저장11 +session/adapter12 +실제 부모8 =31그룹 PASS, 제품/검사10파일 lint0/0 |
| 독립 검토 | 세계시계9 +백색소음6 =15그룹 PASS, 검사 파일 lint0/0, 추가 제품 수정 요청0 |
| 실제 브라우저 | A7+B7=14/14 PASS, JS/hydration/미처리 Promise0, Chrome 종료 |
| 전체 TypeScript | 05:03:53 KST 재검사·여유4.61GiB·2GB heap·8.8초, exit0 |
| 공용 | ko/en131leaf·정적134사용 오류0·생성물1,578 check·namespace 미해결0·공용3파일 lint0 |

resume 준비 경계의 영향2그룹은 session12에 포함하며 별도로 더하지 않는다. 마지막 부모 mjs flush 보강 후 lint 결과도 기존 세션에서 exit0을 회수했다.

[세계시계 독립9](world-clock-independent-review.md)는 별도 Intl 날짜 membership/offset·업무 교집합과 ICS parser/SHA 기준을 사용했다. 역사적 초 offset·47시간 반복일·삭제된 날짜·부분 마지막 칸·URL/draft 보존·복사/생성 경합을 확인했다. 동일 실행 환경의 Intl 데이터를 사용하므로 IANA 데이터 자체를 새로 인증한 검사는 아니다.

[백색소음 독립6](white-noise-independent-review.md)는 HEAD와 기존6종 함수 body 동일성, 실제 부모→browser/session/audio 경로, mute→resume 순서·늦은 만료·최신 gain, 프로필 load의 stop/설정만 적용과 CAS/readback/lock 대기를 확인했다. native AudioContext를 제어한 포트 검사와 실제 브라우저 파형은 구분한다.

## 실제 Chrome 근거

[브라우저 보고서](review-browser.md), [최종 JSON](browser/final-results.json)의 마지막 시각은05:00:51 KST다. 정확한 epoch 초를 복사 링크와 새 탭에서 재확인하고 뉴욕 fold 두 순간·23/25칸, Lord Howe23.5/24.5시간, 카트만두45분 및345분 업무 교집합을 확인했다.

실제 [90분 ICS](browser/world-clock-90-minutes.ics)는516바이트이며 `DTSTART:20261116T234537Z`, `DTEND:20261117T011537Z`다. 4가지 길이·한글/기호 escaping·CRLF·75octet folding·안정 UID를 독립 파서로 대조했다. 도시 순서/locale 변경 후 같은 일정 UID가 유지됐다. 현재 제목·선택을 보존하는 생성 실패/재시도와 native Clipboard/수동 복구를 확인했다.

백색소음은 실제 native AudioContext를 관찰하되 destination을 추가 gain0 sink로 보내고 Chrome mute를 적용해 물리 스피커 출력을 막았다.97초 wall jump의 기한 복귀·같은/다른 타이머·무기한·mute-before-resume·실제10초 timeout·늦은 이벤트와 native close를 확인했다. OfflineAudioContext에서는 제품 adapter/plan의 실제 AudioParam 페이드·예약 종료 파형을 렌더했다. gain0.8의30초 감소 중간값 약0.4와 종료 후0 등을 측정했으며 개인 오디오나 마이크는 사용하지 않았다.

실제 두 탭 storage event/CAS·native Web Lock 대기 취소·손상/쿼터/readback 불명확·설정 재조회와 재방문 자동재생0을 확인했다. 두 도구의320px 다크 KO/EN4캡처를 직접 검토했고 입력16px·주요 버튼44px·가로 overflow0, locale 변경 후 제목/설정/선택 보존을 확인했다.

최초 fixture3건은 about:blank에서 seed한 sessionStorage 접근, URL 변경만으로 React cleanup/native close가 끝났다고 본 백색소음 이탈 조건, WorldClock 패널 detached 전에 지연 digest를 푼 조건이었다. 실제 완료 조건을 bounded poll로 확인하도록 고친 뒤 해당 사례만 다시 통과했다. 제품 결함이나 첫 실행 전부 통과로 기록하지 않는다.

## 타입 재검사와 다음 준비 파일

첫 전체 타입은05:01:18 KST·여유4.35GiB에서 실행했고,27제품이 아닌 **미연결 CSV 성능 준비** `src/lib/jsonCsv/client.ts:43`의 native Worker postMessage overload/optional transfer 포트 TS2322로 실패했다. 담당자가 모든 실제 호출이 배열을 넘기는 사실에 맞춰 transfer를 필수 `ArrayBuffer[]`로 한 줄 좁혔다. 캐스팅·런타임 변경 없이 Worker9그룹(실제 transfer detach 포함)과 변경 파일 lint를 확인했다.

Chrome 종료·전체 TS 고정을 유지한 채 `node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit`만 재실행해 exit0을 확인했다.27 브라우저는 다시 실행하지 않았다. 컴파일에 포함한 CSV Worker 준비5파일/9그룹과29팀 준비 제품3·검사2파일/14그룹을27제품 검사 수에 합산하지 않는다.

## 공용 반영과 제한

최종 조각 세계시계53 +백색소음78 =131leaf를 ko/en 원본에 병합했다. 기존 guide.whatIs/howToUse/FAQ와 홈·검색 설명도 기능 정책에 맞췄다. 생성물1,578 check, namespace own534/child6·미해결0·apply추가0이며 기존 동적 안내60건은 별도다. metadata·OG·Twitter·JSON-LD는 같은 설명을 사용하고 메뉴 날짜는2026-11-17이다. redirects472·RSS382·llms315도구/45,579바이트를 재생성했다.

시간대 계산은 브라우저의 IANA/Intl 데이터와30분 전환 탐지 간격에 의존한다. 아주 짧은 구간의 여러 역사적 전환·모든 미래 법령·기존 시장 개장 계산의 전체 정확성을 새로 인증하지 않았다. Web Locks 미지원의 raw CAS/readback은 완전한 다중 문맥 원자성을 보장하지 않는다. 실제 휴대폰 절전·모든 오디오 정책·소음 청감/수면·집중/치료 효과는 검증 범위 밖이다. 기존 효능/dB 단정은 실제 기능 안내로 교체했다. 외부 광고·폰트·방문 통계 차단 로그는 제품 JS 예외와 구분한다.

범위 diff·인계 링크·종료 코드는 [통합 검사 기록](integration-checks.json)에 남긴다. 다음은 [CSV 성능 후속](../2026-11-17-repeat-batch26/csv-performance-plan.md)과 [29차 팀 도구](../2026-11-17-repeat-batch29/plan.md)의 별도 부모 병렬 연결이다. 보고서는 각각 기록하고 단일 Chrome·전체 타입 체크포인트를 공유한다.28 워터마크·30 포모도로는 다음 미연결 준비를 시작하며 현재 CSV/29차 전체 타입 전 함께 TS를 고정한다. 빌드·배포·커밋·푸시는 실행하지 않았다.
