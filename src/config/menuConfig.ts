// 공통 메뉴 설정 파일
// Header, Footer, ToolsShowcase에서 동일한 메뉴 구조를 사용합니다.

export interface MenuItem {
  href: string;
  labelKey: string; // 번역 키 (footer.links.xxx)
  descriptionKey: string; // 설명 번역 키 (toolsShowcase.tools.xxx.description)
  icon: string;
}

export interface MenuCategory {
  titleKey: string; // 번역 키
  items: MenuItem[];
}

export interface MenuConfig {
  calculators: MenuCategory;
  tools: MenuCategory;
  health: MenuCategory;
  games: MenuCategory;
}

export const menuConfig: MenuConfig = {
  calculators: {
    titleKey: 'navigation.financialCalculators',
    items: [
      { href: '/', labelKey: 'footer.links.salaryCalculator', descriptionKey: 'toolsShowcase.tools.salary.description', icon: '💰' },
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
      { href: '/image-resizer', labelKey: 'footer.links.imageResizer', descriptionKey: 'toolsShowcase.tools.imageResize.description', icon: '🖼️' },
      { href: '/image-editor', labelKey: 'footer.links.imageEditor', descriptionKey: 'toolsShowcase.tools.imageEdit.description', icon: '🎨' },
      { href: '/3d-viewer', labelKey: 'footer.links.3dConverter', descriptionKey: 'toolsShowcase.tools.3dConverter.description', icon: '🎮' },
    ],
  },
  health: {
    titleKey: 'navigation.healthTools',
    items: [
      { href: '/bmi-calculator', labelKey: 'footer.links.bmiCalculator', descriptionKey: 'toolsShowcase.tools.bmi.description', icon: '❤️' },
      { href: '/calorie-calculator', labelKey: 'footer.links.calorieCalculator', descriptionKey: 'toolsShowcase.tools.calorie.description', icon: '🍎' },
      { href: '/body-fat-calculator', labelKey: 'footer.links.bodyFatCalculator', descriptionKey: 'toolsShowcase.tools.bodyFat.description', icon: '💪' },
      { href: '/work-hours-calculator', labelKey: 'footer.links.workHoursCalculator', descriptionKey: 'toolsShowcase.tools.workHours.description', icon: '⏰' },
    ],
  },
  games: {
    titleKey: 'navigation.simpleGames',
    items: [
      { href: '/lotto-generator', labelKey: 'footer.links.lottoGenerator', descriptionKey: 'toolsShowcase.tools.lotto.description', icon: '🎲' },
      { href: '/ladder-game', labelKey: 'footer.links.ladderGame', descriptionKey: 'toolsShowcase.tools.ladder.description', icon: '🪜' },
    ],
  },
};

// 카테고리 키 목록
export const categoryKeys = ['calculators', 'tools', 'health', 'games'] as const;
export type CategoryKey = typeof categoryKeys[number];
