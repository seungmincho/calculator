# 1분 말하기 연습실 MVP — 2026-11-16

사용자가 승인한 한국어 자기소개·업무 보고 MVP를 `/speaking-practice/`에 구현했다. 로컬 개발 서버 `http://localhost:3039/speaking-practice/`에서 확인할 수 있다. 빌드·배포·커밋은 실행하지 않았다. 작업 전부터 있던 유류비 계산기·가이드 등 다른 변경은 보존했다.

> **2026-11-16 후속 구현 완료:** 기본 경험은 Whisper tiny + 생성 모델 없는 자동 점검이다. Qwen 코칭은 다운로드 안내·동의 후 실행하는 선택 기능으로 분리했다. 기존 기록 형식(version 1), 재녹음 비교, 음성/원문/코칭 저장을 유지했다. 모델 작업 후 워커 해제, 오프라인 캐시 삭제, 모바일 16px 입력·전체 폭 버튼·상단 진행/취소 표시를 추가했다. 검증은 [경량 기본 모드 보고서](../verify/2026-11-16-speaking-light-default/report.md). 아래는 최초 MVP 구현 기록이다.

## 구현

- 목표 60초, 최대 90초 녹음. 마이크 입력 크기, 자동 종료, 권한 요청 취소, 파일 불러오기(15MB 이내), 직접 입력을 지원한다.
- Whisper tiny q8 / Transformers.js 3.8.1을 Web Worker + WASM에서 실행한다. 음성을 16kHz mono로 변환하고, 전사문을 사용자가 확인·수정한 후 피드백을 실행한다.
- Qwen3-1.7B q4 / WebLLM 0.2.88을 Web Worker + WebGPU에서 실행한다. 첫 다운로드 약 1.1GB, 사용자 동작 시에만 로드하며 브라우저 캐시를 재사용한다. shader-f16이 없으면 q4f32 모델을 선택한다.
- 원문 근거·장점·개선점·다듬은 답변·다음 말하기 행동을 제공한다. JSON 제약으로 인용을 원문 구절로 한정하고, 후검증에서 잘못된 인용·새 숫자·잘못된 출력 형식을 거절한다. 다음 행동은 모드별 말하기 연습 중에서 모델이 선택한다. 원문의 임의 사실 변경을 모두 판별하는 것은 아니므로 결과 확인 안내가 있다.
- 동일 질문에서 최대 5회. 첫 답변과 선택한 답변의 녹음·전사문·시간·어절 수·분당 어절 수·60초와의 차이를 비교한다. 음성은 하나씩 재생한다. 직접 입력은 시간과 속도를 추측하지 않는다.
- IndexedDB에 최대 20개 연습을 저장하며 음성 Blob과 피드백을 함께 복원한다. 실패한 저장을 성공으로 표시하지 않는다. 기존 기록 수정·삭제, 텍스트 내보내기, 음성 별도 다운로드를 지원한다.
- 공유 카드와 URL에는 모드·시간·어절 수만 담는다. 음성·전사문·피드백은 포함하지 않는다.
- WebGPU 미지원 환경에서도 녹음·직접 편집·비교·저장은 유지한다. 서버 AI 대체 경로는 없다.
- 메뉴, 아이콘, 관련 도구, ko/en 번역, 메타데이터/JSON-LD, OG 이미지, RSS·리다이렉트·llms.txt를 등록했다.

## 주요 파일

- `src/components/SpeakingPractice.tsx`, `src/app/speaking-practice/page.tsx`
- `src/hooks/useSpeakingRecorder.ts`
- `src/lib/speaking/{core,client,storage,audio,asr.worker,llm.worker}.ts`
- `messages/{ko,en}.json`, 생성된 speakingPractice 네임스페이스
- `package.json`·`package-lock.json`: 브라우저 모델 런타임 두 개 추가
- `tsconfig.json`: Turbopack이 `out/**/static/**`에 복사한 worker 원본을 전체 타입 검사에서 제외. 실제 `src/` worker는 계속 검사한다.
- `scripts/generate-og.mjs`: 설치된 Chrome을 `TOOLHUB_BROWSER_CHANNEL=chrome`으로 선택 가능하게 했다.

