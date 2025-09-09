'use client'

import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Calculator, 
  DollarSign, 
  PiggyBank,
  TrendingUp,
  Car,
  Scale,
  Activity,
  Clock,
  Dice6,
  Code,
  Image,
  FileText,
  Wrench,
  QrCode,
  BarChart3,
  Fuel
} from 'lucide-react'

interface Tool {
  name: string
  href: string
  icon: React.ComponentType<any>
  category: 'financial' | 'health' | 'development' | 'games' | 'utility'
  priority: number
}

const tools: Tool[] = [
  // 금융 계산기
  { name: 'salary', href: '/', icon: Calculator, category: 'financial', priority: 0 },
  { name: 'loan', href: '/loan-calculator', icon: DollarSign, category: 'financial', priority: 1 },
  { name: 'savings', href: '/savings-calculator', icon: PiggyBank, category: 'financial', priority: 2 },
  { name: 'retirement', href: '/retirement-calculator', icon: TrendingUp, category: 'financial', priority: 3 },
  { name: 'tax', href: '/tax-calculator', icon: Calculator, category: 'financial', priority: 4 },
  { name: 'exchange', href: '/exchange-calculator', icon: DollarSign, category: 'financial', priority: 5 },
  { name: 'realEstate', href: '/real-estate-calculator', icon: TrendingUp, category: 'financial', priority: 6 },
  { name: 'monthlyRentSubsidy', href: '/monthly-rent-subsidy', icon: TrendingUp, category: 'financial', priority: 7 },
  { name: 'bogeumjariLoan', href: '/bogeumjari-loan', icon: TrendingUp, category: 'financial', priority: 8 },
  { name: 'stock', href: '/stock-calculator', icon: TrendingUp, category: 'financial', priority: 9 },
  { name: 'carLoan', href: '/car-loan-calculator', icon: Car, category: 'financial', priority: 10 },
  { name: 'carTax', href: '/car-tax-calculator', icon: Car, category: 'financial', priority: 11 },
  { name: 'fuel', href: '/fuel-calculator', icon: Fuel, category: 'financial', priority: 12 },
  
  // 건강 도구
  { name: 'bmi', href: '/bmi-calculator', icon: Scale, category: 'health', priority: 1 },
  { name: 'calorie', href: '/calorie-calculator', icon: Activity, category: 'health', priority: 2 },
  { name: 'bodyFat', href: '/body-fat-calculator', icon: Activity, category: 'health', priority: 3 },
  
  // 개발 도구
  { name: 'json', href: '/json-formatter', icon: Code, category: 'development', priority: 1 },
  { name: 'jsonXml', href: '/json-xml-converter', icon: Code, category: 'development', priority: 2 },
  { name: 'jsonCsv', href: '/json-csv-converter', icon: Code, category: 'development', priority: 3 },
  { name: 'jwt', href: '/jwt-decoder', icon: Code, category: 'development', priority: 4 },
  { name: 'uuid', href: '/uuid-generator', icon: Code, category: 'development', priority: 5 },
  { name: 'cron', href: '/cron-tester', icon: Clock, category: 'development', priority: 6 },
  { name: 'qr', href: '/qr-generator', icon: QrCode, category: 'development', priority: 7 },
  { name: 'barcode', href: '/barcode-generator', icon: BarChart3, category: 'development', priority: 8 },
  { name: 'sql', href: '/sql-formatter', icon: Code, category: 'development', priority: 9 },
  { name: 'regex', href: '/regex-extractor', icon: Code, category: 'development', priority: 10 },
  { name: 'markdown', href: '/markdown-viewer', icon: FileText, category: 'development', priority: 11 },
  
  // 유틸리티
  { name: 'time', href: '/time-converter', icon: Clock, category: 'utility', priority: 1 },
  { name: 'workHours', href: '/work-hours-calculator', icon: Clock, category: 'utility', priority: 2 },
  { name: 'imageResize', href: '/image-resizer', icon: Image, category: 'utility', priority: 3 },
  { name: 'imageEdit', href: '/image-editor', icon: Image, category: 'utility', priority: 4 },
  
  // 게임
  { name: 'lotto', href: '/lotto-generator', icon: Dice6, category: 'games', priority: 1 },
  { name: 'ladder', href: '/ladder-game', icon: Dice6, category: 'games', priority: 2 },
]

const categoryOrder = ['financial', 'health', 'development', 'utility', 'games'] as const

export default function ToolsShowcase() {
  const t = useTranslations('toolsShowcase')
  const tc = useTranslations('common')
  const pathname = usePathname()
  
  // Debug: 현재 pathname 확인
  console.log('Current pathname:', pathname)

  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = []
    }
    acc[tool.category].push(tool)
    return acc
  }, {} as Record<string, Tool[]>)

  // 각 카테고리 내에서 priority 순으로 정렬
  Object.keys(groupedTools).forEach(category => {
    groupedTools[category].sort((a, b) => a.priority - b.priority)
  })

  return (
    <section className="mt-16 mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {t('title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t('description')}
        </p>
      </div>

      <div className="space-y-12">
        {categoryOrder.map(category => {
          const categoryTools = groupedTools[category]
          if (!categoryTools?.length) return null
          
          return (
            <div key={category} className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
                {t(`categories.${category}`)}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryTools.map(tool => {
                  const Icon = tool.icon
                  const isCurrentPage = pathname === tool.href
                  
                  // Debug: 매칭 상태 확인
                  if (tool.name === 'jsonXml') {
                    console.log('JSON-XML tool:', tool.href, 'vs pathname:', pathname, 'match:', isCurrentPage)
                  }
                  
                  if (isCurrentPage) {
                    // 현재 페이지는 링크가 아닌 현재 상태 표시
                    return (
                      <div
                        key={tool.name}
                        className="group bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-300 dark:border-blue-600 p-4 relative"
                      >
                        <div className="absolute top-2 right-2">
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                            현재 페이지
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              {t(`tools.${tool.name}.title`)}
                            </h4>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                              {t(`tools.${tool.name}.description`)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:-translate-y-1"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {t(`tools.${tool.name}.title`)}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {t(`tools.${tool.name}.description`)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center mt-12">
        <Link
          href="/tips"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Wrench className="w-5 h-5 mr-2" />
          {t('viewTips')}
        </Link>
      </div>
    </section>
  )
}