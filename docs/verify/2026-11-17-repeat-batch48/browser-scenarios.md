# 48차 native 검증 준비

준비판이며 실행 결과가 아니다. `scripts/check-repeat-batch48-browser.mjs --list`는 Chrome 없이 계획만 출력한다. 부모/canonical final 뒤 단일 Chrome를 사용한다. 원래 baseline5개와 전체초기화 추가 baseline1개는 덮어쓰지 않는다.

| 흐름 | 확인할 경계 |
| --- | --- |
| 초기 복원 | 이름 있는 초기 복원 callback만 잠시 보류하고 실제 입력·문항/제목/기준/목표 편집 후 해제. 편집 필드는 현재 값, 다른4문항과 손대지 않은 필드는 저장본 그대로. 정상 새 방문/초기 불필요 쓰기0 |
| 복사 | 실제 native Clipboard 전체 원문, API 없음·거부/legacy false·throw의 실패 안내·readOnly 전체 선택/재시도. A 대기→B 탭/새 입력/locale A-B-A 뒤 옛 fallback/성공/타이머0 |
| 되돌리기 | 정리·문항 비우기·수정본 복원 후 해당 원문/제목/기준/목표 복구, 그 뒤 실제 편집은 undo 소유권 소멸. no-op/탭 왕복 정책 구분 |
| 전체 초기화 | 실제 WebLock을 다른 탭이 잡은 상태에서 명시 초기화→새 편집/이탈→해제. 최신 원고·자동초안 raw·수정본 key 보존. 새 명시 초기화는 자동초안만 제거 |
| 자동 저장 | 대기 중 최신 편집·외부 탭 raw 변경/CAS·quota/손상·읽기 차단의 입력/raw 보존, 명시 복구 및 새 방문. 실제 저장과 실패 주입 구분 |
| 맞춤법 | 고정 https://nara-speller.co.kr/speller/ URL을 클릭 gesture 안에서 요청하는지 window.open 포트로 확인. Clipboard 대기·거부/탭 변경과 상관없는 생존·옛 안내 차단. 실제 외부 탭/원문 전송0, null 반환을 차단 확정으로 오해하지 않음 |
| 기존 연계 | 수정본 저장/JSON 백업 실제 파일 및 선택 복원, Diff 새 탭의 saved/current 원문·명시 비교 정책을 부모 연결 범위로 확인. 11/25 전체 회귀를 반복하지 않음 |
| 모바일/언어 | 320px 다크 KO/EN·필드16px/동작44px·복구 선택과 키보드 초점·JS/hydration/raw key. 합성 composition 이벤트는 실제 OS IME 검증으로 주장하지 않음 |

저장소는 격리 context에 합성5문항과 합성수정본만 넣는다. 외부 요청 차단, 기존3039 서버 보존, 제품 파일 수정/전체 tsc/build/git 금지. Chrome 종료 후 통합 담당에게 타입 barrier 신호를 보낸다.
