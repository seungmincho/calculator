'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Shield, 
  Key, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  Check,
  Info,
  Upload,
  Download,
  Clock,
  User,
  Calendar,
  AlertTriangle
} from 'lucide-react'

interface JwtParts {
  header: any
  payload: any
  signature: string
  headerRaw: string
  payloadRaw: string
}

interface TokenValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

const JwtDecoder = () => {
  const t = useTranslations('jwtDecoder')
  const tc = useTranslations('common')
  const [jwtToken, setJwtToken] = useState('')
  const [decodedParts, setDecodedParts] = useState<JwtParts | null>(null)
  const [validation, setValidation] = useState<TokenValidation>({ isValid: false, errors: [], warnings: [] })
  const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({})

  // Base64 URL decode function with proper UTF-8 support
  const base64UrlDecode = useCallback((input: string): string => {
    try {
      // Add padding if needed
      let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) {
        base64 += '='
      }
      
      // Decode Base64 and then properly decode UTF-8
      const decoded = atob(base64)
      // Use TextDecoder for proper UTF-8 decoding
      const bytes = new Uint8Array(decoded.length)
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i)
      }
      return new TextDecoder('utf-8').decode(bytes)
    } catch (error) {
      throw new Error('Invalid Base64 encoding')
    }
  }, [])

  // JWT validation function
  const validateJwt = useCallback((token: string): TokenValidation => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!token) {
      errors.push(t('validation.emptyToken'))
      return { isValid: false, errors, warnings }
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      errors.push(t('validation.invalidFormat'))
      return { isValid: false, errors, warnings }
    }

    try {
      // Validate header
      const headerJson = base64UrlDecode(parts[0])
      const header = JSON.parse(headerJson)
      
      if (!header.alg) {
        warnings.push(t('validation.missingAlgorithm'))
      }
      
      if (!header.typ || header.typ !== 'JWT') {
        warnings.push(t('validation.invalidType'))
      }

      // Validate payload
      const payloadJson = base64UrlDecode(parts[1])
      const payload = JSON.parse(payloadJson)

      // Check expiration
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000)
        const now = new Date()
        if (expDate < now) {
          warnings.push(t('validation.tokenExpired', { date: expDate.toLocaleString() }))
        }
      }

      // Check not before
      if (payload.nbf) {
        const nbfDate = new Date(payload.nbf * 1000)
        const now = new Date()
        if (nbfDate > now) {
          warnings.push(t('validation.tokenNotYetValid', { date: nbfDate.toLocaleString() }))
        }
      }

      // Check issued at
      if (payload.iat) {
        const iatDate = new Date(payload.iat * 1000)
        const now = new Date()
        if (iatDate > now) {
          warnings.push(t('validation.issuedInFuture'))
        }
      }

    } catch (error) {
      errors.push(t('validation.invalidJson'))
      return { isValid: false, errors, warnings }
    }

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings 
    }
  }, [base64UrlDecode, t])

  // Decode JWT function
  const decodeJwt = useCallback((token: string): JwtParts | null => {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const headerRaw = base64UrlDecode(parts[0])
      const payloadRaw = base64UrlDecode(parts[1])
      
      const header = JSON.parse(headerRaw)
      const payload = JSON.parse(payloadRaw)
      const signature = parts[2]

      return {
        header,
        payload,
        signature,
        headerRaw,
        payloadRaw
      }
    } catch (error) {
      return null
    }
  }, [base64UrlDecode])

  // Handle token input change
  const handleTokenChange = useCallback((value: string) => {
    setJwtToken(value)
    
    if (value.trim()) {
      const validation = validateJwt(value.trim())
      setValidation(validation)
      
      if (validation.isValid || validation.errors.length === 0) {
        const decoded = decodeJwt(value.trim())
        setDecodedParts(decoded)
      } else {
        setDecodedParts(null)
      }
    } else {
      setDecodedParts(null)
      setValidation({ isValid: false, errors: [], warnings: [] })
    }
  }, [validateJwt, decodeJwt])

  // Copy to clipboard function
  const handleCopy = useCallback(async (text: string, key: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setIsCopied(prev => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setIsCopied(prev => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [])

  // Format timestamp function
  const formatTimestamp = useCallback((timestamp: number): string => {
    try {
      const date = new Date(timestamp * 1000)
      return date.toLocaleString()
    } catch {
      return 'Invalid date'
    }
  }, [])

  // Sample JWT tokens
  const sampleTokens = useMemo(() => [
    {
      name: t('samples.basic'),
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    },
    {
      name: t('samples.withExp'),
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MDAwMDAwMDB9.Rq8IxqeX7eA6GgYxlcHdPFLBKRWQO8sO9lQrE6_D7Fg'
    }
  ], [t])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="text-left">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">{t('security.title')}</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">{t('security.description')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white flex items-center">
            <Key className="w-6 h-6 mr-2" />
            {t('input.title')}
          </h2>

          {/* Sample Tokens */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('samples.title')}
            </label>
            <div className="flex flex-wrap gap-2">
              {sampleTokens.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => handleTokenChange(sample.token)}
                  className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* JWT Token Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('input.tokenLabel')}
            </label>
            <textarea
              value={jwtToken}
              onChange={(e) => handleTokenChange(e.target.value)}
              placeholder={t('input.tokenPlaceholder')}
              className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-700 font-mono text-sm"
            />
          </div>

          {/* Validation Status */}
          {jwtToken && (
            <div className="space-y-2">
              {validation.isValid ? (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">{t('validation.valid')}</span>
                </div>
              ) : validation.errors.length > 0 ? (
                <div className="space-y-1">
                  {validation.errors.map((error, index) => (
                    <div key={index} className="flex items-center text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <span className="text-sm">{error}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {validation.warnings.length > 0 && (
                <div className="space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <div key={index} className="flex items-center text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="text-sm">{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Decoded Results */}
        {decodedParts && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  {t('result.header')}
                </h3>
                <button
                  onClick={() => handleCopy(JSON.stringify(decodedParts.header, null, 2), 'header')}
                  className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                >
                  {isCopied.header ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied.header ? tc('copied') : t('result.copy')}</span>
                </button>
              </div>
              <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{JSON.stringify(decodedParts.header, null, 2)}</code>
              </pre>
              
              {/* Header Info */}
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{t('result.algorithm')}:</span> {decodedParts.header.alg || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{t('result.type')}:</span> {decodedParts.header.typ || 'N/A'}
                </div>
              </div>
            </div>

            {/* Payload */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  {t('result.payload')}
                </h3>
                <button
                  onClick={() => handleCopy(JSON.stringify(decodedParts.payload, null, 2), 'payload')}
                  className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                >
                  {isCopied.payload ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied.payload ? tc('copied') : t('result.copy')}</span>
                </button>
              </div>
              <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{JSON.stringify(decodedParts.payload, null, 2)}</code>
              </pre>

              {/* Payload Info */}
              <div className="mt-4 space-y-2">
                {decodedParts.payload.sub && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    <span className="font-medium">{t('result.subject')}:</span> {decodedParts.payload.sub}
                  </div>
                )}
                {decodedParts.payload.iat && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="font-medium">{t('result.issuedAt')}:</span> {formatTimestamp(decodedParts.payload.iat)}
                  </div>
                )}
                {decodedParts.payload.exp && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="font-medium">{t('result.expiresAt')}:</span> {formatTimestamp(decodedParts.payload.exp)}
                  </div>
                )}
                {decodedParts.payload.iss && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{t('result.issuer')}:</span> {decodedParts.payload.iss}
                  </div>
                )}
                {decodedParts.payload.aud && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{t('result.audience')}:</span> {Array.isArray(decodedParts.payload.aud) ? decodedParts.payload.aud.join(', ') : decodedParts.payload.aud}
                  </div>
                )}
              </div>
            </div>

            {/* Signature */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  {t('result.signature')}
                </h3>
                <button
                  onClick={() => handleCopy(decodedParts.signature, 'signature')}
                  className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                >
                  {isCopied.signature ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied.signature ? tc('copied') : t('result.copy')}</span>
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <code className="text-sm break-all">{decodedParts.signature}</code>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">{t('result.signatureNote')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guide Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white text-center">{t('guide.title')}</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('guide.about.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{t('guide.about.description')}</p>
              <ul className="text-sm text-gray-500 dark:text-gray-500 space-y-1 text-left">
                {[0, 1, 2].map((index) => (
                  <li key={index}>• {t(`guide.about.points.${index}`)}</li>
                ))}
              </ul>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('guide.structure.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{t('guide.structure.description')}</p>
              <ul className="text-sm text-gray-500 dark:text-gray-500 space-y-1 text-left">
                {[0, 1, 2].map((index) => (
                  <li key={index}>• {t(`guide.structure.points.${index}`)}</li>
                ))}
              </ul>
            </div>
            
            <div className="text-center">
              <div className="bg-red-100 dark:bg-red-900 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('guide.security.title')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{t('guide.security.description')}</p>
              <ul className="text-sm text-gray-500 dark:text-gray-500 space-y-1 text-left">
                {[0, 1, 2].map((index) => (
                  <li key={index}>• {t(`guide.security.points.${index}`)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JwtDecoder