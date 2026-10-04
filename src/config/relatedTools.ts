// 도구별 "함께 쓰면 좋은 도구" (RelatedTools 첫 줄). 다음 단계 워크플로 기준으로 고른 menuConfig href.
// 4개 또는 6개만 — 그리드(2·3·4열)가 꽉 차게. 검증: node scripts/check-related-tools.ts
export const curatedRelated: Record<string, string[]> = {
  // 급여·근로
  '/salary-calculator': ['/salary-table', '/bonus-calculator', '/year-end-tax', '/salary-rank', '/salary-comparison', '/minimum-wage'],
  '/salary-table': ['/salary-calculator', '/salary-rank', '/salary-comparison', '/year-end-tax'],
  '/salary-rank': ['/salary-calculator', '/salary-table', '/salary-comparison', '/median-income'],
  '/bonus-calculator': ['/salary-calculator', '/year-end-tax', '/income-tax', '/salary-table', '/sales-commission', '/savings-calculator'],
  '/hourly-wage': ['/minimum-wage', '/weekly-holiday-pay', '/work-hours-calculator', '/salary-calculator', '/annual-leave', '/pay-slip'],
  '/minimum-wage': ['/hourly-wage', '/weekly-holiday-pay', '/work-hours-calculator', '/salary-calculator', '/employment-contract', '/pay-slip'],
  '/weekly-holiday-pay': ['/hourly-wage', '/minimum-wage', '/work-hours-calculator', '/pay-slip'],
  '/work-hours-calculator': ['/hourly-wage', '/weekly-holiday-pay', '/minimum-wage', '/annual-leave', '/pay-slip', '/salary-calculator'],
  '/annual-leave': ['/holiday-planner', '/retirement-calculator', '/work-hours-calculator', '/salary-calculator', '/dday-calculator', '/parental-leave'],
  '/holiday-planner': ['/annual-leave', '/dday-calculator', '/lunar-converter', '/exchange-calculator'],
  '/retirement-calculator': ['/unemployment-benefit', '/annual-leave', '/resignation-letter', '/national-pension', '/pension-calculator', '/income-tax'],
  '/unemployment-benefit': ['/retirement-calculator', '/resignation-letter', '/health-insurance', '/national-pension', '/government-subsidy', '/annual-leave'],
  '/sales-commission': ['/margin-calculator', '/vat-calculator', '/bonus-calculator', '/freelancer-tax', '/percent-calculator', '/salary-calculator'],

  // 세금
  '/year-end-tax': ['/card-deduction', '/medical-tax-credit', '/rent-tax-credit', '/pension-tax-credit', '/income-tax', '/salary-calculator'],
  '/card-deduction': ['/year-end-tax', '/medical-tax-credit', '/rent-tax-credit', '/pension-tax-credit', '/salary-calculator', '/installment-calculator'],
  '/medical-tax-credit': ['/year-end-tax', '/card-deduction', '/rent-tax-credit', '/pension-tax-credit', '/health-insurance', '/salary-calculator'],
  '/rent-tax-credit': ['/year-end-tax', '/youth-rent-subsidy', '/rent-converter', '/card-deduction', '/medical-tax-credit', '/pension-tax-credit'],
  '/pension-tax-credit': ['/year-end-tax', '/pension-calculator', '/national-pension', '/card-deduction', '/retirement-calculator', '/savings-calculator'],
  '/hometown-donation': ['/year-end-tax', '/card-deduction', '/pension-tax-credit', '/medical-tax-credit', '/rent-tax-credit', '/greeting-generator'],
  '/income-tax': ['/year-end-tax', '/salary-calculator', '/freelancer-tax', '/tax-season'],
  '/vat-calculator': ['/freelancer-tax', '/margin-calculator', '/invoice-generator', '/receipt-generator', '/business-number', '/tax-season'],
  '/freelancer-tax': ['/vat-calculator', '/tax-season', '/income-tax', '/health-insurance', '/invoice-generator', '/national-pension'],
  '/customs-duty': ['/exchange-calculator', '/shipping-calculator', '/vat-calculator', '/discount-calculator'],

  // 대출·부동산
  '/bogeumjari-loan': ['/dsr-calculator', '/acquisition-tax', '/brokerage-fee', '/loan-schedule', '/jeonse-loan', '/housing-subscription'],
  '/loan-calculator': ['/loan-schedule', '/dsr-calculator', '/bogeumjari-loan', '/car-loan-calculator', '/jeonse-loan', '/savings-calculator'],
  '/loan-schedule': ['/loan-calculator', '/dsr-calculator', '/bogeumjari-loan', '/installment-calculator'],
  '/dsr-calculator': ['/loan-calculator', '/bogeumjari-loan', '/jeonse-loan', '/loan-schedule', '/salary-calculator', '/car-loan-calculator'],
  '/jeonse-loan': ['/jeonse-checklist', '/rent-converter', '/brokerage-fee', '/dsr-calculator', '/lease-contract', '/youth-rent-subsidy'],
  '/acquisition-tax': ['/brokerage-fee', '/bogeumjari-loan', '/pyeong-calculator', '/comprehensive-property-tax', '/capital-gains-tax', '/moving-cost'],
  '/brokerage-fee': ['/acquisition-tax', '/rent-converter', '/jeonse-checklist', '/moving-cost', '/lease-contract', '/pyeong-calculator'],
  '/pyeong-calculator': ['/acquisition-tax', '/brokerage-fee', '/interior-calculator', '/rent-converter', '/real-estate-calculator', '/unit-converter'],

  // 생활비·교통
  '/fuel-calculator': ['/taxi-fare', '/parking-fee', '/car-maintenance', '/annual-car-tax', '/ev-subsidy', '/car-tax-calculator'],
  '/taxi-fare': ['/fuel-calculator', '/parking-fee', '/dutch-pay', '/budget-calculator'],
  '/parking-fee': ['/fuel-calculator', '/taxi-fare', '/car-maintenance', '/annual-car-tax'],
  '/shipping-calculator': ['/customs-duty', '/exchange-calculator', '/unit-converter', '/discount-calculator'],
  '/installment-calculator': ['/loan-calculator', '/discount-calculator', '/budget-calculator', '/percent-calculator'],
  '/electricity-calculator': ['/pc-electricity', '/gas-bill', '/water-bill', '/budget-calculator'],
  '/pc-electricity': ['/electricity-calculator', '/gas-bill', '/water-bill', '/budget-calculator'],
  '/gas-bill': ['/electricity-calculator', '/water-bill', '/pc-electricity', '/budget-calculator'],
  '/water-bill': ['/electricity-calculator', '/gas-bill', '/pc-electricity', '/budget-calculator'],
  '/kimjang-calculator': ['/budget-calculator', '/dutch-pay', '/discount-calculator', '/unit-converter'],
  '/exchange-calculator': ['/customs-duty', '/shipping-calculator', '/world-clock', '/stock-calculator', '/percent-calculator', '/holiday-planner'],

  // 학업·수능
  '/gpa-calculator': ['/gpa-converter', '/grade-calculator', '/average-calculator', '/csat-grade'],
  '/gpa-converter': ['/gpa-calculator', '/grade-calculator', '/average-calculator', '/percent-calculator'],
  '/grade-calculator': ['/gpa-calculator', '/gpa-converter', '/average-calculator', '/csat-grade'],
  '/csat-grade': ['/csat-dday', '/grade-calculator', '/average-calculator', '/gpa-converter'],
  '/csat-dday': ['/csat-grade', '/dday-calculator', '/timer', '/pomodoro'],

  // 건강
  '/health-checkup': ['/bmi-calculator', '/blood-pressure', '/blood-sugar', '/body-fat-calculator', '/calorie-calculator', '/age-calculator'],

  // 문서·텍스트·변환
  '/number-to-korean': ['/iou-generator', '/receipt-generator', '/invoice-generator', '/lease-contract', '/stamp-generator', '/roman-numeral'],
  '/stamp-generator': ['/signature-generator', '/iou-generator', '/receipt-generator', '/employment-contract', '/lease-contract', '/power-of-attorney'],
  '/keyboard-converter': ['/korean-syllable', '/character-counter', '/text-converter', '/typing-test', '/number-to-korean', '/fancy-text'],
  '/fancy-text': ['/emoji-picker', '/text-converter', '/character-counter', '/font-preview', '/keyboard-converter', '/greeting-generator'],
  '/greeting-generator': ['/fancy-text', '/emoji-picker', '/holiday-planner', '/lunar-converter'],
  '/text-to-speech': ['/voice-memo', '/image-ocr', '/character-counter', '/presentation-timer'],
  '/resident-number': ['/business-number', '/age-calculator', '/lunar-converter', '/password-generator'],
  '/lunar-converter': ['/age-calculator', '/dday-calculator', '/holiday-planner', '/greeting-generator'],
  '/dday-calculator': ['/age-calculator', '/holiday-planner', '/lunar-converter', '/csat-dday', '/military-discharge', '/due-date'],
  '/aspect-ratio': ['/image-resizer', '/screen-info', '/screen-compare', '/css-unit-converter', '/monitor-test', '/image-converter'],
  '/presentation-timer': ['/timer', '/pomodoro', '/meeting-minutes', '/order-picker', '/character-counter', '/text-to-speech'],
  '/noise-meter': ['/white-noise', '/sleep-calculator', '/voice-memo', '/spirit-level'],

  // 결정 도구
  '/random-picker': ['/order-picker', '/team-divider', '/roulette', '/lottery-draw', '/ladder-game', '/dice-roller'],
  '/order-picker': ['/ladder-game', '/random-picker', '/team-divider', '/roulette', '/lottery-draw', '/presentation-timer'],
  '/ladder-game': ['/order-picker', '/team-divider', '/roulette', '/penalty-roulette', '/lottery-draw', '/dutch-pay'],
  '/menu-picker': ['/menu-roulette', '/dutch-pay', '/roulette', '/ladder-game', '/calorie-calculator', '/coin-flip'],
  '/menu-roulette': ['/menu-picker', '/dutch-pay', '/roulette', '/ladder-game', '/penalty-roulette', '/calorie-calculator'],

  // 게임 — 오늘의 퍼즐끼리, 보드게임끼리
  '/korean-wordle': ['/crossword', '/hangman', '/number-baseball', '/picross', '/minesweeper', '/typing-test'],
  '/crossword': ['/korean-wordle', '/hangman', '/number-baseball', '/picross', '/minesweeper', '/typing-test'],
  '/hangman': ['/korean-wordle', '/crossword', '/number-baseball', '/picross', '/minesweeper', '/typing-test'],
  '/number-baseball': ['/korean-wordle', '/hangman', '/crossword', '/picross'],
  '/picross': ['/minesweeper', '/sudoku', '/crossword', '/korean-wordle'],
  '/minesweeper': ['/picross', '/sudoku', '/crossword', '/korean-wordle'],
  '/omok': ['/othello', '/connect4', '/chess', '/checkers', '/mancala', '/battleship'],
}
