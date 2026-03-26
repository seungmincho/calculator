'use client'
import { useState } from 'react'
import AlgorithmSidebar from './AlgorithmSidebar'

interface AlgorithmLayoutProps {
  children: React.ReactNode
}

export default function AlgorithmLayout({ children }: AlgorithmLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile toggle */}
      <div className="lg:hidden p-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl border border-white/20 dark:border-gray-700/30 text-gray-900 dark:text-white font-medium"
        >
          <span>📚 다른 알고리즘</span>
          <span className={`transition-transform ${sidebarOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {sidebarOpen && (
          <div className="mt-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
            <AlgorithmSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        )}
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-r border-white/10 dark:border-gray-700/20">
          <AlgorithmSidebar />
        </aside>

        {/* Main content — 학습용이므로 넓게 */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
