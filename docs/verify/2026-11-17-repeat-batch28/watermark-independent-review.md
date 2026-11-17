# 여러 사진 워터마크 독립 검토

2026-11-17, `taxi_repeat`. **순수/브라우저 어댑터 독립 8그룹 + 실제 부모 독립 6그룹 = 14그룹 PASS**. 두 검사 JS의 scoped lint는 각각 exit 0이다. 작성자의 준비/부모 검사는 재실행하거나 이 결과에 합산하지 않았다. 제품 TS 변경 없음, 32차 준비 TS도 freeze 유지.

## 실행

```powershell
node docs/verify/2026-11-17-repeat-batch28/check-watermark-independent.mjs
npx eslint docs/verify/2026-11-17-repeat-batch28/check-watermark-independent.mjs
node docs/verify/2026-11-17-repeat-batch28/check-watermark-parent-independent.mjs
npx eslint docs/verify/2026-11-17-repeat-batch28/check-watermark-parent-independent.mjs
```

그룹 이름 일부를 세 번째 인자로 넘기면 해당 영향 검사만 실행한다. 작성자 browser 검사에서 fixture/합성 header/포트 **선언까지만** 가져오고 assertion은 실행하지 않는다. 원본 좌표 oracle와 큐/ZIP 동선은 독립 구성했다.

## 발견 및 해결한 경계

수정 전 실제 `createWatermarkQueue`로 아래 순서를 실행했다.

1. a가 실패하고 b 처리 중 `pause()`.
2. 취소가 물리 연산을 끝내지 않는 포트에서 b가 늦게 완료하여 버려짐. 상태는 a:error, b/c:pending, phase:paused.
3. `retryFailed()` 뒤 a만 성공시킴.
4. 기존 eligibleIds에 b/c가 남아 b도 자동 시작. 시작 순서는 `[a,b,a,b]`였다.

“실패만 재시도”가 정상 pending까지 계속하는 계약 차이를 작성자와 root에게 전달했다. 작성자는 paused 상태의 재시도를 지원할 예정이므로, 큐에서 retryIds만 새로운 작업 대상으로 잡고 generation 증가/active abort를 함께 적용했다. 실제 finally 전 슬롯을 유지하는 구조는 보존했다.

독립 스크립트 작성 후 실행 시점에는 작성자의 수정이 반영돼 있었다. 마지막 그룹에서 시작 순서 `[a,b,a]`, 정상 pending 미처리를 확인했다. **수정 전 inline 재현과 수정 후 독립 PASS를 구분하며**, 제품은 독립 검토자가 수정하지 않았다.

## 확인한 8그룹

| 그룹 | 독립 근거 |
|---|---|
| 1 | 자체 affine matrix/회전 수식으로 3종 원본 크기×text/logo×9위치×5각도=270조합. 원본/축소 preview의 앵커·회전축·로고 모서리·alpha·source-first 및 context 복원 일치. |
| 2 | 200 Unicode code point와 개행 공백 처리, raw draft 보존, #RRGGBB strict 검사, 숨겨진 비활성 필드 비간섭. 정확히10,000 draw 허용·간격 감소 시 초과 거부·0 간격 거부. |
| 3 | source read 대기 중 logo/output public 요청을 함께 예약. old source와 queued logo를 무효화하면 추가 allocation 없이 건너뛰고 최신 output만 decode. 하나의 물리 gate 유지. |
| 4 | 사진/로고 header 초과와 가짜 확장자를 decode 전에 거부. header와 actual decode의 EXIF 가로/세로 교환을 실제 크기로 출력. 공용 decodeImage의 `imageOrientation:from-image`와 bitmap close 호출을 별도 포트로 확인. |
| 5 | 새 로고 실패 시 이전 source/logo preview 보존·재사용. toBlob 실패가 늦게 오는 동안 dispose해도 active canvas는 실제 finally까지 유지, 그 뒤 해제·늦은 URL 생성0·source/logo close 소유권 확인. |
| 6 | 80MiB-1+1 정확한 합산, 초과1바이트 실패/release, 삭제 후 실패 재시도 회복. active ID를 삭제 후 같은 ID로 새 File 추가해도 옛 output이 대체 행에 붙지 않음·중복 release 없음. |
| 7 | 선택 성공분만 ZIP에 포함, path/control/case-duplicate 안전 이름과 Blob 참조 보존. 행 제거/재정렬 뒤 기존 snapshot 불변. invalidate 후 실제 encode 완료까지 busy, 옛 다운로드0, 다음 명시 ZIP 성공. |
| 8 | 위 paused→실패만 재시도 결함의 수정 영향. 실패 a만 처리하고 정상 대기 b/c는 새 명시 시작 전까지 남음. |

## 실제 부모 연결 6그룹

작성자의 final ready/제품 TS freeze를 받은 뒤 실행했다. `check-image-watermark-components.mjs`의 호스트 fixture 선언만 재사용하고 작성자 assertion은 실행하지 않는다. 실제 Workspace와 queue/adapter/ZIP은 제품 코드를 쓴다. 추가 재현 결함은 없었다.

1. 실제 버튼으로 a 실패→b 중지→실패만 재시도에서 a만 성공하고 b/c는 pending. 다음 명시 모두 만들기에서만 나머지 사진을 처리한다.
2. PNG encode를 보류하고 설정 A→B→A로 되돌려도 이전 동일 key 결과는 되살아나지 않는다. 원래 encode가 실제 끝난 뒤 새 명시 요청의 내용만 PNG로 저장한다.
3. ZIP 클릭 이후 행 삭제와 선택 해제를 해도 클릭 snapshot의 Blob/이름은 보존된다. 이후 새 ZIP에서 설정을 바꾸면 그 늦은 자동 다운로드만 차단한다.
4. 기존 유효 로고 A가 있는 상태에서 새 B read 보류→최신 C 실패를 재현했다. B는 decode하지 않고 A를 유지해 실제 출력 명령에 사용한다. 사진 비우기는 A/옵션을 유지하고 전체 초기화는 해제한다.
5. 느린 source header 대기 중 다른 사진 선택/옛 행 삭제 후 늦은 read가 끝나도 옛 사진은 decode/복원되지 않고 현재 사진의 preview 크기를 사용한다. 설정 미리보기만으로 PNG를 생성하지 않는다.
6. 완료 결과가 있는 부모에서 ZIP encode 대기→unmount 뒤 완료시 자동 다운로드0, URL 중복 회수0. 기존 URL·저장소 bytes는 변하지 않는다.

## 범위와 남은 검증

- geometry는 Canvas 명령/행렬 대조다. 실제 PNG 픽셀·alpha rasterization·폰트 환경별 시각 결과를 검증했다는 뜻이 아니다.
- EXIF는 공용 decoder 옵션과 adapter가 반환받은 실제 크기를 쓰는 경계 검사다. 실제 EXIF 파일 decode는 브라우저 증거와 분리한다.
- 80MiB는 output Blob metadata 포트로 검사해 실제80MiB 이미지 버퍼를 만들지 않았다. ZIP은 capture/Blob identity/encode busy 포트 검사이며 실제 ZIP CRC/PNG 내용은 별도다.
- 실제 부모 검사는 제어된 hook/DOM/읽기/Canvas/Clipboard 포트 실행이다. 브라우저 native 이미지·ZIP·키보드·모바일 검증은 별도 담당 결과와 구분한다.
- 기존 압축/QR/공용 ZIP·32 TS를 수정하지 않았다. Chrome·전체 타입 검사·빌드·배포·git 명령을 실행하지 않았다.
