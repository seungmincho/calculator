/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS build script, like the other scripts/*.cjs */
// public/llms.txt (https://llmstxt.org) — AI 검색·에이전트가 사이트 구조를 한 번에 파악하도록 메뉴(menuConfig)와
// ko 번역에서 만든다. generate-redirects-rss.js 끝에서 함께 실행된다. 단독 실행: node scripts/generate-llms-txt.cjs
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const { menuConfig, categoryKeys } = require('../src/config/menuConfig.ts')
const ko = JSON.parse(fs.readFileSync(path.join(root, 'messages/ko.json'), 'utf8'))
const get = (key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ko)
const SITE = 'https://toolhub.ai.kr'
const url = (href) => `${SITE}${href.endsWith('/') ? href : `${href}/`}`
const line = (i) => {
  const name = get(i.labelKey) || i.href
  const desc = get(i.descriptionKey)
  return `- [${name}](${url(i.href)})${desc ? `: ${desc}` : ''}`
}

// 연말·연초에 많이 찾는 한국 기준(법령·요율) 도구를 맨 앞에. 나머지는 카테고리 순서대로.
const FEATURED = ['/salary-calculator', '/four-insurance', '/changes-2027', '/minimum-wage', '/year-end-tax', '/salary-table',
  '/median-income', '/unemployment-benefit', '/age-table', '/holiday-planner', '/kimjang-timing', '/new-year-sunrise', '/ski-resorts']
const all = new Map(categoryKeys.flatMap(k => menuConfig[k].items).map(i => [i.href, i]))
const featured = FEATURED.map(h => all.get(h)).filter(Boolean)

const out = [
  '# 툴허브 (ToolHub)',
  '',
  '> 한국 생활·금융·개발·미디어·건강·게임 무료 웹 도구 모음입니다. 연봉 실수령액, 4대보험, 최저임금, 연말정산, 기준 중위소득처럼 한국 법령·요율이 필요한 계산기는 2026·2027년 공식 기준과 출처를 함께 보여 줍니다. Free Korean web tools (salary, social insurance, taxes, welfare, dev, media, health, games) with official 2026–2027 Korean rates and sources.',
  '',
  '- 모든 도구는 무료이고 로그인 없이 쓸 수 있으며, 대부분의 계산은 브라우저에서 합니다.',
  '- 각 도구 페이지에는 계산 기준·출처·FAQ가 본문과 JSON-LD(WebApplication·FAQPage)로 들어 있습니다.',
  '- 결과는 URL 쿼리로 재현됩니다(예: ' + `${SITE}/salary-calculator/?salary=50000000&type=annual` + '). 정적 HTML에는 기본값 결과가 들어 있고, 쿼리 값으로 다시 계산하는 일은 브라우저 JavaScript가 합니다.',
  '- 언어: 한국어(기본), 일부 영어 UI.',
  '',
  '## 계산 API (에이전트용, 읽기 전용 JSON)',
  '',
  '페이지와 같은 계산 코드로 쿼리 값의 정확한 결과를 JSON으로 돌려줍니다. 키 없이 쓸 수 있고, 응답에 해당 페이지 링크가 들어 있습니다. 명세: ' + `${SITE}/openapi.json`,
  '',
  `- [연봉 실수령액](${SITE}/api/calc/salary?annual=50000000): annual 또는 monthly, nonTaxable, dependents, children, year(2026·2027)`,
  `- [4대보험 근로자·회사 부담](${SITE}/api/calc/four-insurance?pay=3000000): pay 또는 annual, nonTaxable, size, accident(%), year`,
  `- [만 나이·띠·입학 연도](${SITE}/api/calc/age?birth=1990-05-01): birth 또는 year, on(기준일)`,
  `- [일출·일몰](${SITE}/api/calc/sun?date=2027-01-01&city=seoul): date, city 또는 lat·lon(한국)`,
  '',
  '## 주요 도구 (한국 2026·2027 기준)',
  '',
  ...featured.map(line),
  '',
]
for (const k of categoryKeys) {
  const cat = menuConfig[k]
  out.push(`## ${get(cat.titleKey) || k}`, '', ...cat.items.filter(i => !FEATURED.includes(i.href)).map(line), '')
}
out.push('## Optional', '',
  `- [사이트맵](${SITE}/sitemap.xml): 전체 페이지 목록`,
  `- [RSS](${SITE}/rss.xml): 새 도구·업데이트`,
  `- [소개](${SITE}/about/): 운영 원칙과 데이터 출처`, '')

const text = out.join('\n')
fs.writeFileSync(path.join(root, 'public/llms.txt'), text)
console.log(`llms.txt: ${all.size} tools, ${Buffer.byteLength(text)} bytes`)
