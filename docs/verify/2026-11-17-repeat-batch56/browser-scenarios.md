# 56 실제 브라우저 검증 계획

상태: 준비 중. 부모와 canonical final 신호 전 Chrome 실행 없음. 기존 3039만 재사용하며 모델·외부 요청·실사용 파일은 사용하지 않는다.

1. 합성 RGBA PNG를 실제 PNG/JPEG로 변환: 원본 크기, 투명도, JPG 배경색, 실제 Blob MIME·픽셀과 개별 다운로드.
2. native toBlob 콜백을 보류하고 현재 파일 완료 뒤 일시정지, 빠른 계속/정지, paused 업로드/설정/실패 재시도. 실제 동시 encoder 최대1.
3. 기존 성공 후 새 포맷 실패: 이전 Blob/URL/개별 파일은 유지, 새 설정 완료 합계에는 제외. 새 성공에서만 교체. 설정 ABA의 늦은 완료 폐기.
4. 실제 헤더 read의 완료 순서 제어: 병렬 추가 묶음 보존, 초기화/이탈 후 늦은 추가0. 0/SVG와 기존 파일 크기 경계는 파일 크기 getter 통제임을 별도 명시.
5. 실제 JSZip CRC/고유 이름/출력 바이트 대조. 클릭 snapshot 뒤 행 삭제/추가는 보존, 설정/초기화/취소/새 요청/이탈은 늦은 반출 차단. FileReader 실패 후 재시도.
6. 실제 새 방문 URL 설정, 초기 편집 우선, popstate, 무관 반복 query/hash/history.state 보존, writer 실패 후 입력 유지.
7. 기존 포맷/unsupported HEIC·header MIME 우선순위 및 원본 메모리 보존 회귀. 저장소·URL에 파일/바이트 없음.
8. 320px dark KO/EN에서 입력16px·주요 동작44px·키보드와 현재/이전 성공 안내, 가로 overflow·JS/hydration 수집.

기존 37 native encoder 포트와22 ZIP Blob read 포트를 재사용한다. 실제 인코딩/ZIP과 제어 실패·지연을 분리 보고한다. 제품 파일 수정·build·전체 타입 검사·새 dev 서버 실행 없음.
