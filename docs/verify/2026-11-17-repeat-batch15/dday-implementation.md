# 15차 수능 D-day 구현·공식 자료 대조

확인일: 2026-11-17 KST. 구현 담당 `/root/taxi_repeat`.

## 결과와 범위

기존 `/csat-dday/`의 첫 화면에 지정 시험실 입실 마감 08:10과 준비물·시간표·과목별 연습 바로가기를 추가했다. 준비물/시간표를 응원 공유보다 먼저 배치했다. 응원 공유, 현재 교시, 전체 시간표 연습, 준비물 체크 저장, 선택 과목/답안 저장, 전용 인쇄, 대입 일정과 ICS는 유지했다.

과목별 연습은 기존 `/timer/?m=`에 시간만 전달한다. 국어 80분, 수학 100분, 영어 70분, 한국사 30분, 탐구 한 과목 30분, 제2외국어/한문 40분이다. 자동 실행 파라미터나 새 타이머 엔진은 추가하지 않았다. 일반 수험생의 사전 연습용이며 듣기 음원·방송·감독을 대체하지 않는다고 안내한다.

## 공식 근거

| 자료 | 실제 확인한 범위 |
|---|---|
| [교육부 수험생 안내, 2026-11-09](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=107599&lev=0) 및 [동일 안내의 정책브리핑 본문](https://www.korea.kr/news/policyNewsView.do?newsId=148975290) | 08:10 지정 시험실 입실, 신분증, 반입금지 전자기기 제출, 한국사 필수, 탐구 순서·이전 과목 답안 수정 금지, 공식 수험표 가채점표의 종료령 전 작성 및 종료령 뒤 회수 전 작성 금지. |
| [교육부 수험생 유의사항 카드 안내, 2026-11-11](https://www.korea.kr/multi/visualNewsView.do?newsId=148975450) | 휴대 가능 필기구·시계와 전자식 화면/충전식 기기, 개인 샤프 등 시험 중 휴대 불가 물품의 구분. |
| [평가원 2027 수험생 유의사항 PDF, 부산교육청 게시](https://www.pen.go.kr/upload/main/na/bbs_2282/ntt_1181914/doc_6de1v1ef2%3D4bvb9%3D48v41%3Da8vfd%3Dc1b4ve097v656c_v1252.pdf) / [경기도교육청 게시 공고](https://www.goe.go.kr/goe/na/ntt/selectNttInfo.do?bbsId=2675&mi=10961&nttSn=2379031) | 독립 검토 담당이 PDF 본문을 직접 확인했다. 4교시 14:40 복귀, 한국사·탐구 세부 시간, 1과목 선택자의 두 번째 시간 응시, 공식 수험표 가채점표의 시험 중/감독관 퇴실 뒤 쉬는 시간 사용과 종료령 직후 금지를 구분했다. 구현 담당의 해당 PDF fetch는 실패했으므로 본문 직접 열람 여부를 혼동하지 않는다. |
| [평가원 시행기본계획 PDF, 부산교육청 게시](https://www.pen.go.kr/upload/main/na/bbs_2282/ntt_1167268/doc_624bv60cf%3Dbbvfe%3D42vae%3D8cvb6%3D7283vadfav8fd5_v8178.pdf) | 구현 담당이 PDF 본문을 열어 부록3의 문항 수/과목 시간과 영어 듣기 포함 범위, 시험·성적 통지일을 대조했다. |
| [교육부 시행세부계획 공고](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=106592&lev=0) / [제주교육청 시행세부계획 공고](https://www.jje.go.kr/board/view.jje?boardId=BBS_0000017&dataSid=1474094&menuCd=DOM_000000103001001000&orderBy=REGISTER_DATE+DESC&paging=ok&startPage=10) | 해당 연도 공고와 시험일·08:40~17:45, 성적 통지일을 확인했다. 교육부 HWPX는 web 도구의 콘텐츠 형식 제한으로 본문 직접 추출에 실패했다. |
| [대구교육청 보도자료 목록의 ‘2027학년도 대학수학능력시험 실시’ 본문](https://www.dge.go.kr/pr/na/ntt/selectNttList.do?bbsId=2680&mi=5279) | 2026-11-17 열람 당시 해당 게시물의 전체 본문이 목록에 노출됐다. 일반 시간표와 16:05~16:07 회수, 1과목 선택자 대기·응시 및 준비물 안내를 교차 대조했다. 목록은 변할 수 있어 제품의 핵심 출처는 위 직접 공고/PDF로 제공한다. |
| [대교협 2027 대입전형 시행계획 PDF](https://www.kcue.or.kr/_upload/news/2025/04/30/application_25d9ccd90388d6ba316a2c7d398ff944.pdf) | root가 PDF p3(인쇄 1쪽)과 기존 TIMELINE 일자를 대조해 전달했다. 숫자는 그대로 두고 충원 ‘합격 통보’와 이후 ‘등록 마감’을 설명 및 ICS description에서 구분했다. 최신 개정본 원문 대조 완료라고 주장하지 않는다. |

## 표현 변경

- 준비물·4교시·문항 수에 남아 있던 ‘예년 기준/공고 후 확인’을 해당 연도 공식 자료와 확인일로 교체했다.
- 검은색 컴퓨터용 사인펜과 흰색 수정테이프를 개인 준비 체크에 추가했다. 수정테이프는 개인별 일괄 지급처럼 쓰지 않고 감독관에게 요청하는 물품으로 구분했다. 개인 샤프의 시험 중 휴대 불가를 명시했다.
- 스마트안경·보조배터리·전자식 화면이 있는 용기 등 누락된 범주를 공식 안내에 맞춰 보완했다. 특수·의료 물품은 사전 확인 절차를 따르도록 안내한다.
- 4교시에 문제지 회수 2분을 별도 표시하고, 탐구 1과목 선택자는 첫 시간 대기 후 두 번째 시간에 응시한다고 설명했다.
- 가채점 안내는 ‘가능하다’는 포괄적인 허용 문구 대신 공식 수험표 안내와 종료령 뒤 회수 전 금지를 설명한다. 감독관 퇴실 후 쉬는 시간까지 전면 금지라고 확대하지 않는다. 사이트의 인쇄물은 사전 연습·시험 후 답 기록용이며 시험 중 사용 허가 문서가 아니라는 안내를 화면과 인쇄본 모두에 넣었다.
- 수시·정시 미등록 충원 항목 이름은 ‘합격 통보’로 명확히 했다. 대학별 원서접수 기간과 충원 통보/등록 마감의 차이를 화면·ICS 설명에 포함했다. TIMELINE의 날짜·UID·알람 설정은 유지했다.

## 파일과 검증 인터페이스

- 제품: `src/components/CsatDday.tsx`, `src/utils/csatDday.ts`.
- 검사: `scripts/check-csat-season.ts`.
- ko/en 조각: `translations-dday.json` (`csatDday`). 메시지 원본·생성물·페이지 메타는 공용 통합 담당이 반영한다.
- `#csat-essentials` → `#csat-checklist`, `#csat-schedule`, `#csat-practice`; 답안 영역 `#csat-answer-sheet`.
- 저장 키는 기존 `csatDday.checklist`, `csatDday.sheet` 그대로다. 기존 체크 키를 없애지 않고 `signPen`, `correctionTape`만 추가했다.
- 기존 effect의 동기 setState lint 3건은 `useHydrated` 이후 한 번 복원하는 방식으로 최소 보완했다. 공유 이름은 URL 값이 바뀔 때 기존 동작대로 반영한다.
- 44px 조작 영역, 16px 입력, 모바일 카드/행의 최소 폭과 줄바꿈을 적용했다.

## 실행 결과

- `node scripts/check-csat-season.ts`: 8개 그룹 PASS. 공식 시간표/4교시 수거, 타이머 6개 URL과 기존 parser, D-2·당일 KST, 기존 답안·체크 키, ICS 원본 날짜, 출처/ko·en 구조를 검사했다.
- `node scripts/check-csat-dday.ts`: 기존 회귀 PASS.
- `npx eslint src/components/CsatDday.tsx src/utils/csatDday.ts scripts/check-csat-season.ts`: 오류·경고 0. 이후 ICS 설명과 Hero 모바일 스타일 보완 뒤 `npx eslint src/components/CsatDday.tsx`도 오류·경고 0이다.
- 독립 검토 담당이 도메인 6개/실제 컴포넌트 7개 그룹 PASS를 전달했다. ICS 설명과 모바일 스타일 보완의 최종 추가 대조는 담당 결과에 반영한다.
- 브라우저 기능 5개 검사 PASS 후 320px 캡처에서 카운트다운 두 자리 숫자가 줄바꿈되는 현상을 확인했다. Hero 숫자 카드의 모바일 가로 패딩/글자 크기와 줄바꿈만 보완했다. 검증 담당이 DOM 범위와 새 캡처에서 모든 숫자 한 줄·영역 넘침 없음을 재확인했고, 공식 링크·과목별 타이머 6개 회귀도 PASS했다. Chrome을 종료했다.

빌드·배포·커밋·전체 타입 검사·Chrome은 구현 담당이 실행하지 않았다. 웹으로 확인한 사실과 로컬 제품 검증을 구분하며, 로컬 수정만으로 검색 색인/배포 완료를 주장하지 않는다.
