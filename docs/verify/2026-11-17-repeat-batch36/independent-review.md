# 36 DutchPay 독립 검토

2026-11-17 KST. 구현 담당의 최종 부모 안정 상태를 읽고 별도 계산 oracle·저장 포트·실제 부모/ShareResult 이벤트로 검증했다. **11그룹 PASS, 새 재현 결함·추가 제품 수정 요청 없음.** 제품/계산기/codec/번역 파일은 수정하지 않았고39 준비 TS도 고정했다.

검사: `docs/verify/2026-11-17-repeat-batch36/check-dutch-independent.mjs`. 작성자의 검사 assertion/fixture를 실행하거나 복제하지 않았다. 재사용한 것은 기존29의 공통 hook/effect host뿐이고, 상태·I/O·기대값·actual ShareResult 결합은 독립 작성했다.

```powershell
node --experimental-strip-types docs/verify/2026-11-17-repeat-batch36/check-dutch-independent.mjs
npx eslint docs/verify/2026-11-17-repeat-batch36/check-dutch-independent.mjs
```

실행11그룹 PASS·검사 JS ESLint exit0/오류0/경고0. 전체 tsc·Chrome·빌드·배포·커밋은 실행하지 않았다.

## 별도 순수/포트5그룹

1. **정확 계산**:500개의 허용 금액/0·소수 가중치/선택 인원 조합을 별도 BigInt 분수 몫·나머지 oracle로 대조했다. 금액1e11 경계,동률 인덱스,모두0배의 균등 분배,선택없음을 포함한다. 여행 송금 반영 후 모든 순잔액0,간단모드3가지 반올림의 총합·총무 차액 보존을 확인했다. 기존 계산이나 codec에 변경을 요청하지 않는다.
2. **기존 최대 기록**:기존8요소 tuple을 직접 구성하고 Node Buffer base64url로 인코딩한 서로 다른 정상10개가 **339,201 UTF-8 bytes**임을 확인했다. parser는10개 전체를 그대로 읽고100개항목과원본raw를 보존했다.101항목 새저장 거부는 원래 State JSON을 바꾸지 않는다. null/object/손상/중복목록/metadata불일치/future버전은 원본을 가진 실패로 구별한다. 계좌JSONnull 거부와60코드유닛escape 문자열도 확인했다.
3. **recent 쓰기**:같은basis 두reader 중 첫 쓰기만 성공,두 번째 CAS충돌,quota원본보존,대기lock취소,readback실패의unconfirmed 및이미쓴값rollback0을 확인했다.
4. **account coordinator**:연속 입력의 오래된대기취소,확인된자기쓰기 직후Promisecontinuation보다앞선새편집의basis갱신,외부충돌·재조회 후현재입력보존,명시재시도,unknownwrite 후자동덮기차단을 확인했다.
5. **copy 포트**:대상/activation세대와늦은native거절뒤fallback0,legacy true만성공·false/undefined실패를 확인했다. 이미OS에제출된native복사 자체를 취소할 수 있다고 주장하지 않는다.

## 실제 부모/ShareResult6그룹

6. **초기 복원**:ready전0쓰기·버튼차단,Strict effect replay 후1개RAF,공유URL 우선·최근기록자동적용0,기기계좌만읽기,unknown중복query/hash/history.state유지,legacy total/people복원을 확인했다.
7. **저장/불러오기**:저장은클릭snapshot이며대기중폼편집을되돌리지않고그폼에옛저장성공을표시하지않는다. 불러오기대기중편집은로드를취소한다. 실제100→101항목추가뒤저장거부가101행/저장원본bytes를보존한다.
8. **계좌 상태**:실제부모의연속계좌입력→lock해제,타탭raw변경+storageevent,현재draft보존·명시재조회/재시도,readback불가 뒤메모리공지의최신입력과자동쓰기중단을 확인했다.
9. **ro/계좌 경계**:편집공지/명시ShareResult text는기기계좌를포함하지만공유d/최근기록에는포함하지않는다. 같은링크의ro새부모에서는계좌입력·저장UI와공지계좌가없다. ro를보안/송금완료표시로해석하지않는다.
10. **복사/복구**:공지→링크교체의늦은fallback0,입력A→B→A·KO→EN→KO·옛성공timer 이후옛안내부활0,실패복구의정확한literal snapshot·새입력에서숨김·재시도와원래버튼초점복귀를 확인했다.
11. **공용공유 연동**:실제ShareResult를실행해부모공지pending→공유링크성공→옛거절과그역방향이fallback을추가실행하지않음을 확인했다. 공유이미지pending 뒤부모새복사는늦은다운로드를막는다. 양쪽의완료상태와현재결과는보존된다.

## 검증의 한계

이 검사는 실제 제품 함수를 실행하지만 Clipboard/Storage/Web Locks/DOM/File의외부I/O는결정적포트다. 네이티브API성공/실제두탭이벤트순서·실제브라우저초점/PNG·320px은브라우저담당결과로별도확인해야한다. 합성계좌/명단만사용했고원문값을로그로출력하지않았다. 저장소잠금미지원환경의CAS/readback은완전동시쓰기를원자적으로보장하지않는기존설계한계를유지한다.
