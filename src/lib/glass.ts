/**
 * Legacy design-token aliases (238 files import these).
 * 실제 스타일은 src/app/globals.css 의 `.ui-card` / `.ui-field` 컴포넌트 클래스와
 * 시맨틱 토큰(--surface, --fg ...)에 있음. 디자인 변경은 globals.css에서.
 *
 * 새 코드는 className="ui-card p-6" 처럼 직접 쓸 것.
 */

/** Card surface */
export const glassCard = 'ui-card'

/** (deprecated) 예전 inset 하이라이트 — 이제 빈 값 */
export const glassInset = ''

/** Input field */
export const glassInput = 'ui-field'
