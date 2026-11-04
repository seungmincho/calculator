# 테마파크 방문 플래너 확장 — 2026-11-04

에버랜드에서 승인된 방문 날짜 추천을 **잠실 롯데월드**와 **경주월드**로 확장했다. 부산 롯데월드는 포함하지 않는다. 기본 추천은 날씨와 달력 기반 예상 혼잡도, 추천 이유, 대안 날짜, 상세 예보, 공유 URL·이미지다. 실측 입장객 예측이나 검증된 혼잡 모델이 아니며 화면에 한계를 명시한다.

## 공원별 기능

| 공원 | 경로 | 날씨 위치 | 지도 | 운영 데이터 |
|---|---|---|---|---|
| 에버랜드 | `/everland/` | 37.294,127.204 | 기존 39개 | 기존 대기시간·운영 상태 |
| 롯데월드 잠실 | `/lotte-world/` | 37.511,127.098 | 6개 구역, 42개 시설 | ThemeParks.wiki 운영 상태만. 숫자 대기시간 미제공 |
| 경주월드 | `/gyeongju-world/` | 35.837,129.281 | 26개 시설 | 연결 없음. 공식 안내 확인 |

각 경로의 `map/`, `date/YYYY-MM-DD/`, `sitemap.xml`을 제공한다. 지도 iframe인 `board/`는 noindex·동일 출처 전용이다. 세 공원 간 링크, 툴허브 메뉴·검색·RSS·사이트맵·OG를 연결했다.

롯데월드는 `area=indoor` 실내 위주 선택을 제공한다. 날씨 감점을 30%로 줄이고 날씨/달력 가중치를 아이 동반 50/50, 나머지 40/60으로 조정한다. 기온·비·바람 표시는 여전히 **실외 예보**다. 뇌우·많은 비·강풍 시 실내 점수에도 65점 상한과 이동 주의를 적용한다. 실제 시설의 운휴 기준이나 모든 매직아일랜드 시설의 실외 여부를 단정하지 않는다. 비가 오면 덜 붐빈다고 추정하지 않는다.

## 구현과 데이터 분리

- `src/lib/theme-parks/config.ts`가 공원 이름·위치·공식 출처·운영 제공처를 관리한다.
- `EverlandPlanner`를 공원 속성으로 공유한다. 세 개의 ko/en namespace는 별도로 등록한다.
- `handlePark`가 같은 React 본문을 Pages Functions에서 서버 렌더링한다. 추천 이유·발표 시각·계산 기준을 JavaScript 없이 읽을 수 있다. 공원별 canonical·JSON-LD·날짜별 사이트맵을 제공한다. AI 검색 인용은 보장하지 않는다.
- 기존 `everland_weather`를 유지하고 새 `park_forecasts(park,forecast)`에 공원별 예보를 격리한다. MET Norway 키 없는 Locationforecast, 식별 User-Agent, 성공 응답 1시간 캐시, 최대 24시간 신선도 규칙은 기존과 같다.
- 새 `park_snapshots`는 롯데월드 운영 상태를 10분마다 수집하며 원시 기록 7일 보관. 제공처 공원 ID는 `d8a17554-14d9-44a1-915a-035bfeff884c`다. 대기시간이 없는 시설에 0분을 만들지 않는다.
- Worker는 공원별 수집을 `Promise.allSettled`로 실행한다. 일부 실패 시 다른 공원의 성공 저장을 보존하고 실패를 기록한다. 공개 수집 트리거는 없다.
- `0003_theme_parks.sql`은 테이블 추가만 한다. 기존 Pages 설정·인증정보를 교체하지 않는다.

## 공식 지도 출처와 재생성

롯데월드: [공식 가이드맵 페이지](https://adventure.lotteworld.com/usage-guide/service/guide-map), [2026년 한국어 PDF](https://adventure.lotteworld.com/api/common/download-view-file/download?atchFileId=198ca3ce3949&seq=1). 공식 공개 목록 API의 `storeCd=HC01801, langCd=KO` 응답으로 확인했다. PDF 생성 2026-09-28, 게시 09-29. 1~4페이지의 지하 1층·1층·2~4층·매직아일랜드 지도에서 발췌했다.

경주월드: [공식 PDF](https://www.gjw.co.kr/images/contents/guidemap.pdf), 생성 2026-09-23. 두 번째 페이지 지도에서 발췌했다. Windows curl의 정상 인증서 검증으로 가져왔다.

`src/lib/theme-parks/maps.ts`의 위치는 PDF 시설 번호와 대조한 이미지 좌표다. GPS를 일러스트에 투영하지 않는다. 위치가 불명확한 제공처 시설은 추측해 넣지 않는다. 위치는 정확한 입구·길찾기 좌표가 아니며 현재 운행을 뜻하지 않는다. 원본 저작권은 각 공원에 있고 별도 상업적 재사용 허락은 확인되지 않았다. 화면에 출처·판본·발췌 사실을 표시한다.

재생성: `python scripts/extract-theme-park-maps.py <lotte.pdf> <gyeongju.pdf>` (pypdfium2/Pillow). PDF 판본이 바뀌면 crop과 시설 번호·좌표를 함께 재검증한다. 지도 확대·축소·구역 선택·이름/번호 검색·목록 선택을 제공한다. 작은 화면 전체 보기에서는 겹치는 표시를 줄이고 확대·검색하면 찾을 수 있다.

## 검증

- `scripts/check-theme-parks.ts`: 실내 점수·악천후 상한, 공원 캐시 분리·갱신 실패 보존, 운영 데이터 미제공·중복 수집, 좌표 경계, SSR·canonical·OG·sitemap.
- `scripts/verify-theme-parks.mjs [baseURL]`: 실제 Chromium에서 두 공원의 필터·URL 복원·날짜 페이지·공유 PNG·42/26개 표시·6/1개 구역·지도 검색·확대·390/320px·다크·사이트맵·만료 날짜를 확인한다.
- 기존 에버랜드 알고리즘/저장소/브라우저 회귀 검사를 유지한다. 로컬 증거는 `.wrangler/park-expansion/evidence/`.
- 배포는 D1 migration → Worker → Pages 미리보기 → 운영 순서. Windows Wrangler 3은 Node 22 사용. 자세한 기본 구조는 [에버랜드 플래너 문서](everland-planner.md).