## 검증

- 전체 `tsc --noEmit`: 통과. 신규 TS/TSX 대상 ESLint: 오류·경고 0.
- 번역 생성본 794개 일치, 네임스페이스 audit unresolved 0. 기존 동적 네임스페이스 안내 60건은 남아 있다.
- `node scripts/check-speaking-practice.ts`: 12개 통과.
- `node scripts/check-speaking-practice-browser.mjs`: 가상 마이크를 사용한 Chrome 사용자 흐름 12개를 검증했다. 자동 종료 검증 중 개발 서버 hot reload가 발생한 첫 실행은 중단됐고, 소스 변경 없이 단독 재검증하여 실제 90초 자동 종료를 확인했다. 최종 결과는 `docs/verify/2026-11-16-speaking/verification-summary.json`.
- 실제 한국어 음성 샘플 → Whisper 전사 성공. 고유명사 인식 오류가 있어 원문 확인·수정 단계를 유지했다.
- 실제 Qwen3-1.7B → 자기소개·업무 보고 피드백 성공. 이 PC의 캐시 사용 환경에서 각각 약 11초·6초. 일반 기기의 속도 보장은 아니다.
- 실제 생성된 피드백 저장·복원, 전사문 수정 시 이전 피드백 제거를 검증했다. 모델 테스트의 외부 네트워크 요청은 GET뿐이며 입력 전송이 없었다. 테스트가 차단한 광고 요청의 ERR_FAILED 한 건 외 런타임 오류 없음.
- 모바일 375px·320px 및 다크 모드 가로 넘침 없음. 마이크 거절/늦은 권한 응답 취소, 모델 로딩 취소, 저장 실패, 20개 제한, 손상 기록 무시, 공유 원문 제외를 검증했다.

재실행:

```powershell
node scripts/check-speaking-practice.ts
node scripts/check-speaking-practice-browser.mjs
node scripts/check-speaking-models.mjs docs/verify/2026-11-16-speaking/korean-test.wav
```

모델 검증은 `.wrangler/speaking-model-profile`의 격리된 테스트 Chrome 캐시를 사용한다. 사용자 브라우저 프로필이나 실제 마이크는 사용하지 않는다. 브라우저 흐름 검증에서 특정 시나리오만 재실행할 때 두 번째 인자로 이름 일부를 넘길 수 있다.

## 확인 범위와 다음 단계

검증 환경은 Windows Chrome과 가상 마이크다. 실제 모바일 기기의 메모리 제한, Safari의 녹음 형식과 WebGPU, 프로덕션 static export는 아직 검증하지 않았다. 사용자가 빌드를 요청하면 전체 타입 검사 후 빌드하고 static HTML·모바일 fold·프로덕션 worker 경로를 확인한다. 발음·억양·면접 합격 점수는 제공하지 않는다.

## 공개 음성 테스트 자료 출처

`docs/verify/2026-11-16-speaking/korean-test.wav`는 [Zeroth-Korean / OpenSLR 40](https://www.openslr.org/40/)의 테스트 샘플 `105_003_0029`이다. Zeroth Project, Lucas Jo(Atlas Guide Inc.)·Wonkyum Lee(Gridspace Inc.), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Hugging Face 배포본](https://huggingface.co/datasets/kresnik/zeroth_korean)의 preview가 변환한 WAV를 사용했으며 추가 가공하지 않았다. 샘플 원문과 식별자는 `asr-fixture-source.json`에 기록했다.

런타임 참고: [Whisper tiny ONNX](https://huggingface.co/onnx-community/whisper-tiny), [Qwen3-1.7B MLC](https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC), [WebLLM 문서](https://webllm.mlc.ai/docs/user/advanced_usage.html).
