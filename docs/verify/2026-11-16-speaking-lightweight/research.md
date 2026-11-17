# 말하기 연습실 다운로드 경량화 조사 — 2026-11-16

> 후속: 이 조사 뒤 사용자가 경량 기본 모드 구현을 승인해 완료했다. [구현·검증 결과](../2026-11-16-speaking-light-default/report.md). 아래 내용은 모델 비교 당시의 조사 기록이다.

추천: 모바일 기본 경험을 **녹음·재녹음 비교·기기 내 저장 + Whisper tiny 음성인식 + 규칙 기반 점검**으로 구성한다. 문장 생성 모델은 별도 선택 기능으로 둔다. 이번 작업은 조사와 격리 실행 검증이며 앱의 Qwen 모델이나 의존성은 교체하지 않았다.

## 실제 다운로드 파일 비교

공식 저장소 API의 바이트 크기로 합산했다. MB는 1,000,000바이트 기준이다. 아래 수치는 명시한 모델/토크나이저 파일의 합이며 실행 JS·WASM·기타 설정 파일·음성 모델을 포함한 전체 전송량이나 실행 메모리가 아니다. 원본 수치는 `model-sizes.json`에 있다.

| 후보 | 파일 합계 | 한국어 말하기 코치 판단 |
| --- | ---: | --- |
| [Whisper tiny int8](https://huggingface.co/onnx-community/whisper-tiny/tree/main/onnx) | 음성인식 모델 40.84MB, tokenizer 포함 43.32MB | 기존 음성인식 유지에 적합. 생성형 피드백 모델이 아니므로 점검 규칙과 준비된 코칭 문구를 결합 |
| [LFM2.5-230M ONNX q4](https://huggingface.co/LiquidAI/LFM2.5-230M-ONNX) | 216.00MB | WebGPU 구동은 확인. 한국어 코칭 예제 2개에서 지시문을 반복해 현 상태 채택 보류 |
| [LFM2.5-230M GGUF Q4_K_M](https://huggingface.co/LiquidAI/LFM2.5-230M-GGUF/tree/main) | 153.41MB | 더 작지만 별도 브라우저 GGUF 런타임 검증 필요. 이번 실행 대상은 아님 |
| [SmolLM2-135M Instruct q4f16](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct) | 119.80MB | 공식 설명이 영어 중심임을 명시. 한국어 코치 기본값으로 추천하지 않음 |
| [Gemma3-270M ONNX q4f16](https://huggingface.co/onnx-community/gemma-3-270m-it-ONNX/tree/main/onnx) | 293.28MB | 이름의 파라미터 수에 비해 실제 파일이 큼. 이번에 실행·품질 검증하지 않음 |

LFM은 [공식 모델 카드](https://huggingface.co/LiquidAI/LFM2.5-230M)에 한국어를 포함하지만, 언어 지원이 코칭 품질을 보장하지는 않는다. ONNX 배포본은 WebGPU에 q4/fp16을 권장한다. 재배포 전 각 모델 라이선스 확인이 필요하며 LFM은 Apache/MIT가 아닌 LFM Open License를 사용한다.

## LFM 실제 브라우저 실행

Windows Chrome WebGPU, Transformers.js 4.3.2, q4, greedy decoding, 최대 200토큰, repetition penalty 1.05. 격리된 테스트 프로필을 사용했다. `probe-speaking-lightweight.mjs`와 `lfm-browser.json`에 프롬프트·출력·환경이 있다.

- 자기소개: 개선점/다듬은 답변 대신 요청 문장을 반복했다.
- 업무 보고: 완료/예정 상태를 보존하라는 요청 문장을 반복했다.
- 단순 한국어 축약: 입력 화면을 개선했다는 원문을 문장을 변경했다는 뜻으로 바꿨다.
- 영어 대조 예제: 두 문장을 한 문장으로 합치는 작업은 수행했다.

4개 예제는 전체 성능 벤치마크가 아니다. 현재 한국어 자기소개·업무 보고 기능에 바로 교체할 근거가 부족하다는 판단이다. PC 실행 시간으로 모바일 속도·메모리를 추정하지 않는다. 실제 휴대기기, Safari 및 GGUF 경로는 미검증이다.

## 추천하는 모바일 흐름

1. 첫 접속에는 큰 생성 모델을 받지 않고 녹음·다시 듣기·비교·기기 내 저장을 제공한다.
2. 음성인식을 선택할 때 Whisper 파일과 실행 파일의 다운로드를 안내하고, 진행률·취소·캐시 삭제를 제공한다. Web Worker에서 처리하며 60초 녹음을 기준으로 실제 휴대기기 성능을 확인한다.
3. 기본 점검은 말하기 시간·속도·반복어·추임새와 자기소개/업무 보고 구성 체크로 제한한다. 인식된 글은 사용자가 고칠 수 있게 한다. 키워드 규칙을 의미 이해나 발음 평가처럼 표시하지 않는다.
4. 자연스러운 문장 재작성은 선택형 고급 코칭으로 둔다. 경량 모델은 한국어 사실 보존·완료/예정 구분 검증을 통과한 뒤 채택한다. 기존 Qwen 대형 모델을 유지하더라도 명시적으로 선택한 사용자에게만 받게 한다.

브라우저 기본 음성인식은 기본 동작에서 원격 처리가 가능하다. 기기 내 처리를 약속하려면 `processLocally`와 한국어 언어팩 지원을 확인해야 하며 언어팩 다운로드가 필요할 수 있다. [MDN 설명](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally)

Chrome 내장 Prompt API도 보편적인 모바일 무다운로드 대안은 아니다. 공식 문서의 지원 기기 조건상 Gemini Nano 기반 API는 Android/iOS에서 지원되지 않으며 초기 모델 다운로드 및 하드웨어 조건이 있다. [Chrome 공식 문서](https://developer.chrome.com/docs/ai/prompt-api)

캐시는 재방문 비용을 줄이고 짧은 프롬프트는 처리 시간·메모리를 줄이지만, 최초 모델 파일 크기를 줄이지는 않는다.
