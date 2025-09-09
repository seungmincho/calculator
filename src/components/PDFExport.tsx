'use client'

import { useState } from 'react'
import { Download, FileText, Loader } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface PDFExportProps {
  data: any
  calculatorType: string
  title: string
  className?: string
}

export default function PDFExport({ data, calculatorType, title, className = '' }: PDFExportProps) {
  const t = useTranslations()
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    if (!data || isGenerating) return

    setIsGenerating(true)
    
    try {
      // Dynamic import to avoid SSR issues
      const { jsPDF } = await import('jspdf')
      
      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Set font (Korean support would require additional fonts)
      pdf.setFont('helvetica', 'normal')
      
      // Header
      pdf.setFontSize(20)
      pdf.text(title, 20, 25)
      
      // Current date
      pdf.setFontSize(12)
      const now = new Date()
      const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      pdf.text(`생성일: ${dateStr}`, 20, 35)
      
      let yPosition = 50
      
      // Generate content based on calculator type
      switch (calculatorType) {
        case 'salary':
          yPosition = addSalaryContent(pdf, data, yPosition)
          break
        case 'lotto':
          yPosition = addLottoContent(pdf, data, yPosition)
          break
        case 'loan':
          yPosition = addLoanContent(pdf, data, yPosition)
          break
        case 'real-estate':
          yPosition = addRealEstateContent(pdf, data, yPosition)
          break
        default:
          yPosition = addGenericContent(pdf, data, yPosition)
      }
      
      // Footer
      pdf.setFontSize(10)
      pdf.text('툴허브 (toolhub.ai.kr)에서 생성됨', 20, 280)
      pdf.text('이 계산 결과는 참고용이며, 실제 적용시 전문가 상담을 권장합니다.', 20, 285)
      
      // Download the PDF
      const fileName = `${calculatorType}_결과_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}.pdf`
      pdf.save(fileName)
      
    } catch (error) {
      console.error('PDF 생성 실패:', error)
      alert('PDF 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  const addSalaryContent = (pdf: any, data: any, startY: number) => {
    let yPos = startY
    
    pdf.setFontSize(16)
    pdf.text('연봉 계산 결과', 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    const items = [
      { label: '총 연봉', value: `${formatNumber(data.gross)}원` },
      { label: '세전 월급', value: `${formatNumber(data.monthlyGross)}원` },
      { label: '실수령액 (연)', value: `${formatNumber(data.netAnnual)}원` },
      { label: '실수령액 (월)', value: `${formatNumber(data.netMonthly)}원` },
      { label: '국민연금', value: `${formatNumber(data.nationalPension)}원` },
      { label: '건강보험', value: `${formatNumber(data.healthInsurance)}원` },
      { label: '장기요양보험', value: `${formatNumber(data.longTermCare)}원` },
      { label: '고용보험', value: `${formatNumber(data.employmentInsurance)}원` },
      { label: '소득세', value: `${formatNumber(data.incomeTax)}원` },
      { label: '지방소득세', value: `${formatNumber(data.localTax)}원` }
    ]
    
    items.forEach(item => {
      pdf.text(`${item.label}: ${item.value}`, 20, yPos)
      yPos += 8
    })
    
    return yPos + 10
  }

  const addLottoContent = (pdf: any, data: any, startY: number) => {
    let yPos = startY
    
    pdf.setFontSize(16)
    pdf.text('로또번호 생성 결과', 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((set, index) => {
        pdf.text(`${index + 1}게임: ${set.numbers.join(', ')}`, 20, yPos)
        yPos += 8
      })
    } else if (data.numbers) {
      pdf.text(`생성번호: ${data.numbers.join(', ')}`, 20, yPos)
      yPos += 8
      if (data.bonusNumber) {
        pdf.text(`보너스번호: ${data.bonusNumber}`, 20, yPos)
        yPos += 8
      }
    }
    
    return yPos + 10
  }

  const addLoanContent = (pdf: any, data: any, startY: number) => {
    let yPos = startY
    
    pdf.setFontSize(16)
    pdf.text('대출 계산 결과', 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    const items = [
      { label: '대출금액', value: `${formatNumber(data.loanAmount)}원` },
      { label: '연이자율', value: `${data.interestRate}%` },
      { label: '대출기간', value: `${data.loanTerm}년` },
      { label: '월 상환액', value: `${formatNumber(data.monthlyPayment)}원` },
      { label: '총 상환액', value: `${formatNumber(data.totalPayment)}원` },
      { label: '총 이자액', value: `${formatNumber(data.totalInterest)}원` }
    ]
    
    items.forEach(item => {
      pdf.text(`${item.label}: ${item.value}`, 20, yPos)
      yPos += 8
    })
    
    return yPos + 10
  }

  const addRealEstateContent = (pdf: any, data: any, startY: number) => {
    let yPos = startY
    
    pdf.setFontSize(16)
    pdf.text('부동산 계산 결과', 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    // Generic content handling for real estate data
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        pdf.text(`${key}: ${formatNumber(value)}원`, 20, yPos)
        yPos += 8
      } else if (typeof value === 'string') {
        pdf.text(`${key}: ${value}`, 20, yPos)
        yPos += 8
      }
    })
    
    return yPos + 10
  }

  const addGenericContent = (pdf: any, data: any, startY: number) => {
    let yPos = startY
    
    pdf.setFontSize(16)
    pdf.text('계산 결과', 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    
    // Convert data to readable format
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        pdf.text(`${key}: ${formatNumber(value)}`, 20, yPos)
      } else if (typeof value === 'string') {
        pdf.text(`${key}: ${value}`, 20, yPos)
      } else if (typeof value === 'boolean') {
        pdf.text(`${key}: ${value ? '예' : '아니오'}`, 20, yPos)
      } else {
        pdf.text(`${key}: ${JSON.stringify(value)}`, 20, yPos)
      }
      yPos += 8
      
      // Page break if needed
      if (yPos > 270) {
        pdf.addPage()
        yPos = 20
      }
    })
    
    return yPos + 10
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString('ko-KR')
  }

  return (
    <button
      onClick={generatePDF}
      disabled={!data || isGenerating}
      className={`inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${className}`}
    >
      {isGenerating ? (
        <Loader className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {isGenerating ? t('pdf.generating') || 'PDF 생성 중...' : t('pdf.download') || 'PDF 다운로드'}
    </button>
  )
}