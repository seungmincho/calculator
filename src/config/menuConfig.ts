// 공통 메뉴 설정 파일
// Header, Footer, ToolsShowcase에서 동일한 메뉴 구조를 사용합니다.

// 게임 플레이 모드 타입 (games 카테고리 전용)
export type GameMode = 'ai' | 'online' | 'solo'

export interface MenuItem {
  href: string;
  labelKey: string; // 번역 키 (footer.links.xxx)
  descriptionKey: string; // 설명 번역 키 (toolsShowcase.tools.xxx.description)
  icon: string;
  modes?: GameMode[]; // 게임 지원 모드 (games 카테고리만 사용)
}

export interface MenuCategory {
  titleKey: string; // 번역 키
  items: MenuItem[];
}

export interface MenuConfig {
  calculators: MenuCategory;
  tools: MenuCategory;
  media: MenuCategory;
  health: MenuCategory;
  games: MenuCategory;
}

export const menuConfig: MenuConfig = {
  calculators: {
    titleKey: 'navigation.financialCalculators',
    items: [
      { href: '/salary-calculator', labelKey: 'footer.links.salaryCalculator', descriptionKey: 'toolsShowcase.tools.salary.description', icon: '💰' },
      { href: '/loan-calculator', labelKey: 'footer.links.loanCalculator', descriptionKey: 'toolsShowcase.tools.loan.description', icon: '🏦' },
      { href: '/savings-calculator', labelKey: 'footer.links.savingsCalculator', descriptionKey: 'toolsShowcase.tools.savings.description', icon: '📈' },
      { href: '/stock-calculator', labelKey: 'footer.links.stockCalculator', descriptionKey: 'toolsShowcase.tools.stock.description', icon: '📊' },
      { href: '/retirement-calculator', labelKey: 'footer.links.retirementCalculator', descriptionKey: 'toolsShowcase.tools.retirement.description', icon: '👴' },
      { href: '/tax-calculator', labelKey: 'footer.links.taxCalculator', descriptionKey: 'toolsShowcase.tools.tax.description', icon: '📋' },
      { href: '/exchange-calculator', labelKey: 'footer.links.exchangeCalculator', descriptionKey: 'toolsShowcase.tools.exchange.description', icon: '💱' },
      { href: '/real-estate-calculator', labelKey: 'footer.links.realEstateCalculator', descriptionKey: 'toolsShowcase.tools.realEstate.description', icon: '🏠' },
      { href: '/monthly-rent-subsidy', labelKey: 'footer.links.monthlyRentSubsidy', descriptionKey: 'toolsShowcase.tools.monthlyRentSubsidy.description', icon: '🏘️' },
      { href: '/bogeumjari-loan', labelKey: 'footer.links.bogeumjariLoan', descriptionKey: 'toolsShowcase.tools.bogeumjariLoan.description', icon: '🏡' },
      { href: '/car-loan-calculator', labelKey: 'footer.links.carLoanCalculator', descriptionKey: 'toolsShowcase.tools.carLoan.description', icon: '🚗' },
      { href: '/car-tax-calculator', labelKey: 'footer.links.carTaxCalculator', descriptionKey: 'toolsShowcase.tools.carTax.description', icon: '🚘' },
      { href: '/fuel-calculator', labelKey: 'footer.links.fuelCalculator', descriptionKey: 'toolsShowcase.tools.fuel.description', icon: '⛽' },
      { href: '/median-income', labelKey: 'footer.links.medianIncome', descriptionKey: 'toolsShowcase.tools.medianIncome.description', icon: '📉' },
      { href: '/percent-calculator', labelKey: 'footer.links.percentCalculator', descriptionKey: 'toolsShowcase.tools.percentCalculator.description', icon: '🔢' },
      { href: '/age-calculator', labelKey: 'footer.links.ageCalculator', descriptionKey: 'toolsShowcase.tools.ageCalculator.description', icon: '🎂' },
      { href: '/gpa-calculator', labelKey: 'footer.links.gpaCalculator', descriptionKey: 'toolsShowcase.tools.gpaCalculator.description', icon: '🎓' },
      { href: '/compound-calculator', labelKey: 'footer.links.compoundCalculator', descriptionKey: 'toolsShowcase.tools.compoundCalculator.description', icon: '💹' },
      { href: '/electricity-calculator', labelKey: 'footer.links.electricityCalculator', descriptionKey: 'toolsShowcase.tools.electricityCalculator.description', icon: '⚡' },
      { href: '/discount-calculator', labelKey: 'footer.links.discountCalculator', descriptionKey: 'toolsShowcase.tools.discountCalculator.description', icon: '🏷️' },
      { href: '/pyeong-calculator', labelKey: 'footer.links.pyeongCalculator', descriptionKey: 'toolsShowcase.tools.pyeongCalculator.description', icon: '📏' },
      { href: '/vat-calculator', labelKey: 'footer.links.vatCalculator', descriptionKey: 'toolsShowcase.tools.vatCalculator.description', icon: '🧾' },
      { href: '/rent-converter', labelKey: 'footer.links.rentConverter', descriptionKey: 'toolsShowcase.tools.rentConverter.description', icon: '🏠' },
      { href: '/water-bill', labelKey: 'footer.links.waterBill', descriptionKey: 'toolsShowcase.tools.waterBill.description', icon: '💧' },
      { href: '/hourly-wage', labelKey: 'footer.links.hourlyWage', descriptionKey: 'toolsShowcase.tools.hourlyWage.description', icon: '💵' },
      { href: '/severance-pay', labelKey: 'footer.links.severancePay', descriptionKey: 'toolsShowcase.tools.severancePay.description', icon: '💼' },
      { href: '/annual-leave', labelKey: 'footer.links.annualLeave', descriptionKey: 'toolsShowcase.tools.annualLeave.description', icon: '🏖️' },
      { href: '/gas-bill', labelKey: 'footer.links.gasBill', descriptionKey: 'toolsShowcase.tools.gasBill.description', icon: '🔥' },
      { href: '/taxi-fare', labelKey: 'footer.links.taxiFare', descriptionKey: 'toolsShowcase.tools.taxiFare.description', icon: '🚕' },
      { href: '/installment-calculator', labelKey: 'footer.links.installmentCalc', descriptionKey: 'toolsShowcase.tools.installmentCalc.description', icon: '💳' },
      { href: '/shipping-calculator', labelKey: 'footer.links.shippingCalc', descriptionKey: 'toolsShowcase.tools.shippingCalc.description', icon: '📦' },
      { href: '/parking-fee', labelKey: 'footer.links.parkingFee', descriptionKey: 'toolsShowcase.tools.parkingFee.description', icon: '🅿️' },
      { href: '/dutch-pay', labelKey: 'footer.links.dutchPay', descriptionKey: 'toolsShowcase.tools.dutchPay.description', icon: '🍽️' },
      { href: '/budget-calculator', labelKey: 'footer.links.budgetCalculator', descriptionKey: 'toolsShowcase.tools.budgetCalculator.description', icon: '💸' },
      { href: '/loan-schedule', labelKey: 'footer.links.loanSchedule', descriptionKey: 'toolsShowcase.tools.loanSchedule.description', icon: '📊' },
      { href: '/moving-cost', labelKey: 'footer.links.movingCost', descriptionKey: 'toolsShowcase.tools.movingCost.description', icon: '🚛' },
      { href: '/car-maintenance', labelKey: 'footer.links.carMaintenance', descriptionKey: 'toolsShowcase.tools.carMaintenance.description', icon: '🔧' },
    ],
  },
  tools: {
    titleKey: 'navigation.developmentTools',
    items: [
      { href: '/regex-extractor', labelKey: 'footer.links.regexExtractor', descriptionKey: 'toolsShowcase.tools.regex.description', icon: '🔍' },
      { href: '/time-converter', labelKey: 'footer.links.timeConverter', descriptionKey: 'toolsShowcase.tools.time.description', icon: '🕰️' },
      { href: '/json-formatter', labelKey: 'footer.links.jsonFormatter', descriptionKey: 'toolsShowcase.tools.json.description', icon: '📝' },
      { href: '/json-xml-converter', labelKey: 'footer.links.jsonXmlConverter', descriptionKey: 'toolsShowcase.tools.jsonXml.description', icon: '🔄' },
      { href: '/json-csv-converter', labelKey: 'footer.links.jsonCsvConverter', descriptionKey: 'toolsShowcase.tools.jsonCsv.description', icon: '🔄' },
      { href: '/jwt-decoder', labelKey: 'footer.links.jwtDecoder', descriptionKey: 'toolsShowcase.tools.jwt.description', icon: '🔐' },
      { href: '/uuid-generator', labelKey: 'footer.links.uuidGenerator', descriptionKey: 'toolsShowcase.tools.uuid.description', icon: '🆔' },
      { href: '/cron-tester', labelKey: 'footer.links.cronTester', descriptionKey: 'toolsShowcase.tools.cron.description', icon: '⏰' },
      { href: '/qr-generator', labelKey: 'footer.links.qrGenerator', descriptionKey: 'toolsShowcase.tools.qr.description', icon: '📱' },
      { href: '/barcode-generator', labelKey: 'footer.links.barcodeGenerator', descriptionKey: 'toolsShowcase.tools.barcode.description', icon: '📊' },
      { href: '/sql-formatter', labelKey: 'footer.links.sqlFormatter', descriptionKey: 'toolsShowcase.tools.sql.description', icon: '🗄️' },
      { href: '/markdown-viewer', labelKey: 'footer.links.markdownViewer', descriptionKey: 'toolsShowcase.tools.markdown.description', icon: '📖' },
      { href: '/3d-viewer', labelKey: 'footer.links.3dConverter', descriptionKey: 'toolsShowcase.tools.3dConverter.description', icon: '🎮' },
      { href: '/character-counter', labelKey: 'footer.links.characterCounter', descriptionKey: 'toolsShowcase.tools.characterCounter.description', icon: '🔤' },
      { href: '/base64-converter', labelKey: 'footer.links.base64Converter', descriptionKey: 'toolsShowcase.tools.base64.description', icon: '🔐' },
      { href: '/url-encoder', labelKey: 'footer.links.urlEncoder', descriptionKey: 'toolsShowcase.tools.urlEncoder.description', icon: '🔗' },
      { href: '/hash-generator', labelKey: 'footer.links.hashGenerator', descriptionKey: 'toolsShowcase.tools.hashGenerator.description', icon: '#️⃣' },
      { href: '/diff-viewer', labelKey: 'footer.links.diffViewer', descriptionKey: 'toolsShowcase.tools.diffViewer.description', icon: '📋' },
      { href: '/color-converter', labelKey: 'footer.links.colorConverter', descriptionKey: 'toolsShowcase.tools.colorConverter.description', icon: '🎨' },
      { href: '/lorem-ipsum', labelKey: 'footer.links.loremIpsum', descriptionKey: 'toolsShowcase.tools.loremIpsum.description', icon: '📝' },
      { href: '/unit-converter', labelKey: 'footer.links.unitConverter', descriptionKey: 'toolsShowcase.tools.unitConverter.description', icon: '📐' },
      { href: '/text-converter', labelKey: 'footer.links.textConverter', descriptionKey: 'toolsShowcase.tools.textConverter.description', icon: '🔄' },
      { href: '/password-generator', labelKey: 'footer.links.passwordGenerator', descriptionKey: 'toolsShowcase.tools.passwordGenerator.description', icon: '🔑' },
      { href: '/dday-calculator', labelKey: 'footer.links.ddayCalculator', descriptionKey: 'toolsShowcase.tools.ddayCalculator.description', icon: '📅' },
      { href: '/random-picker', labelKey: 'footer.links.randomPicker', descriptionKey: 'toolsShowcase.tools.randomPicker.description', icon: '🎲' },
      { href: '/timer', labelKey: 'footer.links.timer', descriptionKey: 'toolsShowcase.tools.timer.description', icon: '⏱️' },
      { href: '/base-converter', labelKey: 'footer.links.baseConverter', descriptionKey: 'toolsShowcase.tools.baseConverter.description', icon: '🔢' },
      { href: '/notepad', labelKey: 'footer.links.notepad', descriptionKey: 'toolsShowcase.tools.notepad.description', icon: '📒' },
      { href: '/screen-info', labelKey: 'footer.links.screenInfo', descriptionKey: 'toolsShowcase.tools.screenInfo.description', icon: '🖥️' },
      { href: '/emoji-picker', labelKey: 'footer.links.emojiPicker', descriptionKey: 'toolsShowcase.tools.emojiPicker.description', icon: '😀' },
      { href: '/lunar-converter', labelKey: 'footer.links.lunarConverter', descriptionKey: 'toolsShowcase.tools.lunarConverter.description', icon: '🌙' },
      { href: '/ip-checker', labelKey: 'footer.links.ipChecker', descriptionKey: 'toolsShowcase.tools.ipChecker.description', icon: '🌐' },
      { href: '/typing-test', labelKey: 'footer.links.typingTest', descriptionKey: 'toolsShowcase.tools.typingTest.description', icon: '⌨️' },
      { href: '/number-to-korean', labelKey: 'footer.links.numberToKorean', descriptionKey: 'toolsShowcase.tools.numberToKorean.description', icon: '🔢' },
      { href: '/qr-scanner', labelKey: 'footer.links.qrScanner', descriptionKey: 'toolsShowcase.tools.qrScanner.description', icon: '📷' },
      { href: '/font-preview', labelKey: 'footer.links.fontPreview', descriptionKey: 'toolsShowcase.tools.fontPreview.description', icon: '🔤' },
      { href: '/world-clock', labelKey: 'footer.links.worldClock', descriptionKey: 'toolsShowcase.tools.worldClock.description', icon: '🕐' },
      { href: '/css-gradient', labelKey: 'footer.links.cssGradient', descriptionKey: 'toolsShowcase.tools.cssGradient.description', icon: '🌈' },
      { href: '/korean-syllable', labelKey: 'footer.links.koreanSyllable', descriptionKey: 'toolsShowcase.tools.koreanSyllable.description', icon: '🇰🇷' },
      { href: '/roman-numeral', labelKey: 'footer.links.romanNumeral', descriptionKey: 'toolsShowcase.tools.romanNumeral.description', icon: '🏛️' },
      { href: '/business-number', labelKey: 'footer.links.businessNumber', descriptionKey: 'toolsShowcase.tools.businessNumber.description', icon: '🏢' },
      { href: '/color-palette', labelKey: 'footer.links.colorPalette', descriptionKey: 'toolsShowcase.tools.colorPalette.description', icon: '🎨' },
      { href: '/aspect-ratio', labelKey: 'footer.links.aspectRatio', descriptionKey: 'toolsShowcase.tools.aspectRatio.description', icon: '📐' },
      { href: '/text-to-speech', labelKey: 'footer.links.textToSpeech', descriptionKey: 'toolsShowcase.tools.textToSpeech.description', icon: '🔊' },
      { href: '/morse-code', labelKey: 'footer.links.morseCode', descriptionKey: 'toolsShowcase.tools.morseCode.description', icon: '📡' },
      { href: '/resident-number', labelKey: 'footer.links.residentNumber', descriptionKey: 'toolsShowcase.tools.residentNumber.description', icon: '🪪' },
      { href: '/monitor-test', labelKey: 'footer.links.monitorTest', descriptionKey: 'toolsShowcase.tools.monitorTest.description', icon: '🖥️' },
      { href: '/keyboard-converter', labelKey: 'footer.links.keyboardConverter', descriptionKey: 'toolsShowcase.tools.keyboardConverter.description', icon: '⌨️' },
      { href: '/contrast-checker', labelKey: 'footer.links.contrastChecker', descriptionKey: 'toolsShowcase.tools.contrastChecker.description', icon: '🔲' },
      { href: '/box-shadow', labelKey: 'footer.links.boxShadow', descriptionKey: 'toolsShowcase.tools.boxShadow.description', icon: '🔳' },
      { href: '/code-screenshot', labelKey: 'footer.links.codeScreenshot', descriptionKey: 'toolsShowcase.tools.codeScreenshot.description', icon: '📸' },
      { href: '/flexbox-grid', labelKey: 'footer.links.flexboxGrid', descriptionKey: 'toolsShowcase.tools.flexboxGrid.description', icon: '📐' },
      { href: '/svg-editor', labelKey: 'footer.links.svgEditor', descriptionKey: 'toolsShowcase.tools.svgEditor.description', icon: '🎨' },
      { href: '/api-tester', labelKey: 'footer.links.apiTester', descriptionKey: 'toolsShowcase.tools.apiTester.description', icon: '🔌' },
      { href: '/favicon-generator', labelKey: 'footer.links.faviconGenerator', descriptionKey: 'toolsShowcase.tools.faviconGenerator.description', icon: '🌐' },
    ],
  },
  media: {
    titleKey: 'navigation.mediaTools',
    items: [
      { href: '/image-resizer', labelKey: 'footer.links.imageResizer', descriptionKey: 'toolsShowcase.tools.imageResize.description', icon: '🖼️' },
      { href: '/image-editor', labelKey: 'footer.links.imageEditor', descriptionKey: 'toolsShowcase.tools.imageEdit.description', icon: '🎨' },
      { href: '/image-converter', labelKey: 'footer.links.imageConverter', descriptionKey: 'toolsShowcase.tools.imageConverter.description', icon: '🖼️' },
      { href: '/color-extractor', labelKey: 'footer.links.colorExtractor', descriptionKey: 'toolsShowcase.tools.colorExtractor.description', icon: '🎨' },
      { href: '/image-mosaic', labelKey: 'footer.links.imageMosaic', descriptionKey: 'toolsShowcase.tools.imageMosaic.description', icon: '🔲' },
      { href: '/image-watermark', labelKey: 'footer.links.imageWatermark', descriptionKey: 'toolsShowcase.tools.imageWatermark.description', icon: '💧' },
      { href: '/image-ocr', labelKey: 'footer.links.imageOcr', descriptionKey: 'toolsShowcase.tools.imageOcr.description', icon: '📝' },
      { href: '/signature-generator', labelKey: 'footer.links.signatureGenerator', descriptionKey: 'toolsShowcase.tools.signatureGenerator.description', icon: '✍️' },
      { href: '/pdf-tools', labelKey: 'footer.links.pdfTools', descriptionKey: 'toolsShowcase.tools.pdfTools.description', icon: '📄' },
    ],
  },
  health: {
    titleKey: 'navigation.healthTools',
    items: [
      { href: '/bmi-calculator', labelKey: 'footer.links.bmiCalculator', descriptionKey: 'toolsShowcase.tools.bmi.description', icon: '❤️' },
      { href: '/calorie-calculator', labelKey: 'footer.links.calorieCalculator', descriptionKey: 'toolsShowcase.tools.calorie.description', icon: '🍎' },
      { href: '/body-fat-calculator', labelKey: 'footer.links.bodyFatCalculator', descriptionKey: 'toolsShowcase.tools.bodyFat.description', icon: '💪' },
      { href: '/work-hours-calculator', labelKey: 'footer.links.workHoursCalculator', descriptionKey: 'toolsShowcase.tools.workHours.description', icon: '⏰' },
      { href: '/alcohol-calculator', labelKey: 'footer.links.alcoholCalculator', descriptionKey: 'toolsShowcase.tools.alcoholCalculator.description', icon: '🍺' },
      { href: '/due-date', labelKey: 'footer.links.dueDateCalculator', descriptionKey: 'toolsShowcase.tools.dueDateCalculator.description', icon: '🤰' },
      { href: '/blood-pressure', labelKey: 'footer.links.bloodPressure', descriptionKey: 'toolsShowcase.tools.bloodPressure.description', icon: '🩺' },
    ],
  },
  games: {
    titleKey: 'navigation.simpleGames',
    items: [
      { href: '/games', labelKey: 'footer.links.gameHub', descriptionKey: 'toolsShowcase.tools.gameHub.description', icon: '🎮' },
      { href: '/omok', labelKey: 'footer.links.omok', descriptionKey: 'toolsShowcase.tools.omok.description', icon: '⚫', modes: ['ai', 'online'] },
      { href: '/othello', labelKey: 'footer.links.othello', descriptionKey: 'toolsShowcase.tools.othello.description', icon: '🟢', modes: ['ai', 'online'] },
      { href: '/connect4', labelKey: 'footer.links.connect4', descriptionKey: 'toolsShowcase.tools.connect4.description', icon: '🔴', modes: ['ai', 'online'] },
      { href: '/checkers', labelKey: 'footer.links.checkers', descriptionKey: 'toolsShowcase.tools.checkers.description', icon: '🏁', modes: ['ai', 'online'] },
      { href: '/mancala', labelKey: 'footer.links.mancala', descriptionKey: 'toolsShowcase.tools.mancala.description', icon: '🥜', modes: ['ai', 'online'] },
      { href: '/battleship', labelKey: 'footer.links.battleship', descriptionKey: 'toolsShowcase.tools.battleship.description', icon: '🚢', modes: ['ai', 'online'] },
      { href: '/dots-and-boxes', labelKey: 'footer.links.dotsAndBoxes', descriptionKey: 'toolsShowcase.tools.dotsAndBoxes.description', icon: '📦', modes: ['ai', 'online'] },
      { href: '/snake-game', labelKey: 'footer.links.snakeGame', descriptionKey: 'toolsShowcase.tools.snakeGame.description', icon: '🐍', modes: ['solo'] },
      { href: '/2048', labelKey: 'footer.links.game2048', descriptionKey: 'toolsShowcase.tools.game2048.description', icon: '🔢', modes: ['solo'] },
      { href: '/memory-game', labelKey: 'footer.links.memoryGame', descriptionKey: 'toolsShowcase.tools.memoryGame.description', icon: '🃏', modes: ['solo'] },
      { href: '/reaction-test', labelKey: 'footer.links.reactionTest', descriptionKey: 'toolsShowcase.tools.reactionTest.description', icon: '⚡', modes: ['solo'] },
      { href: '/color-blind-test', labelKey: 'footer.links.colorBlindTest', descriptionKey: 'toolsShowcase.tools.colorBlindTest.description', icon: '👁️', modes: ['solo'] },
      { href: '/lotto-generator', labelKey: 'footer.links.lottoGenerator', descriptionKey: 'toolsShowcase.tools.lotto.description', icon: '🎲', modes: ['solo'] },
      { href: '/ladder-game', labelKey: 'footer.links.ladderGame', descriptionKey: 'toolsShowcase.tools.ladder.description', icon: '🪜', modes: ['solo'] },
      { href: '/minesweeper', labelKey: 'footer.links.minesweeper', descriptionKey: 'toolsShowcase.tools.minesweeper.description', icon: '💣', modes: ['solo'] },
      { href: '/sudoku', labelKey: 'footer.links.sudoku', descriptionKey: 'toolsShowcase.tools.sudoku.description', icon: '9️⃣', modes: ['solo'] },
      { href: '/tetris', labelKey: 'footer.links.tetris', descriptionKey: 'toolsShowcase.tools.tetris.description', icon: '🧱', modes: ['solo'] },
      { href: '/number-baseball', labelKey: 'footer.links.numberBaseball', descriptionKey: 'toolsShowcase.tools.numberBaseball.description', icon: '⚾', modes: ['solo'] },
      { href: '/korean-wordle', labelKey: 'footer.links.koreanWordle', descriptionKey: 'toolsShowcase.tools.koreanWordle.description', icon: '🟩', modes: ['solo'] },
    ],
  },
};

// 카테고리 키 목록
export const categoryKeys = ['calculators', 'tools', 'media', 'health', 'games'] as const;
export type CategoryKey = typeof categoryKeys[number];
