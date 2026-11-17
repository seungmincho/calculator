# 46차 native 브라우저 검증 계획

상태: 부모/canonical 최종 신호 뒤 순차 실행. 아직 이 문서만으로 통과를 뜻하지 않는다.

Chrome 1개·격리 context·기존3039 재사용·Service Worker 차단·외부 요청 차단·합성 자료만 사용한다. 제품 파일/전체 타입/서버는 변경하지 않는다.

1. SpeechSynthesis 제어와 실제 문장 위치 저장/명시 복원; 자동 발화 0
2. URL/전달 우선·초기 목록 쓰기0·재방문
3. Web Locks 두 탭·대기 작업/붙여넣기 취소·CAS
4. 손상/future/quota/readback 원본 보존
5. 음성 소실/local-only·0eligible 차단
6. 140문자 emoji 경계·불일치 위치 첫 문장 경고
7. 기존 실패 문장 재시도·반복/설정 변경 경계
8. 320px 다크 KO/EN·키보드

실제 API 실행과 제어 callback을 구분하며, 개인 마이크·모델 다운로드·공개 RPC 쓰기·외부 캘린더 등록은 하지 않는다. native Clipboard에는 Windows 줄바꿈 정규화가 가능하므로 전달 문자열/파일 바이트와 OS 읽기값을 분리한다. 실패 후에는 제품 결함과 fixture 조건을 확인하고 영향 사례만 다시 실행한다.
