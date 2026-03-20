'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Copy, Check, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

type Category = 'all' | '1xx' | '2xx' | '3xx' | '4xx' | '5xx'

interface StatusCode {
  code: number
  name: string
  description: string
  detail: string
  useCases: string[]
  causes: string[]
  fixes: string[]
}

// ── Data (hardcoded Korean) ────────────────────────────────────────────────

const STATUS_CODES: StatusCode[] = [
  // 1xx Informational
  {
    code: 100,
    name: 'Continue',
    description: '요청의 첫 부분을 받았으며 계속 진행해도 됩니다',
    detail: '클라이언트가 Expect: 100-continue 헤더를 보냈을 때 서버가 요청을 계속 처리할 의사가 있음을 알립니다.',
    useCases: ['대용량 파일 업로드 전 사전 확인', 'PUT 요청 본문 전송 전 서버 의사 확인'],
    causes: ['클라이언트가 Expect 헤더를 포함한 요청을 전송'],
    fixes: ['서버가 자동으로 처리합니다. 별도 조치 불필요'],
  },
  {
    code: 101,
    name: 'Switching Protocols',
    description: '서버가 프로토콜 전환 요청을 수락했습니다',
    detail: '클라이언트의 Upgrade 헤더 요청에 따라 서버가 다른 프로토콜로 전환합니다. 주로 WebSocket 연결 업그레이드에 사용됩니다.',
    useCases: ['HTTP → WebSocket 업그레이드', 'HTTP/1.1 → HTTP/2 전환'],
    causes: ['클라이언트가 Upgrade 헤더로 프로토콜 전환을 요청'],
    fixes: ['정상 동작입니다. WebSocket 연결이 성공적으로 수립됩니다'],
  },
  {
    code: 102,
    name: 'Processing',
    description: '서버가 요청을 수신하여 처리 중이지만 아직 응답이 없습니다',
    detail: 'WebDAV 확장 상태코드로, 서버가 시간이 많이 걸리는 요청을 처리 중임을 알려 클라이언트의 타임아웃을 방지합니다.',
    useCases: ['대용량 파일 처리', 'WebDAV 복잡한 연산'],
    causes: ['처리 시간이 긴 서버 작업'],
    fixes: ['서버가 정상 처리 중이므로 기다리세요'],
  },
  {
    code: 103,
    name: 'Early Hints',
    description: '최종 응답 전에 미리 힌트를 제공합니다',
    detail: '서버가 최종 응답을 준비하는 동안 Link 헤더를 미리 전송해 브라우저가 리소스를 사전 로드할 수 있게 합니다.',
    useCases: ['중요 CSS/JS 파일 사전 로드', 'LCP 이미지 prefetch로 성능 개선'],
    causes: ['서버가 Early Hints를 지원하고 Link 헤더를 미리 전송'],
    fixes: ['정상 동작입니다. 성능 최적화에 활용하세요'],
  },

  // 2xx Success
  {
    code: 200,
    name: 'OK',
    description: '요청이 성공적으로 처리되었습니다',
    detail: '가장 일반적인 성공 응답입니다. GET, POST, PUT 등 대부분의 요청이 성공하면 반환됩니다.',
    useCases: ['GET 요청 성공', 'POST 처리 성공', '폼 제출 성공'],
    causes: ['서버가 요청을 정상 처리'],
    fixes: ['정상 동작입니다'],
  },
  {
    code: 201,
    name: 'Created',
    description: '요청이 성공하여 새 리소스가 생성되었습니다',
    detail: 'POST 또는 PUT 요청으로 새 리소스 생성이 성공했을 때 반환됩니다. Location 헤더에 새 리소스 URL을 포함하는 것이 권장됩니다.',
    useCases: ['새 사용자 계정 생성', '새 게시글 작성', 'REST API에서 POST 성공'],
    causes: ['새 리소스가 성공적으로 생성됨'],
    fixes: ['정상 동작입니다. Location 헤더로 새 리소스 URL을 확인하세요'],
  },
  {
    code: 202,
    name: 'Accepted',
    description: '요청을 수신했지만 아직 처리가 완료되지 않았습니다',
    detail: '비동기 작업에서 요청은 받았으나 처리가 완료되지 않은 상태입니다. 이메일 전송, 배치 처리 등 오래 걸리는 작업에 사용됩니다.',
    useCases: ['비동기 이메일 전송', '백그라운드 배치 처리', '영상 인코딩 작업 대기'],
    causes: ['서버가 요청을 큐에 넣고 나중에 처리 예정'],
    fixes: ['폴링(polling)이나 웹훅으로 처리 완료 여부를 확인하세요'],
  },
  {
    code: 204,
    name: 'No Content',
    description: '요청은 성공했지만 반환할 콘텐츠가 없습니다',
    detail: '주로 DELETE 요청 또는 본문 없이 성공하는 PUT 요청에 사용됩니다. 응답 본문이 없어야 합니다.',
    useCases: ['리소스 삭제 성공', '설정 업데이트 성공', '하트비트/핑 응답'],
    causes: ['요청은 성공했지만 클라이언트에 반환할 데이터 없음'],
    fixes: ['정상 동작입니다. 응답 본문이 없는 것이 맞습니다'],
  },
  {
    code: 206,
    name: 'Partial Content',
    description: '요청한 리소스의 일부분만 전송됩니다',
    detail: '클라이언트가 Range 헤더로 리소스 일부를 요청했을 때 반환됩니다. 대용량 파일 분할 다운로드, 동영상 스트리밍에 활용됩니다.',
    useCases: ['동영상 스트리밍 (범위 요청)', '다운로드 재개 (Resume)', '분할 다운로드'],
    causes: ['클라이언트가 Range 헤더로 특정 바이트 범위를 요청'],
    fixes: ['정상 동작입니다. Content-Range 헤더로 반환된 범위를 확인하세요'],
  },
  {
    code: 207,
    name: 'Multi-Status',
    description: '여러 상태 코드가 적절한 다중 리소스 응답입니다',
    detail: 'WebDAV에서 사용하는 상태코드로, 복수의 독립된 작업 결과를 하나의 응답에 담습니다. 각 리소스의 상태가 XML로 포함됩니다.',
    useCases: ['WebDAV 다중 파일 작업', 'PROPFIND 요청 결과', '일괄 처리 부분 성공'],
    causes: ['복수 리소스에 대한 작업의 각기 다른 결과'],
    fixes: ['응답 본문의 XML을 파싱해 개별 리소스 상태를 확인하세요'],
  },

  // 3xx Redirection
  {
    code: 300,
    name: 'Multiple Choices',
    description: '요청한 리소스에 여러 가지 버전이 있습니다',
    detail: '클라이언트가 여러 선택지 중 하나를 고를 수 있습니다. 실제로는 거의 사용되지 않으며 대부분의 구현에서 Location 헤더로 기본값을 제시합니다.',
    useCases: ['다국어 문서 선택', '다양한 미디어 타입 선택'],
    causes: ['서버에 동일 URI로 접근 가능한 여러 표현이 존재'],
    fixes: ['Location 헤더나 응답 본문에서 원하는 리소스를 선택하세요'],
  },
  {
    code: 301,
    name: 'Moved Permanently',
    description: '요청한 리소스가 영구적으로 새 URL로 이동했습니다',
    detail: 'URL이 영구적으로 변경되었습니다. 브라우저와 검색 엔진은 향후 새 URL로 직접 접근합니다. SEO Link Equity가 새 URL로 이전됩니다.',
    useCases: ['HTTP → HTTPS 전환', '도메인 이전', '페이지 URL 영구 변경', 'www → non-www 통합'],
    causes: ['URL 구조 변경, 도메인 이전, HTTPS 강제 전환'],
    fixes: ['올바른 URL로의 301 리다이렉트를 설정하세요. 검색엔진 재색인까지 시간이 필요합니다'],
  },
  {
    code: 302,
    name: 'Found',
    description: '요청한 리소스가 임시로 다른 URL로 이동했습니다',
    detail: '일시적인 리다이렉트입니다. 검색 엔진은 원래 URL을 계속 색인합니다. 일부 브라우저는 POST → GET으로 메서드를 변경하는 문제가 있습니다.',
    useCases: ['A/B 테스트', '임시 점검 페이지', '로그인 후 원래 페이지로 복귀'],
    causes: ['일시적인 URL 이동'],
    fixes: ['영구 이동이라면 301을 사용하세요. POST 메서드를 유지하려면 307을 사용하세요'],
  },
  {
    code: 303,
    name: 'See Other',
    description: '다른 URI에서 GET 요청으로 리소스를 찾으세요',
    detail: 'POST 처리 후 결과를 GET으로 리다이렉트할 때 사용합니다. PRG(Post/Redirect/Get) 패턴의 핵심으로 폼 중복 제출을 방지합니다.',
    useCases: ['폼 제출 후 결과 페이지 이동', 'PRG 패턴', '파일 업로드 후 완료 페이지'],
    causes: ['POST 요청 처리 후 GET으로 전환 필요'],
    fixes: ['정상 동작입니다. 폼 중복 제출 방지를 위한 PRG 패턴입니다'],
  },
  {
    code: 304,
    name: 'Not Modified',
    description: '리소스가 수정되지 않아 캐시된 버전을 사용하세요',
    detail: '클라이언트의 캐시에 있는 리소스가 여전히 유효합니다. 서버는 응답 본문 없이 이 코드만 반환해 대역폭을 절약합니다.',
    useCases: ['브라우저 캐시 활용', '조건부 GET 요청', 'ETag 기반 캐시 검증'],
    causes: ['If-None-Match 또는 If-Modified-Since 헤더로 조건부 요청 시 리소스 미변경'],
    fixes: ['정상 동작입니다. 캐시된 리소스를 사용하면 됩니다'],
  },
  {
    code: 307,
    name: 'Temporary Redirect',
    description: '요청을 임시 URL로 리다이렉트하되 메서드를 유지합니다',
    detail: '302와 달리 POST 메서드를 GET으로 변경하지 않습니다. 임시 리다이렉트이므로 검색 엔진은 원래 URL을 유지합니다.',
    useCases: ['POST 요청 임시 리다이렉트', 'API 버전 임시 전환', '서버 유지보수 중 임시 이전'],
    causes: ['POST/PUT 메서드 유지가 필요한 임시 이동'],
    fixes: ['영구 이동이라면 308을 사용하세요'],
  },
  {
    code: 308,
    name: 'Permanent Redirect',
    description: '요청을 영구 URL로 리다이렉트하되 메서드를 유지합니다',
    detail: '301과 달리 POST 메서드를 GET으로 변경하지 않습니다. 영구 리다이렉트이므로 검색 엔진은 새 URL로 Link Equity를 이전합니다.',
    useCases: ['POST API 엔드포인트 영구 이전', 'REST API URL 영구 변경'],
    causes: ['POST/PUT 메서드 유지가 필요한 영구 이동'],
    fixes: ['모든 클라이언트가 새 URL을 사용하도록 업데이트하세요'],
  },

  // 4xx Client Error
  {
    code: 400,
    name: 'Bad Request',
    description: '서버가 요청을 이해할 수 없습니다',
    detail: '클라이언트의 요청 문법이 잘못되었거나, 유효하지 않은 요청 메시지 프레이밍, 또는 잘못된 요청 라우팅입니다.',
    useCases: ['잘못된 JSON 형식', '필수 파라미터 누락', '유효하지 않은 입력값'],
    causes: ['잘못된 요청 형식', '필수 필드 누락', '잘못된 데이터 타입', '유효성 검사 실패'],
    fixes: ['요청 본문 JSON 문법을 확인하세요', '필수 파라미터가 모두 포함되었는지 확인하세요', 'API 문서를 참조해 올바른 형식으로 요청하세요'],
  },
  {
    code: 401,
    name: 'Unauthorized',
    description: '인증이 필요합니다',
    detail: '요청된 리소스에 접근하려면 인증이 필요합니다. WWW-Authenticate 헤더로 인증 방법을 안내합니다. 이름과 달리 실제로는 "인증 안 됨"을 의미합니다.',
    useCases: ['로그인하지 않은 사용자의 보호된 리소스 접근', '만료된 JWT 토큰', '잘못된 API 키'],
    causes: ['Authorization 헤더 누락', 'JWT 토큰 만료 또는 유효하지 않음', '잘못된 API 키 또는 비밀번호'],
    fixes: ['로그인 후 다시 시도하세요', 'JWT 토큰을 갱신하세요 (refresh token 사용)', '올바른 API 키를 Authorization 헤더에 포함하세요'],
  },
  {
    code: 402,
    name: 'Payment Required',
    description: '결제가 필요합니다',
    detail: '원래 디지털 결제 시스템을 위해 예약되었으나, 현재는 유료 구독이 필요한 서비스에서 비공식적으로 사용됩니다.',
    useCases: ['유료 API 할당량 초과', '구독 만료', '크레딧 부족'],
    causes: ['API 무료 사용량 초과', '결제 실패 또는 구독 만료'],
    fixes: ['구독을 결제하거나 갱신하세요', '더 높은 플랜으로 업그레이드하세요'],
  },
  {
    code: 403,
    name: 'Forbidden',
    description: '서버가 요청을 거부합니다',
    detail: '인증 여부와 관계없이 해당 리소스에 접근할 권한이 없습니다. 인증을 해도 접근할 수 없습니다.',
    useCases: ['관리자 전용 페이지 접근', '다른 사용자 데이터 접근 시도', '잘못된 CORS 설정', '디렉토리 목록 접근 차단'],
    causes: ['접근 권한 없음', 'IP 차단', '잘못된 파일 권한', 'CORS 정책 위반'],
    fixes: ['관리자에게 권한을 요청하세요', 'CORS 정책을 확인하고 올바른 Origin을 허용하세요', '서버의 파일 권한 설정을 확인하세요'],
  },
  {
    code: 404,
    name: 'Not Found',
    description: '요청한 리소스를 찾을 수 없습니다',
    detail: '서버가 요청한 URI에 해당하는 리소스를 찾을 수 없습니다. 리소스가 존재하지 않거나 URL이 틀렸을 수 있습니다. 리소스 존재 여부를 숨기고 싶을 때도 사용합니다.',
    useCases: ['존재하지 않는 페이지', '삭제된 게시글', '잘못 입력한 URL', '이동된 API 엔드포인트'],
    causes: ['URL 오타', '리소스 삭제', '잘못된 라우팅 설정', '대소문자 불일치'],
    fixes: ['URL을 확인하세요', '리소스가 이동했다면 301 리다이렉트를 설정하세요', '영구 삭제됐다면 410을 사용하세요'],
  },
  {
    code: 405,
    name: 'Method Not Allowed',
    description: '요청 메서드가 허용되지 않습니다',
    detail: '해당 리소스에 사용할 수 없는 HTTP 메서드를 사용했습니다. Allow 헤더에 허용된 메서드 목록이 포함됩니다.',
    useCases: ['GET 전용 엔드포인트에 POST 요청', '읽기 전용 리소스에 DELETE 요청'],
    causes: ['잘못된 HTTP 메서드 사용', 'REST API 메서드 규칙 위반'],
    fixes: ['Allow 헤더를 확인해 허용된 메서드를 사용하세요', 'API 문서를 참조해 올바른 메서드를 사용하세요'],
  },
  {
    code: 406,
    name: 'Not Acceptable',
    description: '클라이언트가 수락 가능한 응답 형식이 없습니다',
    detail: '클라이언트의 Accept 헤더에 명시된 미디어 타입으로 응답할 수 없습니다. 콘텐츠 협상(Content Negotiation) 실패입니다.',
    useCases: ['JSON만 수락하는데 서버가 XML만 제공', '특정 언어 콘텐츠 미지원'],
    causes: ['Accept 헤더의 요구 형식을 서버가 지원하지 않음'],
    fixes: ['Accept 헤더를 서버가 지원하는 형식으로 변경하세요', '서버에 필요한 응답 형식 지원을 추가하세요'],
  },
  {
    code: 408,
    name: 'Request Timeout',
    description: '서버가 요청을 기다리다 시간이 초과되었습니다',
    detail: '서버가 idle 상태 연결에 대해 타임아웃을 설정합니다. 클라이언트가 요청을 완료하지 않으면 서버가 연결을 닫습니다.',
    useCases: ['느린 네트워크에서 대용량 업로드', '연결 후 요청 전송 지연'],
    causes: ['네트워크 지연', '클라이언트가 요청 전송을 완료하지 못함', '서버 타임아웃 설정이 짧음'],
    fixes: ['네트워크 연결을 확인하세요', '요청을 다시 시도하세요', '서버 타임아웃 값을 늘리세요'],
  },
  {
    code: 409,
    name: 'Conflict',
    description: '요청이 서버의 현재 상태와 충돌합니다',
    detail: '리소스의 현재 상태와 충돌로 인해 요청을 완료할 수 없습니다. 예를 들어 이미 존재하는 사용자명으로 가입을 시도하는 경우입니다.',
    useCases: ['이미 사용 중인 이메일로 회원가입', '동시 편집 충돌', '버전 충돌 (Git merge conflict와 유사)'],
    causes: ['리소스 중복', '동시성 문제', '비즈니스 규칙 위반'],
    fixes: ['충돌 원인을 파악하고 다른 값으로 재시도하세요', 'ETag를 활용한 낙관적 잠금(Optimistic Locking)을 구현하세요'],
  },
  {
    code: 410,
    name: 'Gone',
    description: '요청한 리소스가 영구적으로 삭제되었습니다',
    detail: '404와 달리 리소스가 의도적으로 영구 삭제되었음을 명확히 합니다. 검색 엔진은 해당 URL을 더 빠르게 색인에서 제거합니다.',
    useCases: ['탈퇴한 사용자 프로필', '삭제된 게시글', '종료된 API 버전', '만료된 프로모션 페이지'],
    causes: ['리소스가 영구적으로 삭제됨'],
    fixes: ['리소스 복구가 불가능합니다. 삭제된 리소스는 410으로 응답하세요'],
  },
  {
    code: 413,
    name: 'Content Too Large',
    description: '요청 본문이 서버 허용 한도를 초과합니다',
    detail: '업로드 파일이나 요청 데이터가 서버가 허용하는 최대 크기를 초과합니다. 서버는 연결을 닫거나 Retry-After 헤더를 반환할 수 있습니다.',
    useCases: ['대용량 파일 업로드 실패', '너무 큰 JSON 요청 본문'],
    causes: ['업로드 파일이 허용 크기 초과', '서버의 client_max_body_size 설정'],
    fixes: ['파일 크기를 줄이세요', 'Nginx: client_max_body_size 값을 늘리세요', '분할 업로드(Multipart)를 고려하세요'],
  },
  {
    code: 414,
    name: 'URI Too Long',
    description: 'URI가 서버가 처리할 수 있는 것보다 깁니다',
    detail: 'URL 길이가 서버 허용 한도(보통 8KB)를 초과합니다. GET 파라미터에 너무 많은 데이터를 포함하면 발생합니다.',
    useCases: ['과도한 쿼리 파라미터', 'Base64 인코딩된 데이터를 URL에 포함'],
    causes: ['URL에 너무 많은 데이터 포함', '악의적인 리다이렉트 루프'],
    fixes: ['GET 대신 POST 요청으로 데이터를 본문에 포함하세요', 'URL 단축이나 세션 기반 상태 관리를 사용하세요'],
  },
  {
    code: 415,
    name: 'Unsupported Media Type',
    description: '지원하지 않는 미디어 타입으로 요청했습니다',
    detail: '요청의 Content-Type 헤더가 서버가 지원하는 형식이 아닙니다. 예: XML로 보냈는데 서버가 JSON만 받음.',
    useCases: ['XML 전송 시 JSON만 지원하는 API', '잘못된 Content-Type 헤더'],
    causes: ['Content-Type 헤더 누락 또는 잘못 설정', 'API가 지원하지 않는 형식'],
    fixes: ['Content-Type: application/json 헤더를 올바르게 설정하세요', 'API 문서를 확인해 지원하는 형식을 사용하세요'],
  },
  {
    code: 418,
    name: "I'm a teapot",
    description: '나는 주전자입니다. 커피를 끓이는 것을 거부합니다',
    detail: '1998년 만우절 농담으로 RFC 2324(HTCPCP)에서 정의된 상태코드입니다. 실제로 사용되지는 않지만 삭제하자는 제안이 2017년에 거부되어 공식 코드로 남아있습니다.',
    useCases: ['재미있는 에러 페이지', '봇 차단 (일부 서비스에서 비공식 사용)', '개발자 유머'],
    causes: ['커피 끓이기를 주전자에 요청하는 행위'],
    fixes: ['커피 머신에 요청하세요. 주전자는 커피를 끓일 수 없습니다 ☕'],
  },
  {
    code: 422,
    name: 'Unprocessable Content',
    description: '요청 형식은 맞지만 내용이 처리 불가능합니다',
    detail: '요청 본문의 문법은 올바르지만 의미적으로 유효하지 않습니다. 예: JSON 형식은 맞지만 필수 필드가 없거나 값 범위를 벗어남.',
    useCases: ['유효성 검사 실패', '비즈니스 규칙 위반', '잘못된 데이터 값 (날짜 형식 오류 등)'],
    causes: ['필수 필드 누락', '유효 범위를 벗어난 값', '비즈니스 로직 위반'],
    fixes: ['오류 응답의 세부 메시지를 확인하세요', '입력 데이터의 유효성을 검사하세요', 'API 문서의 필드 요구사항을 확인하세요'],
  },
  {
    code: 429,
    name: 'Too Many Requests',
    description: '너무 많은 요청을 보냈습니다 (Rate Limiting)',
    detail: '사용자가 일정 시간 안에 허용된 요청 수를 초과했습니다. Retry-After 헤더로 재시도 가능 시간을 안내합니다.',
    useCases: ['API Rate Limit 초과', 'DDoS 방어', '로그인 시도 제한'],
    causes: ['짧은 시간에 과도한 요청', 'API 할당량 소진', '봇 또는 크롤러'],
    fixes: ['Retry-After 헤더의 시간만큼 기다린 후 재시도하세요', '요청 빈도를 줄이세요', '더 높은 API 플랜으로 업그레이드하세요'],
  },
  {
    code: 451,
    name: 'Unavailable For Legal Reasons',
    description: '법적 이유로 리소스를 제공할 수 없습니다',
    detail: '디스토피아 소설 "화씨 451"에서 이름을 따온 상태코드입니다. 법원 명령, 저작권, 정부 검열 등 법적 이유로 콘텐츠를 차단합니다.',
    useCases: ['DMCA 저작권 침해 차단', '특정 국가에서 법적으로 금지된 콘텐츠', '법원 명령에 의한 접근 차단'],
    causes: ['저작권 침해 신고', '현지 법규 위반', '규제 당국의 차단 명령'],
    fixes: ['법적 조치를 해결하거나 합법적인 대안을 찾으세요'],
  },

  // 5xx Server Error
  {
    code: 500,
    name: 'Internal Server Error',
    description: '서버에서 예상치 못한 오류가 발생했습니다',
    detail: '서버가 요청 처리 중 예상하지 못한 상황에 놓였습니다. 포괄적인 서버 오류 코드로, 더 구체적인 코드가 없을 때 사용됩니다.',
    useCases: ['처리되지 않은 예외', '데이터베이스 오류', '코드 버그', '서버 구성 오류'],
    causes: ['코드의 예외 처리 실패', '데이터베이스 연결 오류', '서버 설정 오류', '외부 서비스 오류'],
    fixes: ['서버 로그를 확인하세요', '에러 트래킹 도구(Sentry 등)로 스택 트레이스를 분석하세요', '데이터베이스 연결을 확인하세요'],
  },
  {
    code: 501,
    name: 'Not Implemented',
    description: '서버가 요청 메서드를 지원하지 않습니다',
    detail: '서버가 요청 메서드를 인식하지 못하거나 구현하지 않았습니다. GET과 HEAD는 반드시 구현해야 하므로 이 코드를 반환할 수 없습니다.',
    useCases: ['아직 구현되지 않은 API 엔드포인트', '서버가 지원하지 않는 HTTP 확장'],
    causes: ['미구현 기능에 요청', '서버 소프트웨어의 한계'],
    fixes: ['해당 기능이 구현될 때까지 기다리세요', '대안적인 엔드포인트나 방법을 사용하세요'],
  },
  {
    code: 502,
    name: 'Bad Gateway',
    description: '게이트웨이/프록시가 잘못된 응답을 받았습니다',
    detail: '서버가 게이트웨이 또는 프록시 역할을 하면서 업스트림 서버로부터 유효하지 않은 응답을 받았습니다.',
    useCases: ['업스트림 서버 다운', 'Nginx → Node.js 앱 서버 연결 실패', 'CDN → 오리진 서버 오류'],
    causes: ['백엔드 서버 다운', '업스트림 서버 타임아웃', '잘못된 프록시 설정', '업스트림 서버의 잘못된 응답'],
    fixes: ['백엔드 서버 상태를 확인하세요', 'Nginx/HAProxy 오류 로그를 확인하세요', '업스트림 서버를 재시작하세요', 'proxy_read_timeout 값을 늘리세요'],
  },
  {
    code: 503,
    name: 'Service Unavailable',
    description: '서버가 일시적으로 요청을 처리할 수 없습니다',
    detail: '서버가 과부하 또는 유지보수로 인해 일시적으로 사용 불가 상태입니다. Retry-After 헤더로 복구 예상 시간을 안내할 수 있습니다.',
    useCases: ['서버 유지보수', '서버 과부하', '트래픽 급증', '배포 중 다운타임'],
    causes: ['서버 리소스 고갈 (CPU, 메모리)', '유지보수 모드', '트래픽 폭증', '서비스 배포 중'],
    fixes: ['Retry-After 헤더를 확인하고 나중에 재시도하세요', '서버 리소스를 확인하고 스케일 업/아웃을 고려하세요', '로드 밸런서와 오토 스케일링을 설정하세요'],
  },
  {
    code: 504,
    name: 'Gateway Timeout',
    description: '게이트웨이/프록시가 업스트림 서버 응답을 기다리다 시간이 초과되었습니다',
    detail: '502와 유사하지만, 이 경우 업스트림 서버가 응답하지 않아 타임아웃이 발생한 것입니다. 오래 걸리는 작업에서 자주 발생합니다.',
    useCases: ['느린 데이터베이스 쿼리', '외부 API 응답 지연', '대용량 데이터 처리', '복잡한 연산 작업'],
    causes: ['업스트림 서버의 느린 응답', 'Nginx proxy_read_timeout 초과', '복잡한 쿼리나 연산', '네트워크 지연'],
    fixes: ['쿼리 및 연산을 최적화하세요', 'Nginx: proxy_read_timeout 값을 늘리세요', '오래 걸리는 작업을 비동기(큐)로 처리하세요', '데이터베이스 인덱스를 최적화하세요'],
  },
]

