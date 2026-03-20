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
  isNew?: boolean; // 하위호환용 (addedDate 우선)
  addedDate?: string; // 'YYYY-MM-DD' 형식, 30일 이내면 NEW 표시
  subcategory?: string; // 서브카테고리 번역 키
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

/** addedDate 기준 30일 이내면 NEW, addedDate 없으면 isNew 필드 사용 */
export function isNewTool(item: MenuItem): boolean {
  if (item.addedDate) {
    const added = new Date(item.addedDate)
    const now = new Date()
    const diffDays = (now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays <= 30
  }
  return false // addedDate 없으면 NEW 아님
}

export const menuConfig: MenuConfig = {
  calculators: {
    titleKey: 'navigation.financialCalculators',
    items: [
      { href: '/salary-calculator', labelKey: 'footer.links.salaryCalculator', descriptionKey: 'toolsShowcase.tools.salary.description', icon: '💰', subcategory: 'subcategory.salaryWork' },
      { href: '/salary-comparison', labelKey: 'footer.links.salaryComparison', descriptionKey: 'toolsShowcase.tools.salaryComparison.description', icon: '⚖️', subcategory: 'subcategory.salaryWork' },
      { href: '/loan-calculator', labelKey: 'footer.links.loanCalculator', descriptionKey: 'toolsShowcase.tools.loan.description', icon: '🏦', subcategory: 'subcategory.loanFinance' },
      { href: '/savings-calculator', labelKey: 'footer.links.savingsCalculator', descriptionKey: 'toolsShowcase.tools.savings.description', icon: '📈', subcategory: 'subcategory.investSavings' },
      { href: '/stock-calculator', labelKey: 'footer.links.stockCalculator', descriptionKey: 'toolsShowcase.tools.stock.description', icon: '📊', subcategory: 'subcategory.investSavings' },
      { href: '/retirement-calculator', labelKey: 'footer.links.retirementCalculator', descriptionKey: 'toolsShowcase.tools.retirement.description', icon: '👴', subcategory: 'subcategory.investSavings' },
      { href: '/tax-calculator', labelKey: 'footer.links.taxCalculator', descriptionKey: 'toolsShowcase.tools.tax.description', icon: '📋', subcategory: 'subcategory.tax' },
      { href: '/exchange-calculator', labelKey: 'footer.links.exchangeCalculator', descriptionKey: 'toolsShowcase.tools.exchange.description', icon: '💱', subcategory: 'subcategory.others' },
      { href: '/real-estate-calculator', labelKey: 'footer.links.realEstateCalculator', descriptionKey: 'toolsShowcase.tools.realEstate.description', icon: '🏠', subcategory: 'subcategory.realEstate' },
      { href: '/monthly-rent-subsidy', labelKey: 'footer.links.monthlyRentSubsidy', descriptionKey: 'toolsShowcase.tools.monthlyRentSubsidy.description', icon: '🏘️', subcategory: 'subcategory.realEstate' },
      { href: '/bogeumjari-loan', labelKey: 'footer.links.bogeumjariLoan', descriptionKey: 'toolsShowcase.tools.bogeumjariLoan.description', icon: '🏡', subcategory: 'subcategory.loanFinance' },
      { href: '/car-loan-calculator', labelKey: 'footer.links.carLoanCalculator', descriptionKey: 'toolsShowcase.tools.carLoan.description', icon: '🚗', subcategory: 'subcategory.loanFinance' },
      { href: '/car-tax-calculator', labelKey: 'footer.links.carTaxCalculator', descriptionKey: 'toolsShowcase.tools.carTax.description', icon: '🚘', subcategory: 'subcategory.livingCost' },
      { href: '/fuel-calculator', labelKey: 'footer.links.fuelCalculator', descriptionKey: 'toolsShowcase.tools.fuel.description', icon: '⛽', subcategory: 'subcategory.livingCost' },
      { href: '/median-income', labelKey: 'footer.links.medianIncome', descriptionKey: 'toolsShowcase.tools.medianIncome.description', icon: '📉', subcategory: 'subcategory.others' },
      { href: '/percent-calculator', labelKey: 'footer.links.percentCalculator', descriptionKey: 'toolsShowcase.tools.percentCalculator.description', icon: '🔢', subcategory: 'subcategory.others' },
      { href: '/age-calculator', labelKey: 'footer.links.ageCalculator', descriptionKey: 'toolsShowcase.tools.ageCalculator.description', icon: '🎂', subcategory: 'subcategory.others' },
      { href: '/gpa-calculator', labelKey: 'footer.links.gpaCalculator', descriptionKey: 'toolsShowcase.tools.gpaCalculator.description', icon: '🎓', subcategory: 'subcategory.others' },
      { href: '/compound-calculator', labelKey: 'footer.links.compoundCalculator', descriptionKey: 'toolsShowcase.tools.compoundCalculator.description', icon: '💹', subcategory: 'subcategory.investSavings' },
      { href: '/electricity-calculator', labelKey: 'footer.links.electricityCalculator', descriptionKey: 'toolsShowcase.tools.electricityCalculator.description', icon: '⚡', subcategory: 'subcategory.livingCost' },
      { href: '/discount-calculator', labelKey: 'footer.links.discountCalculator', descriptionKey: 'toolsShowcase.tools.discountCalculator.description', icon: '🏷️', subcategory: 'subcategory.livingCost' },
      { href: '/pyeong-calculator', labelKey: 'footer.links.pyeongCalculator', descriptionKey: 'toolsShowcase.tools.pyeongCalculator.description', icon: '📏', subcategory: 'subcategory.realEstate' },
      { href: '/vat-calculator', labelKey: 'footer.links.vatCalculator', descriptionKey: 'toolsShowcase.tools.vatCalculator.description', icon: '🧾', subcategory: 'subcategory.tax' },
      { href: '/rent-converter', labelKey: 'footer.links.rentConverter', descriptionKey: 'toolsShowcase.tools.rentConverter.description', icon: '🏠', subcategory: 'subcategory.realEstate' },
      { href: '/water-bill', labelKey: 'footer.links.waterBill', descriptionKey: 'toolsShowcase.tools.waterBill.description', icon: '💧', subcategory: 'subcategory.livingCost' },
      { href: '/hourly-wage', labelKey: 'footer.links.hourlyWage', descriptionKey: 'toolsShowcase.tools.hourlyWage.description', icon: '💵', subcategory: 'subcategory.salaryWork' },
      { href: '/severance-pay', labelKey: 'footer.links.severancePay', descriptionKey: 'toolsShowcase.tools.severancePay.description', icon: '💼', subcategory: 'subcategory.salaryWork' },
      { href: '/annual-leave', labelKey: 'footer.links.annualLeave', descriptionKey: 'toolsShowcase.tools.annualLeave.description', icon: '🏖️', subcategory: 'subcategory.salaryWork' },
      { href: '/gas-bill', labelKey: 'footer.links.gasBill', descriptionKey: 'toolsShowcase.tools.gasBill.description', icon: '🔥', subcategory: 'subcategory.livingCost' },
      { href: '/taxi-fare', labelKey: 'footer.links.taxiFare', descriptionKey: 'toolsShowcase.tools.taxiFare.description', icon: '🚕', subcategory: 'subcategory.livingCost' },
      { href: '/installment-calculator', labelKey: 'footer.links.installmentCalc', descriptionKey: 'toolsShowcase.tools.installmentCalc.description', icon: '💳', subcategory: 'subcategory.livingCost' },
      { href: '/shipping-calculator', labelKey: 'footer.links.shippingCalc', descriptionKey: 'toolsShowcase.tools.shippingCalc.description', icon: '📦', subcategory: 'subcategory.livingCost' },
      { href: '/parking-fee', labelKey: 'footer.links.parkingFee', descriptionKey: 'toolsShowcase.tools.parkingFee.description', icon: '🅿️', subcategory: 'subcategory.livingCost' },
      { href: '/dutch-pay', labelKey: 'footer.links.dutchPay', descriptionKey: 'toolsShowcase.tools.dutchPay.description', icon: '🍽️', subcategory: 'subcategory.livingCost' },
      { href: '/budget-calculator', labelKey: 'footer.links.budgetCalculator', descriptionKey: 'toolsShowcase.tools.budgetCalculator.description', icon: '💸', subcategory: 'subcategory.livingCost' },
      { href: '/loan-schedule', labelKey: 'footer.links.loanSchedule', descriptionKey: 'toolsShowcase.tools.loanSchedule.description', icon: '📊', subcategory: 'subcategory.loanFinance' },
      { href: '/moving-cost', labelKey: 'footer.links.movingCost', descriptionKey: 'toolsShowcase.tools.movingCost.description', icon: '🚛', subcategory: 'subcategory.livingCost' },
      { href: '/car-maintenance', labelKey: 'footer.links.carMaintenance', descriptionKey: 'toolsShowcase.tools.carMaintenance.description', icon: '🔧', subcategory: 'subcategory.livingCost' },
      { href: '/inheritance-gift-tax', labelKey: 'footer.links.inheritanceGiftTax', descriptionKey: 'toolsShowcase.tools.inheritanceGiftTax.description', icon: '🏛️', subcategory: 'subcategory.tax' },
      { href: '/freelancer-tax', labelKey: 'footer.links.freelancerTax', descriptionKey: 'toolsShowcase.tools.freelancerTax.description', icon: '💼', subcategory: 'subcategory.tax' },
      { href: '/pension-calculator', labelKey: 'footer.links.pensionCalculator', descriptionKey: 'toolsShowcase.tools.pensionCalculator.description', icon: '🏦', subcategory: 'subcategory.investSavings' },
      { href: '/interior-calculator', labelKey: 'footer.links.interiorCalc', descriptionKey: 'toolsShowcase.tools.interiorCalc.description', icon: '🏠', subcategory: 'subcategory.livingCost' },
      { href: '/investment-calculator', labelKey: 'footer.links.investmentCalculator', descriptionKey: 'toolsShowcase.tools.investmentCalculator.description', icon: '📈', subcategory: 'subcategory.investSavings' },
      { href: '/unemployment-benefit', labelKey: 'footer.links.unemploymentBenefit', descriptionKey: 'toolsShowcase.tools.unemploymentBenefit.description', icon: '📋', subcategory: 'subcategory.others' },
      { href: '/weekly-holiday-pay', labelKey: 'footer.links.weeklyHolidayPay', descriptionKey: 'toolsShowcase.tools.weeklyHolidayPay.description', icon: '💵', subcategory: 'subcategory.salaryWork' },
      { href: '/housing-subscription', labelKey: 'footer.links.housingSubscription', descriptionKey: 'toolsShowcase.tools.housingSubscription.description', icon: '🏗️', addedDate: '2026-03-17', subcategory: 'subcategory.others' },
      { href: '/capital-gains-tax', labelKey: 'footer.links.capitalGainsTax', descriptionKey: 'toolsShowcase.tools.capitalGainsTax.description', icon: '🏢', addedDate: '2026-03-17', subcategory: 'subcategory.tax' },
      { href: '/military-discharge', labelKey: 'footer.links.militaryDischarge', descriptionKey: 'toolsShowcase.tools.militaryDischarge.description', icon: '🎖️', addedDate: '2026-03-17', subcategory: 'subcategory.others' },
      { href: '/year-end-tax', labelKey: 'footer.links.yearEndTax', descriptionKey: 'toolsShowcase.tools.yearEndTax.description', icon: '🧾', addedDate: '2026-03-20', subcategory: 'subcategory.tax' },
      { href: '/income-tax', labelKey: 'footer.links.incomeTax', descriptionKey: 'toolsShowcase.tools.incomeTax.description', icon: '📑', addedDate: '2026-03-20', subcategory: 'subcategory.tax' },
      { href: '/jeonse-loan', labelKey: 'footer.links.jeonseLoan', descriptionKey: 'toolsShowcase.tools.jeonseLoan.description', icon: '🏠', addedDate: '2026-03-20', subcategory: 'subcategory.loanFinance' },
      { href: '/dsr-calculator', labelKey: 'footer.links.dsrCalculator', descriptionKey: 'toolsShowcase.tools.dsrCalculator.description', icon: '🏦', addedDate: '2026-03-20', subcategory: 'subcategory.loanFinance' },
      { href: '/margin-calculator', labelKey: 'footer.links.marginCalculator', descriptionKey: 'toolsShowcase.tools.marginCalculator.description', icon: '💹', addedDate: '2026-03-20', subcategory: 'subcategory.others' },
      { href: '/sales-commission', labelKey: 'footer.links.salesCommission', descriptionKey: 'toolsShowcase.tools.salesCommission.description', icon: '🛒', addedDate: '2026-03-20', subcategory: 'subcategory.others' },
      { href: '/acquisition-tax', labelKey: 'footer.links.acquisitionTax', descriptionKey: 'toolsShowcase.tools.acquisitionTax.description', icon: '🏢', addedDate: '2026-03-20', subcategory: 'subcategory.realEstate' },
      { href: '/average-calculator', labelKey: 'footer.links.averageCalculator', descriptionKey: 'toolsShowcase.tools.averageCalculator.description', icon: '📊', addedDate: '2026-03-20', subcategory: 'subcategory.others' },
      { href: '/grade-calculator', labelKey: 'footer.links.gradeCalculator', descriptionKey: 'toolsShowcase.tools.gradeCalculator.description', icon: '🎓', addedDate: '2026-03-20', subcategory: 'subcategory.others' },
      { href: '/gpa-converter', labelKey: 'footer.links.gpaConverter', descriptionKey: 'toolsShowcase.tools.gpaConverter.description', icon: '📋', addedDate: '2026-03-20', subcategory: 'subcategory.others' },
      { href: '/pc-electricity', labelKey: 'footer.links.pcElectricity', descriptionKey: 'toolsShowcase.tools.pcElectricity.description', icon: '🖥️', addedDate: '2026-03-20', subcategory: 'subcategory.others' },
      { href: '/parental-leave', labelKey: 'footer.links.parentalLeave', descriptionKey: 'toolsShowcase.tools.parentalLeave.description', icon: '👶', addedDate: '2026-03-21', subcategory: 'subcategory.salaryWork' },
      { href: '/health-insurance', labelKey: 'footer.links.healthInsurance', descriptionKey: 'toolsShowcase.tools.healthInsurance.description', icon: '🏥', addedDate: '2026-03-21', subcategory: 'subcategory.tax' },
      { href: '/wedding-calculator', labelKey: 'footer.links.weddingCalculator', descriptionKey: 'toolsShowcase.tools.weddingCalculator.description', icon: '💒', addedDate: '2026-03-21', subcategory: 'subcategory.livingCost' },
      { href: '/comprehensive-property-tax', labelKey: 'footer.links.comprehensivePropertyTax', descriptionKey: 'toolsShowcase.tools.comprehensivePropertyTax.description', icon: '🏘️', addedDate: '2026-03-21', subcategory: 'subcategory.tax' },
      { href: '/cagr-calculator', labelKey: 'footer.links.cagrCalculator', descriptionKey: 'toolsShowcase.tools.cagrCalculator.description', icon: '📈', addedDate: '2026-03-21', subcategory: 'subcategory.investSavings' },
    ],
  },
  tools: {
    titleKey: 'navigation.developmentTools',
    items: [
      { href: '/regex-extractor', labelKey: 'footer.links.regexExtractor', descriptionKey: 'toolsShowcase.tools.regex.description', icon: '🔍', subcategory: 'subcategory.devTools' },
      { href: '/time-converter', labelKey: 'footer.links.timeConverter', descriptionKey: 'toolsShowcase.tools.time.description', icon: '🕰️', subcategory: 'subcategory.convertEncode' },
      { href: '/json-formatter', labelKey: 'footer.links.jsonFormatter', descriptionKey: 'toolsShowcase.tools.json.description', icon: '📝', subcategory: 'subcategory.devTools' },
      { href: '/json-xml-converter', labelKey: 'footer.links.jsonXmlConverter', descriptionKey: 'toolsShowcase.tools.jsonXml.description', icon: '🔄', subcategory: 'subcategory.devTools' },
      { href: '/yaml-json-converter', labelKey: 'footer.links.yamlJsonConverter', descriptionKey: 'toolsShowcase.tools.yamlJsonConverter.description', icon: '📄', subcategory: 'subcategory.convertEncode' },
      { href: '/subnet-calculator', labelKey: 'footer.links.subnetCalculator', descriptionKey: 'toolsShowcase.tools.subnetCalculator.description', icon: '🌐', subcategory: 'subcategory.devTools' },
      { href: '/html-entity-converter', labelKey: 'footer.links.htmlEntityConverter', descriptionKey: 'toolsShowcase.tools.htmlEntityConverter.description', icon: '🔤', subcategory: 'subcategory.convertEncode' },
      { href: '/json-csv-converter', labelKey: 'footer.links.jsonCsvConverter', descriptionKey: 'toolsShowcase.tools.jsonCsv.description', icon: '🔄', subcategory: 'subcategory.devTools' },
      { href: '/jwt-decoder', labelKey: 'footer.links.jwtDecoder', descriptionKey: 'toolsShowcase.tools.jwt.description', icon: '🔐', subcategory: 'subcategory.devTools' },
      { href: '/uuid-generator', labelKey: 'footer.links.uuidGenerator', descriptionKey: 'toolsShowcase.tools.uuid.description', icon: '🆔', subcategory: 'subcategory.devTools' },
      { href: '/cron-tester', labelKey: 'footer.links.cronTester', descriptionKey: 'toolsShowcase.tools.cron.description', icon: '⏰', subcategory: 'subcategory.devTools' },
      { href: '/qr-generator', labelKey: 'footer.links.qrGenerator', descriptionKey: 'toolsShowcase.tools.qr.description', icon: '📱', subcategory: 'subcategory.generators' },
      { href: '/barcode-generator', labelKey: 'footer.links.barcodeGenerator', descriptionKey: 'toolsShowcase.tools.barcode.description', icon: '📊', subcategory: 'subcategory.generators' },
      { href: '/sql-formatter', labelKey: 'footer.links.sqlFormatter', descriptionKey: 'toolsShowcase.tools.sql.description', icon: '🗄️', subcategory: 'subcategory.devTools' },
      { href: '/markdown-editor', labelKey: 'footer.links.markdownEditor', descriptionKey: 'toolsShowcase.tools.markdownEditor.description', icon: '✏️', subcategory: 'subcategory.textTools' },
      { href: '/3d-viewer', labelKey: 'footer.links.3dConverter', descriptionKey: 'toolsShowcase.tools.3dConverter.description', icon: '🎮', subcategory: 'subcategory.otherTools' },
      { href: '/character-counter', labelKey: 'footer.links.characterCounter', descriptionKey: 'toolsShowcase.tools.characterCounter.description', icon: '🔤', subcategory: 'subcategory.textTools' },
      { href: '/base64-converter', labelKey: 'footer.links.base64Converter', descriptionKey: 'toolsShowcase.tools.base64.description', icon: '🔐', subcategory: 'subcategory.convertEncode' },
      { href: '/url-encoder', labelKey: 'footer.links.urlEncoder', descriptionKey: 'toolsShowcase.tools.urlEncoder.description', icon: '🔗', subcategory: 'subcategory.convertEncode' },
      { href: '/hash-generator', labelKey: 'footer.links.hashGenerator', descriptionKey: 'toolsShowcase.tools.hashGenerator.description', icon: '#️⃣', subcategory: 'subcategory.convertEncode' },
      { href: '/diff-viewer', labelKey: 'footer.links.diffViewer', descriptionKey: 'toolsShowcase.tools.diffViewer.description', icon: '📋', subcategory: 'subcategory.textTools' },
      { href: '/color-converter', labelKey: 'footer.links.colorConverter', descriptionKey: 'toolsShowcase.tools.colorConverter.description', icon: '🎨', subcategory: 'subcategory.convertEncode' },
      { href: '/lorem-ipsum', labelKey: 'footer.links.loremIpsum', descriptionKey: 'toolsShowcase.tools.loremIpsum.description', icon: '📝', subcategory: 'subcategory.textTools' },
      { href: '/unit-converter', labelKey: 'footer.links.unitConverter', descriptionKey: 'toolsShowcase.tools.unitConverter.description', icon: '📐', subcategory: 'subcategory.convertEncode' },
      { href: '/text-converter', labelKey: 'footer.links.textConverter', descriptionKey: 'toolsShowcase.tools.textConverter.description', icon: '🔄', subcategory: 'subcategory.textTools' },
      { href: '/password-generator', labelKey: 'footer.links.passwordGenerator', descriptionKey: 'toolsShowcase.tools.passwordGenerator.description', icon: '🔑', subcategory: 'subcategory.generators' },
      { href: '/dday-calculator', labelKey: 'footer.links.ddayCalculator', descriptionKey: 'toolsShowcase.tools.ddayCalculator.description', icon: '📅', subcategory: 'subcategory.otherTools' },
      { href: '/random-picker', labelKey: 'footer.links.randomPicker', descriptionKey: 'toolsShowcase.tools.randomPicker.description', icon: '🎲', subcategory: 'subcategory.otherTools' },
      { href: '/timer', labelKey: 'footer.links.timer', descriptionKey: 'toolsShowcase.tools.timer.description', icon: '⏱️', subcategory: 'subcategory.otherTools' },
      { href: '/base-converter', labelKey: 'footer.links.baseConverter', descriptionKey: 'toolsShowcase.tools.baseConverter.description', icon: '🔢', subcategory: 'subcategory.convertEncode' },
      { href: '/notepad', labelKey: 'footer.links.notepad', descriptionKey: 'toolsShowcase.tools.notepad.description', icon: '📒', subcategory: 'subcategory.otherTools' },
      { href: '/screen-info', labelKey: 'footer.links.screenInfo', descriptionKey: 'toolsShowcase.tools.screenInfo.description', icon: '🖥️', subcategory: 'subcategory.otherTools' },
      { href: '/emoji-picker', labelKey: 'footer.links.emojiPicker', descriptionKey: 'toolsShowcase.tools.emojiPicker.description', icon: '😀', subcategory: 'subcategory.otherTools' },
      { href: '/lunar-converter', labelKey: 'footer.links.lunarConverter', descriptionKey: 'toolsShowcase.tools.lunarConverter.description', icon: '🌙', subcategory: 'subcategory.convertEncode' },
      { href: '/ip-checker', labelKey: 'footer.links.ipChecker', descriptionKey: 'toolsShowcase.tools.ipChecker.description', icon: '🌐', subcategory: 'subcategory.otherTools' },
      { href: '/typing-test', labelKey: 'footer.links.typingTest', descriptionKey: 'toolsShowcase.tools.typingTest.description', icon: '⌨️', subcategory: 'subcategory.otherTools' },
      { href: '/number-to-korean', labelKey: 'footer.links.numberToKorean', descriptionKey: 'toolsShowcase.tools.numberToKorean.description', icon: '🔢', subcategory: 'subcategory.convertEncode' },
      { href: '/qr-scanner', labelKey: 'footer.links.qrScanner', descriptionKey: 'toolsShowcase.tools.qrScanner.description', icon: '📷', subcategory: 'subcategory.otherTools' },
      { href: '/font-preview', labelKey: 'footer.links.fontPreview', descriptionKey: 'toolsShowcase.tools.fontPreview.description', icon: '🔤', subcategory: 'subcategory.otherTools' },
      { href: '/world-clock', labelKey: 'footer.links.worldClock', descriptionKey: 'toolsShowcase.tools.worldClock.description', icon: '🕐', subcategory: 'subcategory.otherTools' },
      { href: '/css-gradient', labelKey: 'footer.links.cssGradient', descriptionKey: 'toolsShowcase.tools.cssGradient.description', icon: '🌈', subcategory: 'subcategory.generators' },
      { href: '/korean-syllable', labelKey: 'footer.links.koreanSyllable', descriptionKey: 'toolsShowcase.tools.koreanSyllable.description', icon: '🇰🇷', subcategory: 'subcategory.otherTools' },
      { href: '/roman-numeral', labelKey: 'footer.links.romanNumeral', descriptionKey: 'toolsShowcase.tools.romanNumeral.description', icon: '🏛️', subcategory: 'subcategory.convertEncode' },
      { href: '/business-number', labelKey: 'footer.links.businessNumber', descriptionKey: 'toolsShowcase.tools.businessNumber.description', icon: '🏢', subcategory: 'subcategory.otherTools' },
      { href: '/color-palette', labelKey: 'footer.links.colorPalette', descriptionKey: 'toolsShowcase.tools.colorPalette.description', icon: '🎨', subcategory: 'subcategory.generators' },
      { href: '/aspect-ratio', labelKey: 'footer.links.aspectRatio', descriptionKey: 'toolsShowcase.tools.aspectRatio.description', icon: '📐', subcategory: 'subcategory.otherTools' },
      { href: '/text-to-speech', labelKey: 'footer.links.textToSpeech', descriptionKey: 'toolsShowcase.tools.textToSpeech.description', icon: '🔊', subcategory: 'subcategory.otherTools' },
      { href: '/morse-code', labelKey: 'footer.links.morseCode', descriptionKey: 'toolsShowcase.tools.morseCode.description', icon: '📡', subcategory: 'subcategory.convertEncode' },
      { href: '/resident-number', labelKey: 'footer.links.residentNumber', descriptionKey: 'toolsShowcase.tools.residentNumber.description', icon: '🪪', subcategory: 'subcategory.otherTools' },
      { href: '/monitor-test', labelKey: 'footer.links.monitorTest', descriptionKey: 'toolsShowcase.tools.monitorTest.description', icon: '🖥️', subcategory: 'subcategory.otherTools' },
      { href: '/keyboard-converter', labelKey: 'footer.links.keyboardConverter', descriptionKey: 'toolsShowcase.tools.keyboardConverter.description', icon: '⌨️', subcategory: 'subcategory.convertEncode' },
      { href: '/contrast-checker', labelKey: 'footer.links.contrastChecker', descriptionKey: 'toolsShowcase.tools.contrastChecker.description', icon: '🔲', subcategory: 'subcategory.generators' },
      { href: '/box-shadow', labelKey: 'footer.links.boxShadow', descriptionKey: 'toolsShowcase.tools.boxShadow.description', icon: '🔳', subcategory: 'subcategory.generators' },
      { href: '/code-screenshot', labelKey: 'footer.links.codeScreenshot', descriptionKey: 'toolsShowcase.tools.codeScreenshot.description', icon: '📸', subcategory: 'subcategory.generators' },
      { href: '/flexbox-grid', labelKey: 'footer.links.flexboxGrid', descriptionKey: 'toolsShowcase.tools.flexboxGrid.description', icon: '📐', subcategory: 'subcategory.generators' },
      { href: '/svg-editor', labelKey: 'footer.links.svgEditor', descriptionKey: 'toolsShowcase.tools.svgEditor.description', icon: '🎨', subcategory: 'subcategory.generators' },
      { href: '/api-tester', labelKey: 'footer.links.apiTester', descriptionKey: 'toolsShowcase.tools.apiTester.description', icon: '🔌', subcategory: 'subcategory.devTools' },
      { href: '/favicon-generator', labelKey: 'footer.links.faviconGenerator', descriptionKey: 'toolsShowcase.tools.faviconGenerator.description', icon: '🌐', subcategory: 'subcategory.generators' },
      { href: '/pomodoro', labelKey: 'footer.links.pomodoroTimer', descriptionKey: 'toolsShowcase.tools.pomodoroTimer.description', icon: '🍅', subcategory: 'subcategory.otherTools' },
      { href: '/css-unit-converter', labelKey: 'footer.links.cssUnitConverter', descriptionKey: 'toolsShowcase.tools.cssUnitConverter.description', icon: '📏', subcategory: 'subcategory.convertEncode' },
      { href: '/speed-test', labelKey: 'footer.links.speedTest', descriptionKey: 'toolsShowcase.tools.speedTest.description', icon: '🚀', subcategory: 'subcategory.otherTools' },
      { href: '/stamp-generator', labelKey: 'footer.links.stampGenerator', descriptionKey: 'toolsShowcase.tools.stampGenerator.description', icon: '🔴', subcategory: 'subcategory.generators' },
      { href: '/fancy-text', labelKey: 'footer.links.fancyText', descriptionKey: 'toolsShowcase.tools.fancyText.description', icon: '✨', subcategory: 'subcategory.textTools' },
      { href: '/presentation-timer', labelKey: 'footer.links.presentationTimer', descriptionKey: 'toolsShowcase.tools.presentationTimer.description', icon: '⏱️', subcategory: 'subcategory.otherTools' },
      { href: '/chart-studio', labelKey: 'footer.links.chartStudio', descriptionKey: 'toolsShowcase.tools.chartStudio.description', icon: '📊', subcategory: 'subcategory.generators' },
      { href: '/email-template', labelKey: 'footer.links.emailTemplate', descriptionKey: 'toolsShowcase.tools.emailTemplate.description', icon: '📧', subcategory: 'subcategory.generators' },
      { href: '/prompt-generator', labelKey: 'footer.links.promptGenerator', descriptionKey: 'toolsShowcase.tools.promptGenerator.description', icon: '🤖', subcategory: 'subcategory.generators' },
      { href: '/gantt-chart', labelKey: 'footer.links.ganttChart', descriptionKey: 'toolsShowcase.tools.ganttChart.description', icon: '📅', subcategory: 'subcategory.otherTools' },
      { href: '/invoice-generator', labelKey: 'footer.links.invoiceGenerator', descriptionKey: 'toolsShowcase.tools.invoiceGenerator.description', icon: '🧾', subcategory: 'subcategory.generators' },
      { href: '/kanban-board', labelKey: 'footer.links.kanbanBoard', descriptionKey: 'toolsShowcase.tools.kanbanBoard.description', icon: '📋', subcategory: 'subcategory.otherTools' },
      { href: '/meeting-minutes', labelKey: 'footer.links.meetingMinutes', descriptionKey: 'toolsShowcase.tools.meetingMinutes.description', icon: '📝', subcategory: 'subcategory.otherTools' },
      { href: '/crontab-generator', labelKey: 'footer.links.crontabGenerator', descriptionKey: 'toolsShowcase.tools.crontabGenerator.description', icon: '⏰', subcategory: 'subcategory.devTools' },
      { href: '/regex-builder', labelKey: 'footer.links.regexBuilder', descriptionKey: 'toolsShowcase.tools.regexBuilder.description', icon: '🔍', subcategory: 'subcategory.devTools' },
      { href: '/env-editor', labelKey: 'footer.links.envEditor', descriptionKey: 'toolsShowcase.tools.envEditor.description', icon: '📋', subcategory: 'subcategory.devTools' },
      { href: '/llm-token-calculator', labelKey: 'footer.links.llmTokenCalculator', descriptionKey: 'toolsShowcase.tools.llmTokenCalculator.description', icon: '🤖', subcategory: 'subcategory.devTools' },
      { href: '/webserver-config', labelKey: 'footer.links.webserverConfig', descriptionKey: 'toolsShowcase.tools.webserverConfig.description', icon: '⚙️', subcategory: 'subcategory.devTools' },
      { href: '/curl-builder', labelKey: 'footer.links.curlBuilder', descriptionKey: 'toolsShowcase.tools.curlBuilder.description', icon: '🔗', addedDate: '2026-03-21', subcategory: 'subcategory.devTools' },
      { href: '/pomodoro', labelKey: 'footer.links.pomodoro', descriptionKey: 'toolsShowcase.tools.pomodoro.description', icon: '🍅', addedDate: '2026-03-21', subcategory: 'subcategory.otherTools' },
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
      { href: '/noise-meter', labelKey: 'footer.links.noiseMeter', descriptionKey: 'toolsShowcase.tools.noiseMeter.description', icon: '🔊' },
      { href: '/spirit-level', labelKey: 'footer.links.spiritLevel', descriptionKey: 'toolsShowcase.tools.spiritLevel.description', icon: '📐' },
      { href: '/metronome', labelKey: 'footer.links.metronome', descriptionKey: 'toolsShowcase.tools.metronome.description', icon: '🎵' },
      { href: '/white-noise', labelKey: 'footer.links.whiteNoise', descriptionKey: 'toolsShowcase.tools.whiteNoise.description', icon: '🌙' },
      { href: '/image-compressor', labelKey: 'footer.links.imageCompressor', descriptionKey: 'toolsShowcase.tools.imageCompressor.description', icon: '🗜️' },
      { href: '/screen-recorder', labelKey: 'footer.links.screenRecorder', descriptionKey: 'toolsShowcase.tools.screenRecorder.description', icon: '🎬' },
      { href: '/voice-memo', labelKey: 'footer.links.voiceMemo', descriptionKey: 'toolsShowcase.tools.voiceMemo.description', icon: '🎙️' },
      { href: '/gif-maker', labelKey: 'footer.links.gifMaker', descriptionKey: 'toolsShowcase.tools.gifMaker.description', icon: '🎞️' },
      { href: '/background-remover', labelKey: 'footer.links.backgroundRemover', descriptionKey: 'toolsShowcase.tools.backgroundRemover.description', icon: '✂️' },
      { href: '/collage-maker', labelKey: 'footer.links.collageMaker', descriptionKey: 'toolsShowcase.tools.collageMaker.description', icon: '🖼️' },
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
      { href: '/exercise-calorie', labelKey: 'footer.links.exerciseCalorie', descriptionKey: 'toolsShowcase.tools.exerciseCalorie.description', icon: '🔥' },
      { href: '/breathing-exercise', labelKey: 'footer.links.breathingExercise', descriptionKey: 'toolsShowcase.tools.breathingExercise.description', icon: '🧘' },
      { href: '/blood-sugar', labelKey: 'footer.links.bloodSugar', descriptionKey: 'toolsShowcase.tools.bloodSugar.description', icon: '🩸' },
      { href: '/sleep-calculator', labelKey: 'footer.links.sleepCalculator', descriptionKey: 'toolsShowcase.tools.sleepCalculator.description', icon: '😴' },
      { href: '/nutrition-calculator', labelKey: 'footer.links.nutritionCalculator', descriptionKey: 'toolsShowcase.tools.nutritionCalculator.description', icon: '🥗' },
      { href: '/menu-picker', labelKey: 'footer.links.menuPicker', descriptionKey: 'toolsShowcase.tools.menuPicker.description', icon: '🍽️' },
      { href: '/biorhythm', labelKey: 'footer.links.biorhythm', descriptionKey: 'toolsShowcase.tools.biorhythm.description', icon: '🌊', addedDate: '2026-03-21' },
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
      { href: '/chess', labelKey: 'footer.links.chess', descriptionKey: 'toolsShowcase.tools.chess.description', icon: '♟️', addedDate: '2026-03-21', modes: ['ai'] },
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
      { href: '/breakout-game', labelKey: 'footer.links.breakoutGame', descriptionKey: 'toolsShowcase.tools.breakoutGame.description', icon: '🏓', modes: ['solo'] },
      { href: '/solitaire', labelKey: 'footer.links.solitaire', descriptionKey: 'toolsShowcase.tools.solitaire.description', icon: '🃏', modes: ['solo'] },
      { href: '/15-puzzle', labelKey: 'footer.links.fifteenPuzzle', descriptionKey: 'toolsShowcase.tools.fifteenPuzzle.description', icon: '🧩', modes: ['solo'] },
      { href: '/flappy-bird', labelKey: 'footer.links.flappyBird', descriptionKey: 'toolsShowcase.tools.flappyBird.description', icon: '🐤', modes: ['solo'] },
      { href: '/hangman', labelKey: 'footer.links.hangman', descriptionKey: 'toolsShowcase.tools.hangman.description', icon: '🔤', modes: ['solo'] },
      { href: '/pac-man', labelKey: 'footer.links.pacMan', descriptionKey: 'toolsShowcase.tools.pacMan.description', icon: '👾', modes: ['solo'] },
    ],
  },
};

// 카테고리 키 목록
export const categoryKeys = ['calculators', 'tools', 'media', 'health', 'games'] as const;
export type CategoryKey = typeof categoryKeys[number];
