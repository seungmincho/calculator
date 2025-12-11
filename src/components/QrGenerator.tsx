'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import QRCode from 'qrcode'
import { 
  QrCode, 
  Download, 
  Copy, 
  Check,
  Upload,
  X,
  Settings,
  Palette,
  Image as ImageIcon,
  Smartphone,
  Globe,
  User,
  Wifi,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react'

interface QrSettings {
  size: number
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H'
  foregroundColor: string
  backgroundColor: string
  logoSize: number
  logoOpacity: number
  borderRadius: number
}

interface QrData {
  type: 'text' | 'url' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard'
  content: string
  smsMessage?: string
  wifi?: {
    ssid: string
    password: string
    security: 'WPA' | 'WEP' | 'nopass'
    hidden: boolean
  }
  vcard?: {
    name: string
    phone: string
    email: string
    organization: string
    url: string
  }
}

const QrGenerator = () => {
  const t = useTranslations('qrGenerator')
  const tc = useTranslations('common')
  
  const [qrData, setQrData] = useState<QrData>({
    type: 'text',
    content: ''
  })
  const [settings, setSettings] = useState<QrSettings>({
    size: 300,
    errorCorrectionLevel: 'M',
    foregroundColor: '#000000',
    backgroundColor: '#ffffff',
    logoSize: 20,
    logoOpacity: 100,
    borderRadius: 0
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [qrCode, setQrCode] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate QR data string based on type
  const generateQrString = useCallback((data: QrData): string => {
    switch (data.type) {
      case 'url':
        return data.content.startsWith('http') ? data.content : `https://${data.content}`
      case 'email':
        return `mailto:${data.content}`
      case 'phone':
        return `tel:${data.content}`
      case 'sms':
        if (data.smsMessage && data.smsMessage.trim()) {
          return `sms:${data.content}?body=${encodeURIComponent(data.smsMessage)}`
        }
        return `sms:${data.content}`
      case 'wifi':
        if (data.wifi && data.wifi.ssid) {
          const { ssid, password, security, hidden } = data.wifi
          return `WIFI:T:${security};S:${ssid};P:${password || ''};H:${hidden ? 'true' : 'false'};;`
        }
        return data.content
      case 'vcard':
        if (data.vcard && data.vcard.name) {
          const { name, phone, email, organization, url } = data.vcard
          return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}${organization ? `\nORG:${organization}` : ''}${phone ? `\nTEL:${phone}` : ''}${email ? `\nEMAIL:${email}` : ''}${url ? `\nURL:${url}` : ''}\nEND:VCARD`
        }
        return data.content
      default:
        return data.content
    }
  }, [])

  // Draw QR code on canvas with logo
  const drawQrCode = useCallback(async () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { size, foregroundColor, backgroundColor, logoSize, logoOpacity, errorCorrectionLevel } = settings
    canvas.width = size
    canvas.height = size

    try {
      // Generate QR string
      const qrString = generateQrString(qrData)
      
      // Generate QR code as data URL using qrcode library
      const qrDataUrl = await QRCode.toDataURL(qrString, {
        width: size,
        margin: 1,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel: errorCorrectionLevel,
      })

      // Create image from QR data URL
      const qrImg = new Image()
      qrImg.onload = () => {
        // Clear canvas
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, size, size)
        
        // Draw QR code
        ctx.drawImage(qrImg, 0, 0, size, size)

        // Draw logo if present
        if (logoFile && logoPreview) {
          const logoImg = new Image()
          logoImg.onload = () => {
            const logoSizePixels = (logoSize / 100) * size
            const logoX = (size - logoSizePixels) / 2
            const logoY = (size - logoSizePixels) / 2
            
            // Create white background for logo with padding
            const padding = logoSizePixels * 0.1
            ctx.globalAlpha = 1
            ctx.fillStyle = backgroundColor
            ctx.fillRect(
              logoX - padding, 
              logoY - padding, 
              logoSizePixels + padding * 2, 
              logoSizePixels + padding * 2
            )
            
            // Draw logo
            ctx.globalAlpha = logoOpacity / 100
            ctx.drawImage(logoImg, logoX, logoY, logoSizePixels, logoSizePixels)
            ctx.globalAlpha = 1
            
            // Convert to data URL
            setQrCode(canvas.toDataURL('image/png'))
          }
          logoImg.src = logoPreview
        } else {
          setQrCode(canvas.toDataURL('image/png'))
        }
      }
      qrImg.src = qrDataUrl

    } catch (error) {
      console.error('Error generating QR code:', error)
      // Fallback: show error message on canvas
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, size, size)
      ctx.fillStyle = foregroundColor
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('QR 생성 오류', size / 2, size / 2)
    }
  }, [qrData, settings, logoFile, logoPreview, generateQrString])

  // Generate QR code
  const generateQr = useCallback(async () => {
    // Check if required fields are filled based on type
    const hasRequiredData = () => {
      switch (qrData.type) {
        case 'wifi':
          return qrData.wifi?.ssid?.trim()
        case 'vcard':
          return qrData.vcard?.name?.trim()
        case 'sms':
        case 'text':
        case 'url':
        case 'email':
        case 'phone':
        default:
          return qrData.content.trim()
      }
    }
    
    if (!hasRequiredData()) return
    
    setIsGenerating(true)
    
    try {
      await drawQrCode()
    } catch (error) {
      console.error('QR generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [qrData, drawQrCode])

  // Handle logo upload
  const handleLogoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  // Remove logo
  const removeLogo = useCallback(() => {
    setLogoFile(null)
    setLogoPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Download QR code
  const downloadQr = useCallback(() => {
    if (!qrCode) return
    
    const link = document.createElement('a')
    link.download = `qr-code-${Date.now()}.png`
    link.href = qrCode
    link.click()
  }, [qrCode])

  // Copy QR code to clipboard as image
  const copyQrToClipboard = useCallback(async () => {
    if (!qrCode || !canvasRef.current) return
    
    try {
      // Method 1: Try copying as image blob (modern browsers)
      if (navigator.clipboard && navigator.clipboard.write) {
        // Convert canvas to blob
        canvasRef.current.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ])
              setIsCopied(true)
              setTimeout(() => setIsCopied(false), 2000)
            } catch (error) {
              console.error('Failed to copy image to clipboard:', error)
              // Fallback to data URL copy
              fallbackCopyAsText()
            }
          }
        }, 'image/png')
      } else {
        // Fallback for older browsers
        fallbackCopyAsText()
      }
    } catch (error) {
      console.error('Failed to copy QR code:', error)
      fallbackCopyAsText()
    }
    
    // Fallback function to copy as text
    function fallbackCopyAsText() {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(qrCode)
        } else {
          // Legacy fallback
          const textArea = document.createElement('textarea')
          textArea.value = qrCode
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
        }
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      } catch (error) {
        console.error('Fallback copy failed:', error)
      }
    }
  }, [qrCode])

  // Auto-generate QR code when content changes
  useEffect(() => {
    const hasRequiredData = () => {
      switch (qrData.type) {
        case 'wifi':
          return qrData.wifi?.ssid?.trim()
        case 'vcard':
          return qrData.vcard?.name?.trim()
        case 'sms':
        case 'text':
        case 'url':
        case 'email':
        case 'phone':
        default:
          return qrData.content.trim()
      }
    }
    
    if (hasRequiredData()) {
      const timeoutId = setTimeout(generateQr, 300)
      return () => clearTimeout(timeoutId)
    }
  }, [qrData, settings, logoPreview, generateQr])

  // QR data type configurations
  const dataTypes = [
    { type: 'text', icon: MessageSquare, label: t('types.text') },
    { type: 'url', icon: Globe, label: t('types.url') },
    { type: 'email', icon: Mail, label: t('types.email') },
    { type: 'phone', icon: Phone, label: t('types.phone') },
    { type: 'sms', icon: Smartphone, label: t('types.sms') },
    { type: 'wifi', icon: Wifi, label: t('types.wifi') },
    { type: 'vcard', icon: User, label: t('types.vcard') }
  ] as const

  // Preset sizes
  const presetSizes = [
    { size: 200, label: t('sizes.small') },
    { size: 300, label: t('sizes.medium') },
    { size: 400, label: t('sizes.large') },
    { size: 500, label: t('sizes.xlarge') }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* QR Data Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <QrCode className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('input.title')}
              </h2>
            </div>

            {/* Data Type Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('input.dataType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {dataTypes.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setQrData({ ...qrData, type: type as any })}
                    className={`flex items-center space-x-2 p-2 text-sm rounded border transition-colors ${
                      qrData.type === type
                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Input */}
            <div className="space-y-3 mt-4">
              {qrData.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.text')}
                  </label>
                  <textarea
                    value={qrData.content}
                    onChange={(e) => setQrData({ ...qrData, content: e.target.value })}
                    placeholder={t('input.textPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}

              {qrData.type === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.url')}
                  </label>
                  <input
                    type="url"
                    value={qrData.content}
                    onChange={(e) => setQrData({ ...qrData, content: e.target.value })}
                    placeholder={t('input.urlPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}

              {qrData.type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.email')}
                  </label>
                  <input
                    type="email"
                    value={qrData.content}
                    onChange={(e) => setQrData({ ...qrData, content: e.target.value })}
                    placeholder={t('input.emailPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}

              {qrData.type === 'phone' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('input.phone')}
                  </label>
                  <input
                    type="tel"
                    value={qrData.content}
                    onChange={(e) => setQrData({ ...qrData, content: e.target.value })}
                    placeholder={t('input.phonePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}

              {qrData.type === 'sms' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.smsPhone')}
                    </label>
                    <input
                      type="tel"
                      value={qrData.content}
                      onChange={(e) => setQrData({ ...qrData, content: e.target.value })}
                      placeholder={t('input.smsPhonePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.smsMessage')} ({t('input.optional')})
                    </label>
                    <textarea
                      value={qrData.smsMessage || ''}
                      onChange={(e) => setQrData({ ...qrData, smsMessage: e.target.value })}
                      placeholder={t('input.smsMessagePlaceholder')}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {qrData.type === 'wifi' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.wifiSsid')}
                    </label>
                    <input
                      type="text"
                      value={qrData.wifi?.ssid || ''}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        wifi: { ...qrData.wifi, ssid: e.target.value } as any,
                        content: 'wifi'
                      })}
                      placeholder={t('input.wifiSsidPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.wifiPassword')}
                    </label>
                    <input
                      type="password"
                      value={qrData.wifi?.password || ''}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        wifi: { ...qrData.wifi, password: e.target.value } as any,
                        content: 'wifi'
                      })}
                      placeholder={t('input.wifiPasswordPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.wifiSecurity')}
                    </label>
                    <select
                      value={qrData.wifi?.security || 'WPA'}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        wifi: { ...qrData.wifi, security: e.target.value as 'WPA' | 'WEP' | 'nopass' } as any,
                        content: 'wifi'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">{t('input.wifiNoPassword')}</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="wifiHidden"
                      checked={qrData.wifi?.hidden || false}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        wifi: { ...qrData.wifi, hidden: e.target.checked } as any,
                        content: 'wifi'
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="wifiHidden" className="text-sm text-gray-700 dark:text-gray-300">
                      {t('input.wifiHidden')}
                    </label>
                  </div>
                </div>
              )}

              {qrData.type === 'vcard' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.vcardName')}
                    </label>
                    <input
                      type="text"
                      value={qrData.vcard?.name || ''}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        vcard: { ...qrData.vcard, name: e.target.value } as any,
                        content: 'vcard'
                      })}
                      placeholder={t('input.vcardNamePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.vcardPhone')} ({t('input.optional')})
                    </label>
                    <input
                      type="tel"
                      value={qrData.vcard?.phone || ''}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        vcard: { ...qrData.vcard, phone: e.target.value } as any,
                        content: 'vcard'
                      })}
                      placeholder={t('input.vcardPhonePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.vcardEmail')} ({t('input.optional')})
                    </label>
                    <input
                      type="email"
                      value={qrData.vcard?.email || ''}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        vcard: { ...qrData.vcard, email: e.target.value } as any,
                        content: 'vcard'
                      })}
                      placeholder={t('input.vcardEmailPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.vcardOrganization')} ({t('input.optional')})
                    </label>
                    <input
                      type="text"
                      value={qrData.vcard?.organization || ''}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        vcard: { ...qrData.vcard, organization: e.target.value } as any,
                        content: 'vcard'
                      })}
                      placeholder={t('input.vcardOrganizationPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('input.vcardUrl')} ({t('input.optional')})
                    </label>
                    <input
                      type="url"
                      value={qrData.vcard?.url || ''}
                      onChange={(e) => setQrData({ 
                        ...qrData, 
                        vcard: { ...qrData.vcard, url: e.target.value } as any,
                        content: 'vcard'
                      })}
                      placeholder={t('input.vcardUrlPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('logo.title')}
              </h2>
            </div>

            <div className="space-y-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 object-contain mx-auto rounded border"
                  />
                  <button
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('logo.upload')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {t('logo.supportedFormats')}
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {logoPreview && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('logo.size')}: {settings.logoSize}%
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="40"
                      value={settings.logoSize}
                      onChange={(e) => setSettings({ ...settings, logoSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('logo.opacity')}: {settings.logoOpacity}%
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={settings.logoOpacity}
                      onChange={(e) => setSettings({ ...settings, logoOpacity: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Style Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Palette className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('style.title')}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('style.size')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presetSizes.map(({ size, label }) => (
                    <button
                      key={size}
                      onClick={() => setSettings({ ...settings, size })}
                      className={`p-2 text-sm rounded border transition-colors ${
                        settings.size === size
                          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('style.foregroundColor')}
                  </label>
                  <input
                    type="color"
                    value={settings.foregroundColor}
                    onChange={(e) => setSettings({ ...settings, foregroundColor: e.target.value })}
                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('style.backgroundColor')}
                  </label>
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* Error Correction Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('style.errorCorrection')}
                </label>
                <select
                  value={settings.errorCorrectionLevel}
                  onChange={(e) => setSettings({ ...settings, errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="L">{t('style.errorLevels.low')} (L)</option>
                  <option value="M">{t('style.errorLevels.medium')} (M)</option>
                  <option value="Q">{t('style.errorLevels.high')} (Q)</option>
                  <option value="H">{t('style.errorLevels.highest')} (H)</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('style.errorCorrectionHint')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('result.title')}
              </h2>
              {qrCode && (
                <div className="flex space-x-2">
                  <button
                    onClick={copyQrToClipboard}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isCopied 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{isCopied ? t('result.copiedImage') : t('result.copyImage')}</span>
                  </button>
                  <button
                    onClick={downloadQr}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{tc('export')}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              {qrCode ? (
                <div className="text-center">
                  <img
                    src={qrCode}
                    alt="Generated QR Code"
                    className="mx-auto shadow-lg rounded-lg"
                    style={{ maxWidth: `${settings.size}px` }}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    {t('result.scanHint')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('placeholder')}
                  </p>
                </div>
              )}
            </div>

            {/* Hidden canvas for QR generation */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default QrGenerator