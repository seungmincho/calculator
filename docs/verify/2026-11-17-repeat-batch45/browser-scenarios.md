# 45차 실제 브라우저 계획

최종 실행 상태: 7/7 PASS, Chrome 종료. 실제 결과와 fixture 보완 경위는 `review-browser.md` 및 `browser/final-results.json`을 따른다. 아래는 실행 전 선정한 범위이며 일부 세부는 독립/작성자 증거와 구분한다.

author22/독립14/canonical37leaf 최종 신호 뒤 기존3039·단일 Chrome으로 실행한다. 이전14차 전체 검사를 반복하지 않는다. 합성 프로필/원고만 사용하고 모든 일반 외부 요청·서비스 워커를 차단한다. 마지막 실제 폰트 사례만 Noto Serif KR/Nanum Gothic의 공식 Google CSS와 그 CSS에 든 gstatic 자산을 고정 허용한다.

1. 실제 JSON 백업을 독립 파싱한 뒤 다른 격리 context에서 파일로 선택·명시 추가. preview쓰기0·현재 스타일/원고 자동적용0·새ID·명시load 뒤두원고유지·source불변.
2. NFKC 중복 이름 편집,5기존+2선택의6슬롯 한도/선택해제,미래/미지폰트/추가필드 전체거부,65,537bytes 읽기전거부/65,536bytes정상preview.
3. 실제 두탭/WebLocks에서preview뒤외부변경의늦은import0,quota preview/선택유지,실제set뒤readback실패unknown·rollback0·명시재조회.
4. native File.text 완료만지연하여취소/역순/옛거절/조합접기unmount경계,취소후실제choose초점.
5. 기존 저장/삭제의lock대기중접기→늦은쓰기0,재열기뒤새명시저장/삭제정상.
6.320px다크 KO/EN preview중복안내/키보드이름편집·취소초점·필드16px/새버튼44px/overflow0.
7. 가져온 스타일명시load뒤 document.fonts.load로실제두family/weight/loaded확인,허용network응답·폰트자산200을보존. 실제OS글꼴래스터픽셀차이는비교하지않음.

JS/hydration/unhandled/rawkey와 실제 다운로드 bytes를수집한다. 오류주입과native실행을분리하고완료시Chrome종료후통합담당에게전체타입barrier신호를보낸다.