// ── Color helpers ─────────────────────────────────────────────────────────

function getCategoryFromCode(code: number): Exclude<Category, 'all'> {
  if (code < 200) return '1xx'
  if (code < 300) return '2xx'
  if (code < 400) return '3xx'
  if (code < 500) return '4xx'
  return '5xx'
}

const CATEGORY_COLORS: Record<Exclude<Category, 'all'>, { badge: string; text: string; bg: string; border: string; tab: string; tabActive: string }> = {
  '1xx': {
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
    tab: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    tabActive: 'bg-blue-600 text-white border border-blue-600',
  },
  '2xx': {
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
    tab: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    tabActive: 'bg-green-600 text-white border border-green-600',
  },
  '3xx': {
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    border: 'border-yellow-200 dark:border-yellow-800',
    tab: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    tabActive: 'bg-yellow-500 text-white border border-yellow-500',
  },
  '4xx': {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-200 dark:border-orange-800',
    tab: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    tabActive: 'bg-orange-500 text-white border border-orange-500',
  },
  '5xx': {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
    tab: 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    tabActive: 'bg-red-600 text-white border border-red-600',
  },
}

function getColors(code: number) {
  const cat = getCategoryFromCode(code)
  return CATEGORY_COLORS[cat]
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HttpStatus() {
  const t = useTranslations('httpStatus')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [expandedCode, setExpandedCode] = useState<number | null>(null)
  const [copiedCode, setCopiedCode] = useState<number | null>(null)

  const copyToClipboard = useCallback(async (code: number, name: string) => {
    const text = `${code} ${name}`
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch {
      // silently fail
    }
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return STATUS_CODES.filter(s => {
      const matchesCategory =
        activeCategory === 'all' || getCategoryFromCode(s.code) === activeCategory
      if (!matchesCategory) return false
      if (!q) return true
      return (
        String(s.code).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.detail.toLowerCase().includes(q)
      )
    })
  }, [search, activeCategory])

  const CATEGORIES: { key: Category; label: string }[] = [
    { key: 'all', label: t('catAll') },
    { key: '1xx', label: t('cat1xx') },
    { key: '2xx', label: t('cat2xx') },
    { key: '3xx', label: t('cat3xx') },
    { key: '4xx', label: t('cat4xx') },
    { key: '5xx', label: t('cat5xx') },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.key
          if (cat.key === 'all') {
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 border border-gray-800 dark:border-gray-200'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            )
          }
          const colors = CATEGORY_COLORS[cat.key as Exclude<Category, 'all'>]
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? colors.tabActive : `${colors.tab} hover:opacity-80`
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Result count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('resultCount', { count: filtered.length })}
      </p>

      {/* Status code cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">{t('noResults')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(status => {
            const colors = getColors(status.code)
            const isExpanded = expandedCode === status.code
            const isCopied = copiedCode === status.code

            return (
              <div
                key={status.code}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Card header (always visible) */}
                <div className="flex items-start gap-4 p-4">
                  {/* Code badge */}
                  <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center ${colors.bg} ${colors.border} border`}>
                    <span className={`text-xl font-bold ${colors.text}`}>{status.code}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {getCategoryFromCode(status.code)}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {status.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                      {status.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyToClipboard(status.code, status.name)}
                      title={t('copyBtn')}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedCode(isExpanded ? null : status.code)}
                      title={isExpanded ? t('collapseBtn') : t('expandBtn')}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className={`border-t ${colors.border} ${colors.bg} px-4 py-4 space-y-4`}>
                    {/* Detail text */}
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {status.detail}
                    </p>

                    <div className="grid sm:grid-cols-3 gap-4">
                      {/* Use cases */}
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colors.text}`}>
                          {t('useCasesLabel')}
                        </h4>
                        <ul className="space-y-1">
                          {status.useCases.map((uc, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5">
                              <span className={`mt-0.5 flex-shrink-0 ${colors.text}`}>•</span>
                              {uc}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Causes */}
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colors.text}`}>
                          {t('causesLabel')}
                        </h4>
                        <ul className="space-y-1">
                          {status.causes.map((c, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5">
                              <span className={`mt-0.5 flex-shrink-0 ${colors.text}`}>•</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Fixes */}
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${colors.text}`}>
                          {t('fixesLabel')}
                        </h4>
                        <ul className="space-y-1">
                          {status.fixes.map((f, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5">
                              <span className={`mt-0.5 flex-shrink-0 ${colors.text}`}>•</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Guide section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          {t('guideTitle')}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1xx */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">1xx — 정보 응답</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              요청을 받았으며 작업을 계속 진행 중임을 알립니다. 주로 WebSocket 업그레이드(101)나 사전 확인(100)에 사용됩니다.
            </p>
          </div>
          {/* 2xx */}
          <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">2xx — 성공</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              요청이 성공적으로 처리되었습니다. GET 성공은 200, 리소스 생성은 201, 삭제 성공은 204를 사용하세요.
            </p>
          </div>
          {/* 3xx */}
          <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">3xx — 리다이렉트</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              요청 완료를 위해 추가 동작이 필요합니다. 영구 이동은 301, 임시 이동은 302, 캐시 검증은 304를 사용합니다.
            </p>
          </div>
          {/* 4xx */}
          <div className="bg-orange-50 dark:bg-orange-950 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">4xx — 클라이언트 오류</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              클라이언트 요청에 문제가 있습니다. 인증 없음(401), 권한 없음(403), 리소스 없음(404), 잘못된 요청(400)을 구분하세요.
            </p>
          </div>
          {/* 5xx */}
          <div className="bg-red-50 dark:bg-red-950 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">5xx — 서버 오류</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              서버가 요청을 처리하지 못했습니다. 서버 내부 오류(500), 게이트웨이 오류(502/504), 서비스 불가(503)를 빠르게 대응하세요.
            </p>
          </div>
          {/* Tips */}
          <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
            <h3 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">REST API 설계 팁</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              GET→200, POST→201, DELETE→204, 인증→401, 권한→403, 없음→404, 유효성→422, Rate Limit→429, 서버 오류→500을 정확히 구분하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
