# 28차 이미지 워터마크 실제 브라우저 검증

최종 **8/8 PASS**, 첫 실제 실행에서 통과했다. 종료 시각은2026-11-17 05:56:05 KST (`2026-11-16T20:56:05.128Z`), Chrome은 닫혔다.30차 및35차 결과와 합산하지 않는다.

실행기 `scripts/check-repeat-batch28-browser.mjs`, 합계 `browser/final-results.json`. 기존3039 서버를 재사용했고 isolated context·외부 요청 차단·service worker 차단을 적용했다. 모든 사진·로고는 검증기가 생성한 단색/투명 PNG이며 개인 사진, 실제 사용자 저장소, 외부 이미지 다운로드는0이다.

## 실제 결과

| 흐름 | 확인한 증거 |
|---|---|
| 단일 텍스트 PNG | 파일 추가는 pending 미리보기만 만들고 PNG encode0. 명시 실행의 실제640×360 PNG를 `pngjs`로 읽어 원래 크기·투명 모서리·최대 alpha128을 확인. 줄바꿈 문구는 공백으로 정규화. serif·bold·90도 변경은 실제 raster를 바꾼다. 첫 PNG8,817bytes. |
| 로고9위치·미리보기 | 투명1200×800 사진과 alpha128인20×10 로고, 크기20%/불투명도50%/여백20px. 출력 로고240×120, 위치의 x는20/480/940, y는20/340/660으로9개 모두 정확했다. 실제900×600 미리보기는0.75배의180×90·같은 기하. 합성 alpha64.90도는120×240이며 타일631,620개 유효 픽셀. |
| 다중·부분 ZIP | 빨강96×64·초록80×60·파랑72×48 합성파일의 행 이동 후 안정ID 유지. 부분 선택 ZIP2개/전체 ZIP3개를 실제 다운로드하고 ZIP CRC32와 각 PNG bytes·RGBA SHA-256·모서리 색을 독립 확인. 개별 PNG와 ZIP 내부 동일 이미지의 raster hash도 일치. |
| 검증·유효 로고 보존 | SVG 새 로고 실패 후 기존 유효 로고 유지. 현재1개에10개 추가하는 개수 초과는 기존 목록 보존.8MiB+1 파일은 File.arrayBuffer 호출 전에 거부,4097×4097 합성 헤더·SVG는 오류 행 보존.201 code point/잘못된 색은 실행 차단하고 원문을 유지. 비활성 text 오류는 image 모드를 막지 않음. 사진 비우기는 로고를 보존하고 전체 초기화는 제거. |
| 중지·계속·실패만 재시도 | a읽기1회 실패→b의 실제 native toBlob 완료 callback 보류→중지→완료 전달 후 재시도는 a만 처리하고 b/c를 pending으로 유지. 이후 명시 모두 만들기로 완료. 다른 실행에서 중지→계속을 옛 callback 전에 눌러도 API 완료까지 슬롯1개. 실제 encode8개의 크기/Blob bytes/전달 상태 기록. |
| 늦은 PNG·초기화·이탈 | 설정 변경 후 옛 PNG는 현재 출력에 반영되지 않음. 행 삭제 뒤 옛 완료로 부활0. source preview 파일 읽기를 지연한 채 reset하면 미리보기 부활0. 실제 SPA unmount 뒤 native callback을 전달해 작업 종료와 소유 결과 URL 해제를 확인. |
| ZIP snapshot·실패·늦은 다운로드 | 실제 JSZip의 Blob 읽기를 보류한 뒤 선택 해제/행 삭제해도 클릭 시점2개 ZIP 그대로. 설정 변경 후 늦은 ZIP 자동 다운로드0. ZIP 읽기 오류 후 완료 PNG를 유지해 정상 재시도. anchor 다운로드 시작 실패도 결과를 보존. |
| 320px 다크 KO·EN | document/body320px, 입력16px 이상·주요 조작44px 이상, 파일 업로드 focus ring·결과 바로가기. 언어 변경 뒤 합성 원고/행ID/완료 PNG 유지. 문구의 URL/localStorage/sessionStorage/요청/콘솔 기록0. |

전체 ZIP 이름은 `watermarked-images.zip`. 실제3개 이름은 `same_watermarked.png`, `same (2)_watermarked.png`, `same_watermarked (2).png`로 보존됐다. `_watermarked` 접미사가 있으므로 기존 ImageConverter의 예약 이름 충돌과 동일한 충돌을 재현했다고 주장하지 않는다. 이 검사는 중복 파일명의 고유화·안정 순서·내용 보존을 확인했다.

## 파일과 시각 확인

`browser/single-text-native.png`, `single-text-native-rotated.png`, `logo-{9개 위치}.png`, `logo-center-rotate90.png`, `logo-tile.png`, `partial-native.zip`, `all-native.zip`, `zip-click-snapshot.zip`, `zip-retry-native.zip`을 보존했다. 개별 evidence에는 PNG dimensions/bytes/hash와 로고 bounds가 있다.

`watermark-320-{ko,en}-{top,panel}.png`를 캡처했다. EN 결과 패널을 직접 열어 실제 미리보기·원본 크기·축소/PNG 안내 문구가 잘리지 않는 것을 확인했다. 외부 폰트는 차단했으므로 원격 Pretendard 다운로드 완료를 주장하지 않는다.

JS page error·hydration·unhandled rejection·원시 키는0. 차단한 외부 통계/글꼴 요청의 console 오류는 예상한 네트워크 경계로 각 evidence에 별도 보존했다. 제품 오류 및 제품 수정 요청0이다. 두 전용 실행기 범위 ESLint는 최종 오류0/경고0이다(워터마크 준비 helper의 미사용1개 제거 후 정적 검사만 재실행, 제품/실제 결과 변화 없음).

## 한계 및 다른 증거와 구분

PNG의 decode·Canvas raster·toBlob·Blob/ZIP encode·다운로드는 실제 Chrome이고, 노드 쪽 PNG/ZIP reader로 픽셀과 CRC를 대조했다. 실패·지연은 실제 File/Canvas/FileReader API의 결과를 지연하거나 실패시키는 검증 포트다. native encode가 반환한 Blob은 그대로 사용하며, 취소 경계에서 완료 callback만 보류한다. 따라서 메모리 종료·GPU 고장·기기 강제종료 시험을 의미하지 않는다.

40MiB 합계/80MiB 결과 예산을 채우는 브라우저 부하를 반복하지 않았다. 해당 한도·로고4MiB/4MP·일부 임계값·도중 로고 교체의 세부 조합은 작성자33/독립14그룹에 별도 근거가 있으며 이8흐름과 합산하지 않는다. GIF 애니메이션 전체 보존이나 EXIF 특수사진의 모든 디코더 조합도 이 합성 PNG 검사로 보장하지 않는다. 9위치/기하 검증은 폰트 raster의 특정 OS 동일 bytes를 요구하지 않고 로고 픽셀을 사용했다.
