# 텍스트 비교 순수 도메인 준비

2026-11-17 KST. root가 `src/utils/lineDiff.ts`와 `scripts/check-line-diff.ts`를 작성했다. 현재 부모 UI·Worker·메시지에 연결하지 않았으며 19차 제품 완료가 아니다.

- UTF-8 문서당 1MiB·10,000줄, 공통 앞/뒤 구간을 제외한 DP 4,000,000셀 상한. DP는 uint16 최대 8MB이며 10,000줄 안에서 길이 값이 범위를 넘지 않는다.
- CRLF/CR을 LF로 정규화하고, 마지막 개행은 마지막 빈 줄로 구분한다. 공백은 비교 대상이며 빈 문서는 0행이다.
- 비교 행에는 양쪽 원문 줄 번호를 보존한다. 추가 행을 제외하면 왼쪽, 삭제 행을 제외하면 오른쪽 정규화 원문을 재구성할 수 있다.
- 내보내기 유틸은 `+`/`-`/공백 접두사의 읽기용 텍스트다. 표준 unified patch라고 표시하지 않는다.

검사 실행 결과:

```text
node scripts/check-line-diff.ts
Line diff: 8 groups passed
npx eslint src/utils/lineDiff.ts scripts/check-line-diff.ts
exit 0
```

8그룹 안에 31개 소형 중복 시퀀스의 961쌍 전조합에 대한 독립 재귀 LCS 길이 대조·양쪽 원문 재구성·줄 번호, 빈 문서/빈 줄/한글/HTML 텍스트, 개행 정책, 10,000줄 동일 문서와 한 줄 변경, UTF-8/줄 수/작업량 한도, DP 정확한 경계, 텍스트 반출이 포함된다. 실제 Worker 응답성·취소·모바일·다운로드는 아직 검증하지 않았다. 테스트 속도를 브라우저 성능 수치로 표현하지 않는다.
