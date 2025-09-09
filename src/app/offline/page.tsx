'use client'

import { Calculator, Wifi, WifiOff, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          {/* Icon */}
          <div className="relative mb-8">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
              <WifiOff className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4">
            오프라인 모드
          </h1>
          
          {/* Description */}
          <p className="text-white/80 mb-8 leading-relaxed">
            인터넷 연결이 없어도 툴허브의 핵심 기능을 사용할 수 있습니다!
          </p>

          {/* Available Features */}
          <div className="bg-white/5 rounded-xl p-6 mb-8 text-left">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              사용 가능한 기능
            </h3>
            <div className="space-y-2 text-white/80 text-sm">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                연봉 실수령액 계산
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                로또번호 생성 (기본 기능)
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                대출 상환금 계산
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                각종 세금 계산
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                JSON 포맷터
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                UUID 생성기
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                QR코드 생성
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center transition-colors duration-200"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              연결 상태 확인
            </button>
            
            <Link 
              href="/"
              className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl flex items-center justify-center transition-colors duration-200 border border-white/20"
            >
              <Home className="w-5 h-5 mr-2" />
              홈으로 이동
            </Link>
          </div>

          {/* Status */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-center text-white/60 text-sm">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></div>
              오프라인 상태
            </div>
            <p className="text-white/40 text-xs mt-2">
              네트워크가 복구되면 자동으로 최신 데이터로 업데이트됩니다
            </p>
          </div>
        </div>

        {/* Bottom info */}
        <div className="mt-6 text-white/60 text-sm">
          <p>툴허브 PWA • 오프라인 지원</p>
        </div>
      </div>
    </div>
  )
}