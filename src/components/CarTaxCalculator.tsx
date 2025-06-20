'use client'

import { useState, useEffect } from 'react'
import { Car, Calculator, Percent, Receipt, DollarSign, AlertCircle, Share2, Check, Save } from 'lucide-react'
import CalculationHistory from './CalculationHistory'
import { useCalculationHistory } from '@/hooks/useCalculationHistory'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'

interface CarTaxResult {
  acquisitionTax: number // 취득세
  registrationTax: number // 등록세  
  railroadBond: number // 도시철도채권
  licenseRegistrationTax: number // 등록면허세
  totalTax: number // 총 세금
  totalCostWithTax: number // 차량가격 + 세금
  appliedBenefits: string[] // 적용된 감면 혜택
}

type CarType = 'passenger' | 'truck' | 'van' | 'motorcycle' | 'compact' | 'electric'
type FuelType = 'gasoline' | 'diesel' | 'lpg' | 'electric' | 'hybrid'
type Usage = 'personal' | 'business' // 비영업용/영업용
type VanSeats = '7-10' | '11+' // 승합차 인승
type MotorcycleSize = 'small' | 'large' // 125cc 이하/초과

export default function CarTaxCalculator() {
  const t = useTranslations('carTax')
  const [carPrice, setCarPrice] = useState<string>('')
  const [carType, setCarType] = useState<CarType>('passenger')
  const [fuelType, setFuelType] = useState<FuelType>('gasoline')
  const [displacement, setDisplacement] = useState<string>('')
  const [isNew, setIsNew] = useState<boolean>(true)
  const [region, setRegion] = useState<string>('seoul')
  const [usage, setUsage] = useState<Usage>('personal')
  const [vanSeats, setVanSeats] = useState<VanSeats>('7-10')
  const [motorcycleSize, setMotorcycleSize] = useState<MotorcycleSize>('small')
  const [isMultiChild, setIsMultiChild] = useState<boolean>(false)
  const [childCount, setChildCount] = useState<number>(0)
  const [isDisabled, setIsDisabled] = useState<boolean>(false)
  const [isVeteran, setIsVeteran] = useState<boolean>(false)
  const [result, setResult] = useState<CarTaxResult | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  
  const { histories, saveCalculation, removeHistory, clearHistories, loadFromHistory } = useCalculationHistory('car-tax')
  const router = useRouter()
  const searchParams = useSearchParams()

  const calculateCarTax = () => {
    const price = parseFloat(carPrice)
    const disp = parseFloat(displacement) || 0

    if (!price || price <= 0) return

    let acquisitionTaxRate = 0.02 // 기본 취득세 2%
    let registrationTaxRate = 0 // 등록세
    let railroadBondRate = 0 // 도시철도채권
    let licenseRegistrationTax = 0 // 등록면허세
    const appliedBenefits: string[] = []

    // 차종별, 용도별 세율 적용
    if (carType === 'compact') {
      // 경차
      acquisitionTaxRate = 0.02
      registrationTaxRate = 0
    } else if (carType === 'passenger') {
      // 승용차
      if (usage === 'personal') {
        acquisitionTaxRate = 0.02
        registrationTaxRate = 0.05
      } else {
        acquisitionTaxRate = 0.02
        registrationTaxRate = 0.02
      }
    } else if (carType === 'van') {
      // 승합차
      if (usage === 'personal') {
        if (vanSeats === '7-10') {
          acquisitionTaxRate = 0.02
          registrationTaxRate = 0.05
        } else {
          acquisitionTaxRate = 0.02
          registrationTaxRate = 0.03
        }
      } else {
        acquisitionTaxRate = 0.02
        registrationTaxRate = 0.02
      }
    } else if (carType === 'truck') {
      // 화물차
      if (usage === 'personal') {
        acquisitionTaxRate = 0.02
        registrationTaxRate = 0.03
      } else {
        acquisitionTaxRate = 0.02
        registrationTaxRate = 0.02
      }
    } else if (carType === 'motorcycle') {
      // 이륜차
      if (motorcycleSize === 'small') {
        acquisitionTaxRate = 0.02
        registrationTaxRate = 0
        licenseRegistrationTax = 0
      } else {
        if (usage === 'personal') {
          acquisitionTaxRate = 0.02
          registrationTaxRate = 0.03
          licenseRegistrationTax = 15000
        } else {
          acquisitionTaxRate = 0.02
          registrationTaxRate = 0.02
          licenseRegistrationTax = 15000
        }
      }
    }

    // 도시철도채권 (서울시 기준 6%, 실제 부담은 약 30%)
    if (region === 'seoul' && carType !== 'motorcycle') {
      railroadBondRate = 0.06 * 0.3 // 할인율 적용
    }

    // 감면 혜택 계산
    let acquisitionTaxBenefit = 0
    let registrationTaxBenefit = 0

    // 1. 경차 혜택 (최대 75만원)
    if (carType === 'compact') {
      const compactBenefit = Math.min(price * 0.05, 750000) // 5% 또는 최대 75만원
      acquisitionTaxBenefit = Math.max(acquisitionTaxBenefit, compactBenefit)
      appliedBenefits.push('경차 감면')
    }

    // 2. 전기차 혜택 (최대 140만원, 이륜차 제외)
    if (fuelType === 'electric' && carType !== 'motorcycle') {
      const electricBenefit = Math.min(price * 0.07, 1400000) // 7% 또는 최대 140만원
      acquisitionTaxBenefit = Math.max(acquisitionTaxBenefit, electricBenefit)
      appliedBenefits.push('전기차 감면')
    }

    // 3. 다자녀 혜택 (전기차와 중복 불가)
    if (isMultiChild && childCount >= 2 && !appliedBenefits.includes('전기차 감면')) {
      if (childCount === 2) {
        // 2자녀: 50% 감면 최대 70만원
        const multiChildBenefit = Math.min(price * acquisitionTaxRate * 0.5, 700000)
        acquisitionTaxBenefit = Math.max(acquisitionTaxBenefit, multiChildBenefit)
        appliedBenefits.push('2자녀 가정 감면')
      } else if (childCount >= 3) {
        // 3자녀 이상: 100% 감면 최대 140만원
        const multiChildBenefit = Math.min(price * acquisitionTaxRate, 1400000)
        acquisitionTaxBenefit = Math.max(acquisitionTaxBenefit, multiChildBenefit)
        appliedBenefits.push('3자녀 이상 가정 감면')
      }
    }

    // 4. 장애인/국가유공자 혜택 (100% 면제)
    if (isDisabled || isVeteran) {
      acquisitionTaxBenefit = price * acquisitionTaxRate
      registrationTaxBenefit = price * registrationTaxRate
      appliedBenefits.push(isDisabled ? '장애인 면제' : '국가유공자 면제')
    }

    // 세금 계산
    const baseAcquisitionTax = price * acquisitionTaxRate
    const baseRegistrationTax = price * registrationTaxRate
    const railroadBond = price * railroadBondRate

    const acquisitionTax = Math.max(0, baseAcquisitionTax - acquisitionTaxBenefit)
    const registrationTax = Math.max(0, baseRegistrationTax - registrationTaxBenefit)

    const totalTax = acquisitionTax + registrationTax + railroadBond + licenseRegistrationTax
    const totalCostWithTax = price + totalTax

    const calculationResult = {
      acquisitionTax,
      registrationTax,
      railroadBond,
      licenseRegistrationTax,
      totalTax,
      totalCostWithTax,
      appliedBenefits
    }

    setResult(calculationResult)
    setShowSaveButton(true)

    // 계산 기록은 저장 버튼을 눌렀을 때만 저장하도록 제거
  }

  useEffect(() => {
    if (carPrice) {
      calculateCarTax()
      updateURL({
        carPrice: carPrice.replace(/,/g, ''),
        carType,
        fuelType,
        displacement,
        isNew: isNew.toString(),
        region,
        usage,
        vanSeats,
        motorcycleSize,
        isMultiChild: isMultiChild.toString(),
        childCount: childCount.toString(),
        isDisabled: isDisabled.toString(),
        isVeteran: isVeteran.toString()
      })
    }
  }, [carPrice, carType, fuelType, displacement, isNew, region, usage, vanSeats, motorcycleSize, isMultiChild, childCount, isDisabled, isVeteran])

  // URL 파라미터에서 입력값 복원 (초기 로드시에만)
  useEffect(() => {
    const priceParam = searchParams.get('carPrice')
    if (!priceParam) return // URL 파라미터가 없으면 복원하지 않음
    
    const typeParam = searchParams.get('carType')
    const fuelParam = searchParams.get('fuelType')
    const dispParam = searchParams.get('displacement')
    const newParam = searchParams.get('isNew')
    const regionParam = searchParams.get('region')
    const usageParam = searchParams.get('usage')
    const seatsParam = searchParams.get('vanSeats')
    const sizeParam = searchParams.get('motorcycleSize')
    const multiChildParam = searchParams.get('isMultiChild')
    const childCountParam = searchParams.get('childCount')
    const disabledParam = searchParams.get('isDisabled')
    const veteranParam = searchParams.get('isVeteran')

    if (priceParam && /^\d+$/.test(priceParam)) {
      setCarPrice(new Intl.NumberFormat('ko-KR').format(Number(priceParam)))
    }
    if (typeParam && ['compact', 'passenger', 'van', 'truck', 'motorcycle'].includes(typeParam)) {
      setCarType(typeParam as CarType)
    }
    if (fuelParam && ['gasoline', 'diesel', 'lpg', 'electric', 'hybrid'].includes(fuelParam)) {
      setFuelType(fuelParam as FuelType)
    }
    if (dispParam && /^\d+$/.test(dispParam)) {
      setDisplacement(dispParam)
    }
    if (newParam) {
      setIsNew(newParam === 'true')
    }
    if (regionParam) {
      setRegion(regionParam)
    }
    if (usageParam && ['personal', 'business'].includes(usageParam)) {
      setUsage(usageParam as Usage)
    }
    if (seatsParam && ['7-10', '11+'].includes(seatsParam)) {
      setVanSeats(seatsParam as VanSeats)
    }
    if (sizeParam && ['small', 'large'].includes(sizeParam)) {
      setMotorcycleSize(sizeParam as MotorcycleSize)
    }
    if (multiChildParam) {
      setIsMultiChild(multiChildParam === 'true')
    }
    if (childCountParam && /^\d+$/.test(childCountParam)) {
      setChildCount(Number(childCountParam))
    }
    if (disabledParam) {
      setIsDisabled(disabledParam === 'true')
    }
    if (veteranParam) {
      setIsVeteran(veteranParam === 'true')
    }
  }, []) // 의존성 배열을 빈 배열로 변경하여 초기 로드시에만 실행

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(amount))
  }

  const updateURL = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== '0' && value !== 'false') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleShare = async () => {
    if (!result) return
    
    const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUrl)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = currentUrl
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          setIsCopied(true)
          setTimeout(() => setIsCopied(false), 2000)
        } catch (fallbackErr) {
          console.error('Fallback copy failed: ', fallbackErr)
        }
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleSaveCalculation = () => {
    if (!result) return
    
    const price = parseFloat(carPrice)
    const disp = parseFloat(displacement) || 0
    
    saveCalculation(
      {
        carPrice: price,
        carType,
        fuelType,
        displacement: disp,
        isNew,
        region,
        usage,
        vanSeats,
        motorcycleSize,
        isMultiChild,
        childCount,
        isDisabled,
        isVeteran
      },
      {
        acquisitionTax: result.acquisitionTax,
        registrationTax: result.registrationTax,
        railroadBond: result.railroadBond,
        licenseRegistrationTax: result.licenseRegistrationTax,
        totalTax: result.totalTax,
        appliedBenefits: result.appliedBenefits
      }
    )
    
    setShowSaveButton(false)
  }

  const getCarTypeLabel = (type: CarType) => {
    const labels = {
      compact: '경차',
      passenger: '승용차',
      truck: '화물차',
      van: '승합차',
      motorcycle: '이륜차',
      electric: '전기차'
    }
    return labels[type]
  }

  const getFuelTypeLabel = (type: FuelType) => {
    const labels = {
      gasoline: '휘발유',
      diesel: '경유',
      lpg: 'LPG',
      electric: '전기',
      hybrid: '하이브리드'
    }
    return labels[type]
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full text-white mb-4">
          <Receipt className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
          {t('description')}
        </p>
        
        {/* 계산 기록 */}
        <CalculationHistory
          histories={histories}
          isLoading={false}
          onLoadHistory={(historyId) => {
            const inputs = loadFromHistory(historyId)
            if (inputs) {
              setCarPrice(inputs.carPrice.toString())
              setCarType(inputs.carType || 'passenger')
              setFuelType(inputs.fuelType || 'gasoline')
              setDisplacement(inputs.displacement?.toString() || '')
              setIsNew(inputs.isNew ?? true)
              setRegion(inputs.region || 'seoul')
              setUsage(inputs.usage || 'personal')
              setVanSeats(inputs.vanSeats || '7-10')
              setMotorcycleSize(inputs.motorcycleSize || 'small')
              setIsMultiChild(inputs.isMultiChild || false)
              setChildCount(inputs.childCount || 0)
              setIsDisabled(inputs.isDisabled || false)
              setIsVeteran(inputs.isVeteran || false)
            }
          }}
          onRemoveHistory={removeHistory}
          onClearHistories={clearHistories}
          formatResult={(history: any) => {
            if (!history.inputs || !history.result) return '계산 정보 없음'
            const carPrice = history.inputs.carPrice || 0
            const totalTax = history.result.totalTax || 0
            return `차량가격: ${formatCurrency(carPrice)}원, 총 세금: ${formatCurrency(totalTax)}원`
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 입력 폼 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-green-600" />
            차량 정보 입력
          </h2>

          <div className="space-y-6">
            {/* 차량 가격 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Car className="w-4 h-4 inline mr-1" />
                차량 가격 (원)
              </label>
              <input
                type="text"
                value={carPrice}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '')
                  setCarPrice(value)
                }}
                placeholder="30000000"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
              {carPrice && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(parseFloat(carPrice))}원
                </p>
              )}
            </div>

            {/* 차종 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                차종
              </label>
              <select
                value={carType}
                onChange={(e) => setCarType(e.target.value as CarType)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              >
                <option value="compact">경차</option>
                <option value="passenger">승용차</option>
                <option value="van">승합차</option>
                <option value="truck">화물차</option>
                <option value="motorcycle">이륜차</option>
              </select>
            </div>

            {/* 용도 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                용도
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={usage === 'personal'}
                    onChange={() => setUsage('personal')}
                    className="mr-2"
                  />
                  비영업용
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={usage === 'business'}
                    onChange={() => setUsage('business')}
                    className="mr-2"
                  />
                  영업용
                </label>
              </div>
            </div>

            {/* 승합차 인승수 */}
            {carType === 'van' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  승합차 인승
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={vanSeats === '7-10'}
                      onChange={() => setVanSeats('7-10')}
                      className="mr-2"
                    />
                    7~10인승
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={vanSeats === '11+'}
                      onChange={() => setVanSeats('11+')}
                      className="mr-2"
                    />
                    11인승 이상
                  </label>
                </div>
              </div>
            )}

            {/* 이륜차 크기 */}
            {carType === 'motorcycle' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  이륜차 크기
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={motorcycleSize === 'small'}
                      onChange={() => setMotorcycleSize('small')}
                      className="mr-2"
                    />
                    125cc 이하
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={motorcycleSize === 'large'}
                      onChange={() => setMotorcycleSize('large')}
                      className="mr-2"
                    />
                    125cc 초과
                  </label>
                </div>
              </div>
            )}

            {/* 연료 타입 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                연료 타입
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelType)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              >
                <option value="gasoline">휘발유</option>
                <option value="diesel">경유</option>
                <option value="lpg">LPG</option>
                <option value="electric">전기</option>
                <option value="hybrid">하이브리드</option>
              </select>
            </div>

            {/* 배기량 */}
            {carType !== 'electric' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  배기량 (cc)
                </label>
                <input
                  type="number"
                  value={displacement}
                  onChange={(e) => setDisplacement(e.target.value)}
                  placeholder="2000"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
                />
              </div>
            )}

            {/* 신차/중고차 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                차량 상태
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isNew}
                    onChange={() => setIsNew(true)}
                    className="mr-2"
                  />
                  신차
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isNew}
                    onChange={() => setIsNew(false)}
                    className="mr-2"
                  />
                  중고차
                </label>
              </div>
            </div>

            {/* 지역 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                등록 지역
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              >
                <option value="seoul">서울특별시</option>
                <option value="busan">부산광역시</option>
                <option value="incheon">인천광역시</option>
                <option value="gyeonggi">경기도</option>
                <option value="other">기타 지역</option>
              </select>
            </div>

            {/* 감면 혜택 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                💰 감면 혜택 (해당사항 선택)
              </h3>
              
              {/* 다자녀 가정 */}
              <div className="mb-4">
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={isMultiChild}
                    onChange={(e) => setIsMultiChild(e.target.checked)}
                    className="mr-2"
                  />
                  다자녀 가정 혜택
                </label>
                {isMultiChild && (
                  <div className="ml-6 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={childCount === 2}
                        onChange={() => setChildCount(2)}
                        className="mr-2"
                      />
                      2자녀 (50% 감면, 최대 70만원)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={childCount >= 3}
                        onChange={() => setChildCount(3)}
                        className="mr-2"
                      />
                      3자녀 이상 (100% 감면, 최대 140만원)
                    </label>
                  </div>
                )}
              </div>

              {/* 장애인 */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isDisabled}
                    onChange={(e) => setIsDisabled(e.target.checked)}
                    className="mr-2"
                  />
                  장애인 (취득세/등록세 100% 면제)
                </label>
              </div>

              {/* 국가유공자 */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isVeteran}
                    onChange={(e) => setIsVeteran(e.target.checked)}
                    className="mr-2"
                  />
                  국가유공자 1~3급 (취득세/등록세 100% 면제)
                </label>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ⚠️ 전기차 혜택과 다자녀 혜택은 중복 적용되지 않습니다
              </div>
            </div>
          </div>
        </div>

        {/* 결과 */}
        <div className="space-y-6">
          {result && (
            <>
              {/* 주요 결과 */}
              <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl shadow-lg p-8 text-white">
                <h3 className="text-xl font-bold mb-6 flex items-center">
                  <Receipt className="w-6 h-6 mr-2" />
                  취등록세 계산 결과
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/20">
                    <span className="text-green-100">취득세</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(result.acquisitionTax)}원
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-white/20">
                    <span className="text-green-100">등록세</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(result.registrationTax)}원
                    </span>
                  </div>
                  
                  {result.railroadBond > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/20">
                      <span className="text-green-100">도시철도채권</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(result.railroadBond)}원
                      </span>
                    </div>
                  )}
                  
                  {result.licenseRegistrationTax > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-white/20">
                      <span className="text-green-100">등록면허세</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(result.licenseRegistrationTax)}원
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-3 mt-4 border-t border-white/20">
                    <span className="text-xl font-bold">총 세금</span>
                    <span className="text-2xl font-bold text-yellow-200">
                      {formatCurrency(result.totalTax)}원
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-green-100">차량가격 + 세금</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(result.totalCostWithTax)}원
                    </span>
                  </div>

                  {/* 적용된 감면 혜택 */}
                  {result.appliedBenefits.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2">🎉 적용된 감면 혜택</h4>
                      <div className="space-y-1">
                        {result.appliedBenefits.map((benefit, index) => (
                          <div key={index} className="text-sm text-blue-100">
                            • {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 공유/저장 버튼 */}
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={handleShare}
                      className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>결과 공유</span>
                        </>
                      )}
                    </button>
                    
                    {showSaveButton && (
                      <button
                        onClick={handleSaveCalculation}
                        className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-white transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        <span>저장</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 차량 정보 요약 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  차량 정보 요약
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">차량 가격</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(carPrice))}원
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">차종</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {getCarTypeLabel(carType)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">연료</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {getFuelTypeLabel(fuelType)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">상태</span>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {isNew ? '신차' : '중고차'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 환경차 혜택 안내 */}
              {(fuelType === 'electric' || fuelType === 'hybrid') && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      환경차 세제 혜택 적용
                    </h4>
                  </div>
                  <p className="text-blue-800 dark:text-blue-200">
                    {fuelType === 'electric' ? '전기차' : '하이브리드차'}로 취득세·등록세 50% 감면이 적용되었습니다.
                  </p>
                </div>
              )}
            </>
          )}

          {!result && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 text-center">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                차량 정보를 입력하면<br />
                취등록세 계산 결과가 표시됩니다
              </p>
            </div>
          )}
        </div>
      </div>


      {/* 취등록세 가이드 */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          💡 취등록세 안내
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              주요 세금 종류
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• <strong>취득세</strong>: 모든 차량 2%</li>
              <li>• <strong>등록세</strong>: 비영업용 승용차 5%, 화물차 3% 등</li>
              <li>• <strong>도시철도채권</strong>: 서울시 6% (실제 부담 약 30%)</li>
              <li>• <strong>등록면허세</strong>: 이륜차 125cc 초과 시 15,000원</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              절세 혜택 (2025년 기준)
            </h4>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>• <strong>경차</strong>: 취득세 최대 75만원 감면</li>
              <li>• <strong>전기차</strong>: 취득세 최대 140만원 감면</li>
              <li>• <strong>하이브리드</strong>: ❌ 2024.12.31부로 감면 종료</li>
              <li>• <strong>다자녀</strong>: 2자녀 50%(최대 70만원), 3자녀+ 100%(최대 140만원)</li>
              <li>• <strong>장애인/국가유공자</strong>: 취득세·등록세 100% 면제</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}