'use client'

import { useState } from 'react'
import { Download, FileText, Loader } from 'lucide-react'
import { useTranslations } from '@/lib/i18n/shared'

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
      pdf.text(t('pdf.createdAt', { date: dateStr }), 20, 35)
      
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
      pdf.text(t('pdf.generatedBy'), 20, 280)
      pdf.text(t('pdf.disclaimer'), 20, 285)
      
      // Download the PDF
      const fileName = `${calculatorType}_${t('pdf.fileSuffix')}_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}.pdf`
      pdf.save(fileName)
      
    } catch (error) {
      console.error('PDF 생성 실패:', error)
      alert(t('pdf.error'))
    } finally {
      setIsGenerating(false)
    }
  }

  const addSalaryContent = (pdf: any, data: any, startY: number) => {
    let yPos = startY
    
    pdf.setFontSize(16)
    pdf.text(t('pdf.salary.title'), 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    const items = [
      { label: t('pdf.salary.gross'), value: won(data.gross) },
      { label: t('pdf.salary.monthlyGross'), value: won(data.monthlyGross) },
      { label: t('pdf.salary.netAnnual'), value: won(data.netAnnual) },
      { label: t('pdf.salary.netMonthly'), value: won(data.netMonthly) },
      { label: t('pdf.salary.nationalPension'), value: won(data.nationalPension) },
      { label: t('pdf.salary.healthInsurance'), value: won(data.healthInsurance) },
      { label: t('pdf.salary.longTermCare'), value: won(data.longTermCare) },
      { label: t('pdf.salary.employmentInsurance'), value: won(data.employmentInsurance) },
      { label: t('pdf.salary.incomeTax'), value: won(data.incomeTax) },
      { label: t('pdf.salary.localTax'), value: won(data.localTax) }
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
    pdf.text(t('pdf.lotto.title'), 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((set, index) => {
        pdf.text(t('pdf.lotto.game', { n: index + 1, numbers: set.numbers.join(', ') }), 20, yPos)
        yPos += 8
      })
    } else if (data.numbers) {
      pdf.text(t('pdf.lotto.numbers', { numbers: data.numbers.join(', ') }), 20, yPos)
      yPos += 8
      if (data.bonusNumber) {
        pdf.text(t('pdf.lotto.bonus', { n: data.bonusNumber }), 20, yPos)
        yPos += 8
      }
    }
    
    return yPos + 10
  }

  const addLoanContent = (pdf: any, data: any, startY: number) => {
    let yPos = startY
    
    pdf.setFontSize(16)
    pdf.text(t('pdf.loan.title'), 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    const items = [
      { label: t('pdf.loan.loanAmount'), value: won(data.loanAmount) },
      { label: t('pdf.loan.interestRate'), value: `${data.interestRate}%` },
      { label: t('pdf.loan.loanTerm'), value: t('pdf.years', { value: data.loanTerm }) },
      { label: t('pdf.loan.monthlyPayment'), value: won(data.monthlyPayment) },
      { label: t('pdf.loan.totalPayment'), value: won(data.totalPayment) },
      { label: t('pdf.loan.totalInterest'), value: won(data.totalInterest) }
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
    pdf.text(t('pdf.realEstate.title'), 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    // Generic content handling for real estate data
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        pdf.text(`${key}: ${won(value)}`, 20, yPos)
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
    pdf.text(t('pdf.generic.title'), 20, yPos)
    yPos += 15
    
    pdf.setFontSize(12)
    
    // Convert data to readable format
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        pdf.text(`${key}: ${formatNumber(value)}`, 20, yPos)
      } else if (typeof value === 'string') {
        pdf.text(`${key}: ${value}`, 20, yPos)
      } else if (typeof value === 'boolean') {
        pdf.text(`${key}: ${value ? t('pdf.yes') : t('pdf.no')}`, 20, yPos)
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

  const won = (num: number): string => t('pdf.won', { value: formatNumber(num) })

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
      {isGenerating ? t('pdf.generating') : t('pdf.download')}
    </button>
  )
}