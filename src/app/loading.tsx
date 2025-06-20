import { Calculator, TrendingUp } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* 애니메이션 로고 */}
        <div className="relative mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full shadow-lg animate-pulse">
            <Calculator className="w-10 h-10 text-white" />
          </div>
          
          {/* 회전하는 링 */}
          <div className="absolute inset-0 w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
          
          {/* 외부 링 */}
          <div className="absolute -inset-2 w-24 h-24 border-2 border-blue-100 rounded-full animate-ping opacity-20"></div>
        </div>

        {/* 로딩 텍스트 */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            툴허브
          </h2>
          <p className="text-gray-600 dark:text-gray-300 animate-pulse">
            계산기를 준비하고 있습니다...
          </p>
        </div>

        {/* 도트 애니메이션 */}
        <div className="flex justify-center mt-6 space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
        </div>

        {/* 진행률 표시 */}
        <div className="mt-8 w-64 mx-auto">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full animate-progress"></div>
          </div>
        </div>

        {/* 기능 아이콘들 */}
        <div className="flex justify-center mt-8 space-x-4 opacity-60">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg animate-float">
            <Calculator className="w-5 h-5 text-blue-600" />
          </div>
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg animate-float delay-200">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg animate-float delay-400">
            <span className="text-purple-600 font-bold text-sm">%</span>
          </div>
        </div>
      </div>
    </div>
  )
}