# 45차 글꼴 조합 백업 실제 브라우저 검증

2026-11-17 08:41:34 KST 최종. **7/7 통과, Chrome 종료.** 기존3039·합성 프로필/원고·격리 context만 사용했다. 전체 타입은 아래 통합 체크포인트로 통과했다. 일반 외부 요청/서비스 워커는 차단했다.

1. 실제 `toolhub-font-pair-profiles.json`은433바이트였다. 독립 JSON 파싱으로 app/version/profiles와 요청 스타일의 정확 왕복, 현재 원고 미포함을 확인했다. 다른 격리 browser context에서 파일을 선택해 preview쓰기0→명시 추가→새ID를 확인했다. 현재 스타일/제목/본문은 자동 변경되지 않았고, 기존 불러오기 이후 스타일만 바뀌며 두 원고는 그대로였다. source 저장소도 불변이었다.
2. NFKC 중복 이름을 명시 수정하고5기존+2선택의 슬롯 초과를 해결하기 위해1개 선택 해제 후6개를 보존했다. 미래 버전/미지 글꼴/추가 필드는 파일 전체를 거부했다.65,537bytes는 File.text 전 거부,65,536bytes의 정상 JSON+공백은 preview에 도달했다.
3. 실제 두 탭과 native Web Locks로 import 대기 중 외부 raw를 바꿨다. 옛 preview는 쓰지 않았다. quota는 기존 raw/preview/선택 유지, 실제 set 뒤 readback 실패는 unknownWrite·rollback0이었고 명시 재조회로2개 저장을 확인했다.
4. native File.text 완료 전달만 지연시켜 취소 후 늦은 완료0, 새 preview 후 옛 거절 무효, 조합 접기 unmount 뒤 늦은 적용0을 확인했다. 취소는 실제 파일 선택 버튼으로 초점을 돌렸다.
5. 기존 프로필 저장/삭제의 Web Lock 대기 중 조합을 접은 뒤 이전 작업의 쓰기0이었다. 재열기 후 새로운 명시 저장/삭제는 정상이며 원래 프로필을 보존했다.
6.320px 다크 KO/EN preview에서 필드16px/새 동작44px 이상·문서 폭320px, 실제 키보드 이름 편집·취소 후 초점·언어 전환 중 자동 import0을 확인했다. 두 캡처를 직접 열어 요청/적용 굵기 구분과 줄바꿈을 검토했다.
7. 합성 공개 문구로 가져온 스타일을 명시 불러온 뒤 `document.fonts.load`를 확인했다. **Noto Serif KR700·Nanum Gothic400은 각각 실제 FontFace1개 loaded**, 허용된 CSS/폰트 요청8개가 모두200이었다. 해당 두 Google CSS와 그 응답에 포함된 gstatic 자산만 허용했다. 원고는 공개 검증 문자열이며 실제 OS 글꼴 래스터 픽셀은 비교하지 않았다.

제품 결함0. 첫5/7 실행의 실패2는 fixture였다. 격리 새 탭의 `pair=1` 자동열림 전에 열기 버튼을 눌러 다시 닫는 경합을 URL 자동열림 조건 대기로 고쳤다. 폰트는 잘못된 loading 문구 대기와 비동기 predicate의 false 반환을 너무 빨리 읽던 검사를 명시적으로 await하는 native FontFace 조건 polling으로 고쳤다. 나머지5개는 반복하지 않았고 해당2개, 마지막 폰트1개만 영향 재확인했다. 실제 폰트 요청/Face 결과는 `browser/actual-two-fonts.json`에 있다.

JS page error·hydration·unhandled rejection·원시 번역 키0. 저장 실패/읽기 지연은 제어 포트이며 실제 다운로드·File.text·Storage/WebLocks·격리 context·폰트 네트워크와 구분한다. 최초 failure PNG/TXT는 테스트 수정 경위로 남겼고 최종 판정은 최신 evidence를 사용한다.

실행기 `scripts/check-repeat-batch45-browser.mjs`, 상세 `browser/final-results.json`,각 evidence·실제 JSON·KO/EN PNG. 전체 Chrome 추가 실행 없이 후속 타입 결과만 반영한다.

전체 타입은 통합 담당이2026-11-17 08:43:20 KST에여유3.84GiB·Node heap2GB로시작한 `tsc --noEmit`의 첫실행 exit0·진단0으로 통과했다(session89128). Chrome 종료 뒤의 최신41/42/43/45 제품과44copy보완/49준비를 포함한 검사이며 이 담당은 별도전체타입을 실행하지 않았다.

45 EN의 수량 관련4문구는 native 완료 뒤 공용 문구만 정밀화했다. 키/placeholder/제품TS 변화0이며 canonical·생성물·정적 대조는 통합 담당의 최종 근거를 따른다. 이 문구 변경을 native 재실행으로 집계하지 않는다.
