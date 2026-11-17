# 46차 읽던 원고 목록 — 미연결 준비 독립 검토

2026-11-17 KST. `ttsReadingRecords.ts`, `TtsReadingList.tsx`, `tts.ts`의 제한된 수정과 준비 계약을 검토했다. **독립 8그룹 PASS, 재현된 제품 결함/수정 요청 없음. TextToSpeech 부모는 아직 미연결이다.**

검사: `node docs/verify/2026-11-17-repeat-batch46/check-reading-independent.mjs`

작성자14그룹/기존 회귀의 assertion이나 실행은 재사용하지 않았다. 별도 expected offsets·surrogate 진행 불변식·JSON 변조·저장소/lock 포트와 실제 자식 hook/event fixture를 작성했다. 범용29 host만 사용한다. 원래 첫 실행의3그룹 통과를 보존한 뒤 수작업 CRLF offset 기대값의1칸 오류를 고쳤고 나머지5그룹을 선택 실행했다. 이후 보강한3그룹만 영향 재확인했다. 중복 실행은8그룹에 추가 집계하지 않는다.

범위 JS ESLint exit0, 오류·경고0. 제품 코드·원본 메시지·부모·기존 검사 파일 수정0이며, Chrome·전체 tsc·빌드·배포·커밋은 실행하지 않았다.

## 독립 확인 범위

1. **엄격 raw 보호.** null/배열/미지원 version, decoded duplicate top-level/nested JSON key, 알 수 없는 필드, position content/offset, 날짜/설정 타입·범위 변조를 거부하고 raw를 보존한다. NFKC+case 동명 충돌을 확인했다. 실제 UTF-8 정확2MiB raw는 허용하고1byte 초과는 tooLarge다.
2. **최대 저장 snapshot.** 원문30,000 UTF-16·이름40·음성 이름512의8개 합성 기록을 serializer/parser 왕복했다. JSON에서6byte escape가 되는 고립 surrogate 원문도 그대로 보존했다. ninth save와 중복 이름은 기존 항목을 축출하거나 덮지 않는다. lock 대기 중 호출자가 입력 record/position/settings를 바꿔도 await 전 캡처한 값을 쓴다.30,001자 저장은 거부한다.
3. **위치·음성 정책.** 유효 recovery 문장이 active/restored 위치보다 우선하며 stale generation은 active 위치로 돌아간다. 원문 slice는 맞지만 현재 chunk와 달라진 옛 recovery는 invalidPosition이며, 옛 저장 position은 파싱 후 열기에서 index0/positionMatched=false로 안전하게 안내할 수 있다. local-only에서는 localService가 정확 true인 음성만 선택하고, remote/unknown만 남으면 voice=null·playAllowed=false다.
4. **공용 chunk 최소 보완.** 빈 원문에서도0/음수/소수/NaN/무한/unsafe integer/문자열/null max는 RangeError다. max1/2/3/7/139/140/141/999/1000의 서로 다른 emoji 경계에서 source slice·offset·진행·정확 재결합을 별도 확인했다. max1의 pair2칸 예외 외에는 길이 상한을 넘지 않는다. TTS140과 meeting1000의 실제 호출 의미, CRLF offset, meeting12,001자 거부를 확인했다. parser9 + chunk145 = **154개 세부 변조/조각 사례**다.
5. **CAS/읽기 확인.** 같은 raw를 읽은 두 writer 중 먼저 저장한 결과를 늦은 writer가 덮지 않는다. 기다리는 lock이 abort를 무시해도 신호 확인으로 load를 취소한다. quota는 쓰기0, writeUnknown은 이미 쓴 raw를 rollback하지 않고 성공도 주장하지 않는다. 명시 재조회 뒤 실제 저장된 항목을 읽을 수 있다.
6. **실제 자식 명시 동작.** KO/EN 및 Strict 효과 재실행의 초기 적용/쓰기0, ready=false의 초기 버튼 차단, ready=true 전환의 자동 적용0을 확인했다. 열기 선택만으로 적용하지 않고 confirm에서만 한 번 전달한다. 삭제는 목록만 바꾸며 이전 적용 원고는 다시 건드리지 않는다. 미지원 raw는 보존하며 저장을 막는다.
7. **잠금 대기 경합.** 실제 자식의 load/save 대기 중 inputRevision 변경·storage event·재조회·언마운트가 abort/generation을 무효화한다. lock 포트가 취소를 무시하고 callback을 늦게 실행해도 적용/쓰기가 발생하지 않으며 취소된 저장 이름을 유지한다.
8. **확인 불명 복구.** 실제 자식에서 set 성공 뒤 readback 오류가 나면 이름·raw를 유지하고 writeUnknown을 표시하며 추가 저장을 막는다. 명시 재조회는 목록만 갱신하고 원고 자동 적용/재쓰기 없이 복구한다.

## 연결 시 확인해야 할 경계

`ready`는 작성자 계약상 최초 TTS 초기화 완료 gate다. 사용자 원고·설정·재생 intent 변화는 `inputRevision`을 통해 전달해야 하며, 자동 boundary 진행은 취소 사유로 보내지 않는다. 이 독립 검사는 해당 계약과 초기 gate를 확인했다. 아직 없는 부모 연결을 가정해 ready 전환이 모든 편집 세대를 대신한다고 주장하지 않는다.

`resolveTtsReadingVoice().playAllowed=false`는 **순수 정책 결과**다. 실제 parent canPlay/speakFrom/utterance 재생의 remote 기본음성 우회 차단, delayed voiceschanged, load 직후 live refs/stop/반복 해제·자동발화0,13차 retry·OCR/메모 handoff·비동기 붙여넣기 세대는 부모 연결 후 별도 검증이 필요하다. 기존 `TextToSpeech.tsx`가 TtsReadingList를 import하지 않는 것을 검사 마지막에 확인한다.

미리보기 문자열·저장소는 합성 자료만 사용했다. localStorage/음성 API 포트의 통과는 실제 브라우저 quota·Web Locks/native speech 성공 보장이 아니다. lock 미지원 CAS/readback은 완전 동시 쓰기를 원자화하지 않는 기존 계약이다. JSON import/autoload/backup을 추가하지 않았다.
